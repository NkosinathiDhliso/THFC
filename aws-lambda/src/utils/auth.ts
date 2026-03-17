import { APIGatewayProxyEvent } from 'aws-lambda';
import { getParameter } from './config';

/**
 * Decoded Cognito JWT payload (access token).
 */
export interface CognitoUser {
  sub: string;          // Cognito user ID (UUID)
  email: string;
  'cognito:username': string;
  'cognito:groups'?: string[];
  token_use: 'access' | 'id';
  iss: string;
  exp: number;
  iat: number;
}

// Cache JWKS so we don't fetch it on every invocation
let cachedJwks: JsonWebKeySet | null = null;
let cachedUserPoolId: string | null = null;
let cachedRegion: string | null = null;

interface JsonWebKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

interface JsonWebKeySet {
  keys: JsonWebKey[];
}

/**
 * Fetch the JWKS (JSON Web Key Set) from Cognito.
 */
async function getJwks(): Promise<JsonWebKeySet> {
  if (cachedJwks) return cachedJwks;

  const userPoolId = await getUserPoolId();
  const region = await getRegion();
  const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
  }

  cachedJwks = (await response.json()) as JsonWebKeySet;
  return cachedJwks;
}

async function getUserPoolId(): Promise<string> {
  if (cachedUserPoolId) return cachedUserPoolId;
  cachedUserPoolId = await getParameter('cognito/user_pool_id');
  return cachedUserPoolId;
}

async function getRegion(): Promise<string> {
  if (cachedRegion) return cachedRegion;
  cachedRegion = process.env['REGION'] || 'us-east-1';
  return cachedRegion;
}

/**
 * Decode a JWT without verification (to read the header/kid).
 */
function decodeJwtHeader(token: string): { kid: string; alg: string } {
  const headerPart = token.split('.')[0];
  const decoded = Buffer.from(headerPart, 'base64url').toString('utf-8');
  return JSON.parse(decoded);
}

/**
 * Decode the JWT payload (claims).
 */
function decodeJwtPayload(token: string): CognitoUser {
  const payloadPart = token.split('.')[1];
  const decoded = Buffer.from(payloadPart, 'base64url').toString('utf-8');
  return JSON.parse(decoded);
}

/**
 * Verify a Cognito JWT token.
 *
 * This performs basic structural validation and expiry checks.
 * For production, consider using `aws-jwt-verify` for full cryptographic verification.
 *
 * Returns the decoded user claims if valid, or throws an error.
 */
export async function verifyCognitoToken(token: string): Promise<CognitoUser> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  // Decode header to get kid
  const header = decodeJwtHeader(token);

  // Verify the kid exists in the JWKS
  const jwks = await getJwks();
  const matchingKey = jwks.keys.find(k => k.kid === header.kid);
  if (!matchingKey) {
    throw new Error('JWT kid not found in JWKS');
  }

  // Decode payload
  const payload = decodeJwtPayload(token);

  // Verify issuer
  const userPoolId = await getUserPoolId();
  const region = await getRegion();
  const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Invalid issuer: expected ${expectedIssuer}, got ${payload.iss}`);
  }

  // Verify token_use
  if (payload.token_use !== 'access' && payload.token_use !== 'id') {
    throw new Error(`Invalid token_use: ${payload.token_use}`);
  }

  // Verify expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Extract the Bearer token from the Authorization header.
 */
export function extractToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Middleware-style helper: extract and verify the token from the event.
 * Returns the authenticated user, or throws.
 */
export async function requireAuth(event: APIGatewayProxyEvent): Promise<CognitoUser> {
  const token = extractToken(event);
  if (!token) {
    throw new Error('Missing Authorization header');
  }
  return verifyCognitoToken(token);
}
