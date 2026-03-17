import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';

/**
 * Generate expiring shortcode Lambda function
 * Creates temporary access codes for stores or specific operations
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing shortcode generation request:', {
    requestId: context.awsRequestId,
    body: event.body ? JSON.parse(event.body) : null
  });

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Validate request method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const requestBody = JSON.parse(event.body);
    
    // Validate required fields
    const requiredFields = ['store_id', 'expiry_hours'];
    const missingFields = requiredFields.filter(field => !requestBody[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields', 
          missingFields 
        })
      };
    }

    // Validate store_id
    const storeId = parseInt(requestBody.store_id);
    if (isNaN(storeId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid store ID' })
      };
    }

    // Validate expiry_hours
    const expiryHours = parseInt(requestBody.expiry_hours);
    if (isNaN(expiryHours) || expiryHours <= 0 || expiryHours > 168) { // Max 1 week
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid expiry hours (must be between 1 and 168)' 
        })
      };
    }

    // Initialize Supabase service
    const supabaseService = await getSupabaseService();

    // Verify store exists and is active
    const stores = await supabaseService.getActiveStores();
    const store = stores.find(s => s.id === storeId);
    
    if (!store) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or inactive store' })
      };
    }

    // Generate shortcode
    const shortcode = generateShortcode();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);

    // Create shortcode record in database
    const adminClient = supabaseService.admin;
    const { data: shortcodeRecord, error } = await adminClient
      .from('shortcodes')
      .insert({
        code: shortcode,
        store_id: storeId,
        expires_at: expiryDate.toISOString(),
        created_by: requestBody.created_by || 'system',
        is_active: true,
        usage_count: 0,
        max_usage: requestBody.max_usage || null
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create shortcode:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to create shortcode',
          message: error.message
        })
      };
    }

    console.log('Shortcode created successfully:', {
      shortcode,
      storeId,
      storeName: store.name,
      expiryDate: expiryDate.toISOString()
    });

    // Return success response
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        shortcode: {
          code: shortcode,
          store_id: storeId,
          store_name: store.name,
          expires_at: expiryDate.toISOString(),
          is_active: true,
          created_at: shortcodeRecord.created_at
        },
        message: 'Shortcode generated successfully'
      })
    };

  } catch (error) {
    console.error('Error generating shortcode:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to generate shortcode',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Validate shortcode function
 */
export const validateShortcode = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const { code } = JSON.parse(event.body);
    
    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Shortcode is required' })
      };
    }

    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    // Get shortcode with store information
    const { data: shortcodeData, error } = await adminClient
      .from('shortcodes')
      .select(`
        *,
        stores!inner(id, name, location, is_active)
      `)
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !shortcodeData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Invalid shortcode'
        })
      };
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(shortcodeData.expires_at);
    
    if (now > expiryDate) {
      // Mark as inactive
      await adminClient
        .from('shortcodes')
        .update({ is_active: false })
        .eq('code', code);

      return {
        statusCode: 410,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Shortcode has expired'
        })
      };
    }

    // Check usage limit
    if (shortcodeData.max_usage && shortcodeData.usage_count >= shortcodeData.max_usage) {
      return {
        statusCode: 410,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Shortcode usage limit exceeded'
        })
      };
    }

    // Check if store is still active
    if (!shortcodeData.stores.is_active) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Store is no longer active'
        })
      };
    }

    // Increment usage count
    await adminClient
      .from('shortcodes')
      .update({ 
        usage_count: shortcodeData.usage_count + 1,
        last_used_at: now.toISOString()
      })
      .eq('code', code);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        shortcode: {
          code: shortcodeData.code,
          store: {
            id: shortcodeData.stores.id,
            name: shortcodeData.stores.name,
            location: shortcodeData.stores.location
          },
          expires_at: shortcodeData.expires_at,
          usage_count: shortcodeData.usage_count + 1,
          max_usage: shortcodeData.max_usage
        }
      })
    };

  } catch (error) {
    console.error('Error validating shortcode:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        valid: false,
        error: 'Internal server error',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Generate a random shortcode
 */
function generateShortcode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Get active shortcodes for a store
 */
export const getStoreShortcodes = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const storeId = event.pathParameters?.store_id;
    
    if (!storeId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Store ID is required' })
      };
    }

    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    const { data: shortcodes, error } = await adminClient
      .from('shortcodes')
      .select('*')
      .eq('store_id', parseInt(storeId))
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        shortcodes: shortcodes || []
      })
    };

  } catch (error) {
    console.error('Error fetching store shortcodes:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch shortcodes',
        requestId: context.awsRequestId
      })
    };
  }
};