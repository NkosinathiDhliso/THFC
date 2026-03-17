import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';
import { sendEmail } from '../utils/email';

/**
 * Refresh all shortcodes Lambda function
 * Deactivates expired shortcodes and optionally generates new ones
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing shortcode refresh request:', {
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

    // Parse request body (optional parameters)
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const {
      generate_new = false,
      expiry_hours = 24,
      store_ids = null,
      notify_admins = true
    } = requestBody;

    // Initialize Supabase service
    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    const now = new Date();
    const results = {
      expired_count: 0,
      deactivated_count: 0,
      generated_count: 0,
      errors: [] as string[]
    };

    // Step 1: Find and deactivate expired shortcodes
    console.log('Finding expired shortcodes...');
    
    const { data: expiredShortcodes, error: expiredError } = await adminClient
      .from('shortcodes')
      .select(`
        *,
        stores!inner(name, location)
      `)
      .eq('is_active', true)
      .lt('expires_at', now.toISOString());

    if (expiredError) {
      console.error('Error fetching expired shortcodes:', expiredError);
      results.errors.push(`Failed to fetch expired shortcodes: ${expiredError.message}`);
    } else {
      results.expired_count = expiredShortcodes?.length || 0;
      
      if (expiredShortcodes && expiredShortcodes.length > 0) {
        console.log(`Found ${expiredShortcodes.length} expired shortcodes`);
        
        // Deactivate expired shortcodes
        const { error: deactivateError } = await adminClient
          .from('shortcodes')
          .update({ 
            is_active: false,
            deactivated_at: now.toISOString(),
            deactivated_reason: 'expired'
          })
          .eq('is_active', true)
          .lt('expires_at', now.toISOString());

        if (deactivateError) {
          console.error('Error deactivating expired shortcodes:', deactivateError);
          results.errors.push(`Failed to deactivate expired shortcodes: ${deactivateError.message}`);
        } else {
          results.deactivated_count = expiredShortcodes.length;
          console.log(`Deactivated ${expiredShortcodes.length} expired shortcodes`);
        }
      }
    }

    // Step 2: Generate new shortcodes if requested
    if (generate_new) {
      console.log('Generating new shortcodes...');
      
      // Get active stores (filter by store_ids if provided)
      const stores = await supabaseService.getActiveStores();
      const targetStores = store_ids 
        ? stores.filter(store => store_ids.includes(store.id))
        : stores;

      if (targetStores.length === 0) {
        results.errors.push('No active stores found for shortcode generation');
      } else {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + expiry_hours);

        for (const store of targetStores) {
          try {
            const shortcode = generateShortcode();
            
            const { error: insertError } = await adminClient
              .from('shortcodes')
              .insert({
                code: shortcode,
                store_id: store.id,
                expires_at: expiryDate.toISOString(),
                created_by: 'system_refresh',
                is_active: true,
                usage_count: 0
              });

            if (insertError) {
              console.error(`Error creating shortcode for store ${store.id}:`, insertError);
              results.errors.push(`Failed to create shortcode for ${store.name}: ${insertError.message}`);
            } else {
              results.generated_count++;
              console.log(`Generated shortcode ${shortcode} for store ${store.name}`);
            }
          } catch (storeError) {
            console.error(`Error processing store ${store.id}:`, storeError);
            results.errors.push(`Error processing store ${store.name}: ${storeError instanceof Error ? storeError.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Step 3: Clean up old inactive shortcodes (older than 30 days)
    console.log('Cleaning up old inactive shortcodes...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error: cleanupError } = await adminClient
      .from('shortcodes')
      .delete()
      .eq('is_active', false)
      .lt('deactivated_at', thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.error('Error cleaning up old shortcodes:', cleanupError);
      results.errors.push(`Failed to cleanup old shortcodes: ${cleanupError.message}`);
    } else {
      console.log('Old inactive shortcodes cleaned up successfully');
    }

    // Step 4: Send notification email to admins if requested
    if (notify_admins && (results.expired_count > 0 || results.generated_count > 0 || results.errors.length > 0)) {
      try {
        const emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Shortcode Refresh Report</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .summary { background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .error { background-color: #ffebee; border-left: 4px solid #f44336; padding: 10px; margin: 10px 0; }
              .success { background-color: #e8f5e8; border-left: 4px solid #4caf50; padding: 10px; margin: 10px 0; }
              .stat { display: inline-block; margin: 10px 20px 10px 0; }
              .stat-number { font-size: 24px; font-weight: bold; color: #2196F3; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Shortcode Refresh Report</h1>
                <p>${now.toLocaleString()}</p>
              </div>
              <div class="content">
                <div class="summary">
                  <h2>Summary</h2>
                  <div class="stat">
                    <div class="stat-number">${results.expired_count}</div>
                    <div>Expired Found</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">${results.deactivated_count}</div>
                    <div>Deactivated</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">${results.generated_count}</div>
                    <div>Generated</div>
                  </div>
                  <div class="stat">
                    <div class="stat-number">${results.errors.length}</div>
                    <div>Errors</div>
                  </div>
                </div>
                
                ${results.errors.length > 0 ? `
                  <h3>Errors</h3>
                  ${results.errors.map(error => `<div class="error">${error}</div>`).join('')}
                ` : ''}
                
                ${results.deactivated_count > 0 || results.generated_count > 0 ? `
                  <div class="success">
                    <strong>Success:</strong> Shortcode refresh completed successfully.
                  </div>
                ` : ''}
                
                <p><strong>Request ID:</strong> ${context.awsRequestId}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: ['support@thehealthfoodcompany.co.za'], // Configure in Parameter Store
        from: 'info@thfcscan.co.za',
          subject: `Shortcode Refresh Report - ${results.expired_count} expired, ${results.generated_count} generated`,
          htmlBody: emailBody
        });

        console.log('Notification email sent to admins');
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        results.errors.push(`Failed to send notification email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
      }
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results,
        message: 'Shortcode refresh completed',
        timestamp: now.toISOString()
      })
    };

  } catch (error) {
    console.error('Error in shortcode refresh:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to refresh shortcodes',
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
 * Get shortcode statistics
 */
export const getShortcodeStats = async (
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
    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;
    const now = new Date();

    // Get various statistics
    const [activeResult, expiredResult, totalResult] = await Promise.all([
      // Active shortcodes
      adminClient
        .from('shortcodes')
        .select('count', { count: 'exact' })
        .eq('is_active', true)
        .gte('expires_at', now.toISOString()),
      
      // Expired but still active shortcodes
      adminClient
        .from('shortcodes')
        .select('count', { count: 'exact' })
        .eq('is_active', true)
        .lt('expires_at', now.toISOString()),
      
      // Total shortcodes
      adminClient
        .from('shortcodes')
        .select('count', { count: 'exact' })
    ]);

    // Get usage statistics
    const { data: usageStats } = await adminClient
      .from('shortcodes')
      .select('usage_count, max_usage, created_at')
      .eq('is_active', true);

    const totalUsage = usageStats?.reduce((sum, sc) => sum + (sc.usage_count || 0), 0) || 0;
    const avgUsage = usageStats?.length ? totalUsage / usageStats.length : 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        statistics: {
          active_shortcodes: activeResult.count || 0,
          expired_shortcodes: expiredResult.count || 0,
          total_shortcodes: totalResult.count || 0,
          total_usage: totalUsage,
          average_usage: Math.round(avgUsage * 100) / 100,
          last_updated: now.toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Error fetching shortcode statistics:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch statistics',
        requestId: context.awsRequestId
      })
    };
  }
};