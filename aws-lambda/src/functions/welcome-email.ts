import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';
import { sendEmail, emailTemplates } from '../utils/email';

/**
 * Welcome email Lambda function
 * Sends welcome emails to new users
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing welcome email request:', {
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
    if (!requestBody.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestBody.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    const email = requestBody.email.toLowerCase().trim();
    const userName = requestBody.user_name || requestBody.full_name || 'New User';
    const userRole = requestBody.user_role || 'user';
    const welcomeType = requestBody.welcome_type || 'registration'; // 'registration' or 'invitation'
    // const loginUrl = requestBody.login_url || 'https://thfcscan.com/login';
    // const supportEmail = requestBody.support_email || 'support@thfcscan.com';

    // Initialize Supabase service
    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    // Verify user exists and get their information
    const { data: user, error: userError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, user_role, is_active, created_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('User not found for welcome email:', email, userError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'User not found',
          message: 'Cannot send welcome email to non-existent user'
        })
      };
    }

    // Check if user is active
    if (!user.is_active) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'User account is not active',
          message: 'Cannot send welcome email to inactive user'
        })
      };
    }

    try {
      // Generate welcome email template
      const emailTemplate = emailTemplates.welcome({
        userName: user.full_name || userName,
        userEmail: email
      });

      // Send welcome email
      await sendEmail({
        to: email,
        from: 'welcome@thfcscan.com',
        subject: emailTemplate.subject,
        htmlBody: emailTemplate.htmlBody,
        textBody: emailTemplate.textBody
      });

      console.log('Welcome email sent successfully to:', email);

      // Log the welcome email in database for tracking
      try {
        await adminClient
          .from('email_logs')
          .insert({
            user_id: user.id,
            email_type: 'welcome',
            recipient_email: email,
            subject: emailTemplate.subject,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              welcome_type: welcomeType,
              user_role: user.user_role || userRole,
              request_id: context.awsRequestId
            }
          });
      } catch (logError) {
        console.warn('Failed to log welcome email:', logError);
        // Don't fail the request if logging fails
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Welcome email sent successfully',
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            user_role: user.user_role
          }
        })
      };

    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      
      // Log the failed email attempt
      try {
        await adminClient
          .from('email_logs')
          .insert({
            user_id: user.id,
            email_type: 'welcome',
            recipient_email: email,
            subject: 'Welcome to THFCScan',
            status: 'failed',
            sent_at: new Date().toISOString(),
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
            metadata: {
              welcome_type: welcomeType,
              user_role: user.user_role || userRole,
              request_id: context.awsRequestId
            }
          });
      } catch (logError) {
        console.warn('Failed to log email failure:', logError);
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to send welcome email',
          message: 'Please try again later or contact support',
          requestId: context.awsRequestId
        })
      };
    }

  } catch (error) {
    console.error('Error in welcome email process:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process welcome email request',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Send bulk welcome emails
 * Useful for sending welcome emails to multiple users at once
 */
export const sendBulkWelcomeEmails = async (
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

    const { user_emails, welcome_type = 'registration' } = JSON.parse(event.body);
    
    if (!user_emails || !Array.isArray(user_emails) || user_emails.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'user_emails array is required and must not be empty' })
      };
    }

    // Limit bulk operations to prevent abuse
    if (user_emails.length > 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Maximum 50 emails allowed per bulk operation' })
      };
    }

    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[],
      total: user_emails.length
    };

    // Process emails in batches to avoid overwhelming the email service
    const batchSize = 10;
    for (let i = 0; i < user_emails.length; i += batchSize) {
      const batch = user_emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email: string) => {
        try {
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
          }

          const normalizedEmail = email.toLowerCase().trim();

          // Get user information
          const { data: user, error: userError } = await adminClient
            .from('profiles')
            .select('id, email, full_name, user_role, is_active')
            .eq('email', normalizedEmail)
            .single();

          if (userError || !user || !user.is_active) {
            throw new Error('User not found or inactive');
          }

          // Generate and send welcome email
          const emailTemplate = emailTemplates.welcome({
            userName: user.full_name || user.email,
            userEmail: user.email
          });

          await sendEmail({
            to: normalizedEmail,
            from: 'welcome@thfcscan.com',
            subject: emailTemplate.subject,
            htmlBody: emailTemplate.htmlBody,
            textBody: emailTemplate.textBody
          });

          // Log success
          await adminClient
            .from('email_logs')
            .insert({
              user_id: user.id,
              email_type: 'welcome_bulk',
              recipient_email: normalizedEmail,
              subject: emailTemplate.subject,
              status: 'sent',
              sent_at: new Date().toISOString(),
              metadata: {
                welcome_type,
                user_role: user.user_role,
                request_id: context.awsRequestId,
                batch_operation: true
              }
            });

          results.successful.push(normalizedEmail);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.failed.push({ email, error: errorMessage });
          console.error(`Failed to send welcome email to ${email}:`, error);
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(batchPromises);
      
      // Add a small delay between batches to be respectful to email service
      if (i + batchSize < user_emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Bulk welcome email operation completed:', {
      total: results.total,
      successful: results.successful.length,
      failed: results.failed.length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Bulk welcome email operation completed`,
        results: {
          total: results.total,
          successful_count: results.successful.length,
          failed_count: results.failed.length,
          successful_emails: results.successful,
          failed_emails: results.failed
        }
      })
    };

  } catch (error) {
    console.error('Error in bulk welcome email process:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process bulk welcome email request',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Resend welcome email for a specific user
 */
export const resendWelcomeEmail = async (
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

    const { user_id, email } = JSON.parse(event.body);
    
    if (!user_id && !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Either user_id or email is required' })
      };
    }

    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    // Get user information
    let query = adminClient
      .from('profiles')
      .select('id, email, full_name, user_role, is_active, created_at');

    if (user_id) {
      query = query.eq('id', user_id);
    } else {
      query = query.eq('email', email.toLowerCase().trim());
    }

    const { data: user, error: userError } = await query.single();

    if (userError || !user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    if (!user.is_active) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User account is not active' })
      };
    }

    // Check if a welcome email was sent recently (within last hour) to prevent spam
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: recentEmails } = await adminClient
      .from('email_logs')
      .select('sent_at')
      .eq('user_id', user.id)
      .eq('email_type', 'welcome')
      .eq('status', 'sent')
      .gte('sent_at', oneHourAgo.toISOString())
      .limit(1);

    if (recentEmails && recentEmails.length > 0) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Welcome email was already sent recently. Please wait before requesting another.'
        })
      };
    }

    // Send welcome email using the main handler logic
    const welcomeEmailEvent = {
      ...event,
      body: JSON.stringify({
        email: user.email,
        user_name: user.full_name,
        user_role: user.user_role,
        welcome_type: 'resend'
      })
    };

    return await handler(welcomeEmailEvent, context);

  } catch (error) {
    console.error('Error in resend welcome email process:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to resend welcome email',
        requestId: context.awsRequestId
      })
    };
  }
};