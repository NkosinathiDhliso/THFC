import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';
import { sendEmail, emailTemplates } from '../utils/email';
import { v4 as uuidv4 } from 'uuid';

/**
 * Password reset email Lambda function
 * Handles password reset email requests
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing password reset email request:', {
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
    const redirectUrl = requestBody.redirect_url || 'https://thfcscan.com/reset-password';

    // Initialize Supabase service
    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    // Check if user exists
    const { data: user, error: userError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, is_active')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration attacks
    // But only send email if user actually exists
    if (!userError && user && user.is_active) {
      try {
        // Generate password reset token
        const resetToken = uuidv4();
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1); // 1 hour expiry

        // Store reset token in database
        const { error: tokenError } = await adminClient
          .from('password_reset_tokens')
          .insert({
            user_id: user.id,
            token: resetToken,
            expires_at: expiryDate.toISOString(),
            is_used: false,
            created_at: new Date().toISOString()
          });

        if (tokenError) {
          console.error('Failed to store reset token:', tokenError);
          // Continue anyway - we'll use Supabase's built-in reset if our token fails
        }

        // Create reset link
        const resetLink = `${redirectUrl}?token=${resetToken}&email=${encodeURIComponent(email)}`;

        // Generate email template
        const emailTemplate = emailTemplates.passwordReset({
          userEmail: email,
          resetToken: resetToken,
          resetUrl: resetLink
        });

        // Send password reset email
        await sendEmail({
          to: email,
          from: 'info@thfcscan.co.za',
          subject: emailTemplate.subject,
          htmlBody: emailTemplate.htmlBody,
          textBody: emailTemplate.textBody
        });

        console.log('Password reset email sent successfully to:', email);

        // Also trigger Supabase's built-in password reset as backup
        try {
          const { error: supabaseResetError } = await adminClient.auth.resetPasswordForEmail(
            email,
            {
              redirectTo: redirectUrl
            }
          );

          if (supabaseResetError) {
            console.warn('Supabase password reset failed:', supabaseResetError);
          } else {
            console.log('Supabase password reset email also sent');
          }
        } catch (supabaseError) {
          console.warn('Supabase password reset error:', supabaseError);
          // Don't fail the request if Supabase reset fails
        }

      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to send password reset email',
            message: 'Please try again later'
          })
        };
      }
    } else {
      console.log('Password reset requested for non-existent or inactive user:', email);
      // Don't reveal that the user doesn't exist
    }

    // Always return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      })
    };

  } catch (error) {
    console.error('Error in password reset process:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process password reset request',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Verify password reset token
 */
export const verifyResetToken = async (
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

    const { token, email } = JSON.parse(event.body);
    
    if (!token || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and email are required' })
      };
    }

    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    // Get reset token with user information
    const { data: resetData, error } = await adminClient
      .from('password_reset_tokens')
      .select(`
        *,
        profiles!inner(id, email, full_name, is_active)
      `)
      .eq('token', token)
      .eq('is_used', false)
      .eq('profiles.email', email.toLowerCase().trim())
      .single();

    if (error || !resetData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Invalid or expired reset token'
        })
      };
    }

    // Check if token has expired
    const now = new Date();
    const expiryDate = new Date(resetData.expires_at);
    
    if (now > expiryDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Reset token has expired'
        })
      };
    }

    // Check if user is still active
    if (!resetData.profiles.is_active) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'User account is not active'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        user: {
          id: resetData.profiles.id,
          email: resetData.profiles.email,
          full_name: resetData.profiles.full_name
        },
        expires_at: resetData.expires_at
      })
    };

  } catch (error) {
    console.error('Error verifying reset token:', error);
    
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
 * Complete password reset
 */
export const completePasswordReset = async (
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

    const { token, email, new_password } = JSON.parse(event.body);
    
    if (!token || !email || !new_password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token, email, and new password are required' })
      };
    }

    // Validate password strength
    if (new_password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters long' })
      };
    }

    const supabaseService = await getSupabaseService();
    const adminClient = supabaseService.admin;

    // Verify token first
    const { data: resetData, error: tokenError } = await adminClient
      .from('password_reset_tokens')
      .select(`
        *,
        profiles!inner(id, email, is_active)
      `)
      .eq('token', token)
      .eq('is_used', false)
      .eq('profiles.email', email.toLowerCase().trim())
      .single();

    if (tokenError || !resetData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired reset token' })
      };
    }

    // Check expiry
    const now = new Date();
    if (now > new Date(resetData.expires_at)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Reset token has expired' })
      };
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      resetData.profiles.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update password' })
      };
    }

    // Mark token as used
    await adminClient
      .from('password_reset_tokens')
      .update({ 
        is_used: true, 
        used_at: now.toISOString() 
      })
      .eq('token', token);

    console.log('Password reset completed successfully for:', email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password has been reset successfully'
      })
    };

  } catch (error) {
    console.error('Error completing password reset:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to complete password reset',
        requestId: context.awsRequestId
      })
    };
  }
};