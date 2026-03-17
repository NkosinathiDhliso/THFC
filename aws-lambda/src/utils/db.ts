import { Pool, PoolClient, QueryResult } from 'pg';
import { getParameter, getSecret } from './config';

let pool: Pool | null = null;

/**
 * Get a PostgreSQL connection pool for Lightsail Managed DB.
 * Credentials are pulled from Parameter Store / Secrets Manager.
 */
async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const [host, port, database] = await Promise.all([
    getParameter('db/host'),
    getParameter('db/port'),
    getParameter('db/name'),
  ]);
  const password = await getSecret('db/password');
  const user = await getParameter('db/user');

  pool = new Pool({
    host,
    port: parseInt(port, 10),
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false }, // Lightsail managed DB uses self-signed certs
    max: 3,        // Lambda concurrency is low; keep pool small
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

/**
 * Run a parameterised SQL query and return the result rows.
 *
 * Usage:
 *   const rows = await query<Store>('SELECT * FROM stores WHERE id = $1', [storeId]);
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const p = await getPool();
  const result: QueryResult<T> = await p.query(text, params);
  return result.rows;
}

/**
 * Run a parameterised SQL query and return a single row (or null).
 */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Get a client from the pool for transactions.
 *
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     // ... multiple queries ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
export async function getClient(): Promise<PoolClient> {
  const p = await getPool();
  return p.connect();
}

/**
 * Gracefully shut down the pool (useful for testing or warm-shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
