import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';
import { getAppConfig } from '../utils/config';

/**
 * Debug environment Lambda function
 * Returns environment variables and configuration for debugging
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const config = await getAppConfig();
    
    // Only return safe, non-sensitive information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      stage: config.stage,
      region: config.region,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      logGroupName: process.env.AWS_LAMBDA_LOG_GROUP_NAME,
      memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
      timeout: context.getRemainingTimeInMillis(),
      requestId: context.awsRequestId,
      // Test Supabase connection (without exposing credentials)
      supabaseConnected: false
    };

    // Test Supabase connection
    try {
      const supabaseService = await getSupabaseService();
      const { error } = await supabaseService.publicClient
        .from('stores')
        .select('count')
        .limit(1);
      
      debugInfo.supabaseConnected = !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: debugInfo
      })
    };
  } catch (error) {
    console.error('Debug env error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};