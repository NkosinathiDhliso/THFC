import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../../functions/process-donation';
import * as supabaseUtils from '../../utils/supabase';
import * as emailUtils from '../../utils/email';

// Mock the utility modules
jest.mock('../../utils/supabase');
jest.mock('../../utils/email');
jest.mock('../../utils/config');

const mockSupabaseUtils = supabaseUtils as jest.Mocked<typeof supabaseUtils>;
const mockEmailUtils = emailUtils as jest.Mocked<typeof emailUtils>;

describe('process-donation Lambda function', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;
  let mockSupabaseService: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock context
    mockContext = {
      awsRequestId: 'test-request-id',
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
      memoryLimitInMB: '128',
      remainingTimeInMillis: () => 30000,
      logGroupName: '/aws/lambda/test',
      logStreamName: 'test-stream',
      callbackWaitsForEmptyEventLoop: false,
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn()
    };

    // Mock Supabase service
    mockSupabaseService = {
      client: {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ 
                data: { id: 'store-123', name: 'Test Store', is_active: true }, 
                error: null 
              }))
            }))
          })),
          insert: jest.fn(() => Promise.resolve({ 
            data: [{ id: 'donation-123', amount: 100 }], 
            error: null 
          }))
        }))
      }
    };

    mockSupabaseUtils.getSupabaseService.mockResolvedValue(mockSupabaseService);
    mockEmailUtils.sendEmail.mockResolvedValue(undefined);
    mockEmailUtils.emailTemplates = {
      donationConfirmation: jest.fn(() => ({
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test Text'
      }))
    };
  });

  describe('OPTIONS requests', () => {
    it('should handle preflight requests', async () => {
      mockEvent = {
        httpMethod: 'OPTIONS',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/donations',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(result.body).toBe('');
    });
  });

  describe('POST requests', () => {
    beforeEach(() => {
      mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          donor_name: 'John Doe',
          donor_email: 'john@example.com',
          donor_phone: '+1234567890',
          amount: 100,
          store_id: 'store-123',
          photo_url: 'https://example.com/photo.jpg',
          notes: 'Test donation'
        }),
        headers: { 'Content-Type': 'application/json' },
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/donations',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };
    });

    it('should process valid donation successfully', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toMatchObject({
        success: true,
        message: 'Donation processed successfully'
      });

      // Verify Supabase calls
      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('stores');
      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('donations');

      // Verify email was sent
      expect(mockEmailUtils.sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        from: 'noreply@thfcscan.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test Text'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockEvent.body = JSON.stringify({
        donor_name: 'John Doe'
        // Missing required fields
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error');
    });

    it('should return 400 for invalid email format', async () => {
      mockEvent.body = JSON.stringify({
        donor_name: 'John Doe',
        donor_email: 'invalid-email',
        amount: 100,
        store_id: 'store-123'
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Invalid email format'
      });
    });

    it('should return 400 for invalid amount', async () => {
      mockEvent.body = JSON.stringify({
        donor_name: 'John Doe',
        donor_email: 'john@example.com',
        amount: -10, // Invalid negative amount
        store_id: 'store-123'
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Amount must be greater than 0'
      });
    });

    it('should return 404 for non-existent store', async () => {
      // Mock store not found
      mockSupabaseService.client.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Store not found' } 
            }))
          }))
        }))
      }));

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Store not found'
      });
    });

    it('should return 400 for inactive store', async () => {
      // Mock inactive store
      mockSupabaseService.client.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'store-123', name: 'Test Store', is_active: false }, 
              error: null 
            }))
          }))
        }))
      }));

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Store is not currently accepting donations'
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabaseService.client.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database connection failed' } 
            }))
          }))
        }))
      }));

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toHaveProperty('error');
      expect(JSON.parse(result.body)).toHaveProperty('requestId', 'test-request-id');
    });

    it('should handle email sending failures gracefully', async () => {
      // Mock email sending failure
      mockEmailUtils.sendEmail.mockRejectedValue(new Error('Email service unavailable'));

      const result = await handler(mockEvent, mockContext);

      // Should still succeed even if email fails
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toMatchObject({
        success: true,
        message: 'Donation processed successfully',
        email_warning: 'Confirmation email could not be sent'
      });
    });
  });

  describe('Invalid HTTP methods', () => {
    it('should return 405 for GET requests', async () => {
      mockEvent = {
        httpMethod: 'GET',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/donations',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Method not allowed'
      });
    });
  });

  describe('Request body validation', () => {
    it('should return 400 for missing request body', async () => {
      mockEvent = {
        httpMethod: 'POST',
        body: null, // No body
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/donations',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Request body is required'
      });
    });

    it('should return 400 for invalid JSON', async () => {
      mockEvent = {
        httpMethod: 'POST',
        body: 'invalid json{', // Invalid JSON
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/donations',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toHaveProperty('error');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in all responses', async () => {
      mockEvent = {
        httpMethod: 'OPTIONS',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/donations',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(mockEvent, mockContext);

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });
  });
});