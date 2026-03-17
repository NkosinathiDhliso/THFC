import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';
import { sendEmail, emailTemplates } from '../utils/email';

/**
 * Process donation Lambda function
 * Handles individual donation submissions with photo proof and email notifications
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing donation request:', {
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
    const requiredFields = ['store_id', 'donor_name', 'donor_email', 'amount'];
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestBody.donor_email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Validate amount
    const amount = parseFloat(requestBody.amount);
    if (isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid donation amount' })
      };
    }

    // Initialize Supabase service
    const supabaseService = await getSupabaseService();

    // Verify store exists and is active
    const stores = await supabaseService.getActiveStores();
    const store = stores.find(s => s.id === parseInt(requestBody.store_id));
    
    if (!store) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or inactive store' })
      };
    }

    // Create donation record
    const donationData = {
      store_id: parseInt(requestBody.store_id),
      donor_name: requestBody.donor_name.trim(),
      donor_email: requestBody.donor_email.toLowerCase().trim(),
      donor_phone: requestBody.donor_phone?.trim() || null,
      amount: amount,
      photo_url: requestBody.photo_url || null,
      notes: requestBody.notes?.trim() || null,
      status: 'approved' as const, // Auto-approve for now
      processed_by: requestBody.processed_by || 'system'
    };

    const donation = await supabaseService.createDonation(donationData);

    console.log('Donation created successfully:', {
      donationId: donation.id,
      amount: donation.amount,
      store: store.name
    });

    // Send confirmation email to donor
    try {
      const emailTemplate = emailTemplates.donationConfirmation({
        donorName: donation.donor_name,
        amount: donation.amount,
        storeName: store.name,
        donationId: donation.id
      });

      await sendEmail({
        to: donation.donor_email,
        from: 'info@thfcscan.co.za', // Configure this in your SES
        subject: emailTemplate.subject,
        htmlBody: emailTemplate.htmlBody,
        textBody: emailTemplate.textBody
      });

      console.log('Confirmation email sent to:', donation.donor_email);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the entire request if email fails
    }

    // Return success response
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        donation: {
          id: donation.id,
          amount: donation.amount,
          store_name: store.name,
          donor_name: donation.donor_name,
          created_at: donation.created_at,
          status: donation.status
        },
        message: 'Donation processed successfully'
      })
    };

  } catch (error) {
    console.error('Error processing donation:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process donation',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Health check function for testing
 */
export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'healthy',
      function: 'process-donation',
      timestamp: new Date().toISOString()
    })
  };
};