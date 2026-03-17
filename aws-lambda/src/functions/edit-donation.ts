import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getSupabaseService } from '../utils/supabase';
import { sendEmail, emailTemplates } from '../utils/email';

/**
 * Edit donation Lambda function
 * Handles updating existing donation records
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing donation edit request:', {
    requestId: context.awsRequestId,
    body: event.body ? JSON.parse(event.body) : null,
    pathParameters: event.pathParameters
  });

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'PUT,OPTIONS,GET',
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
    if (event.httpMethod !== 'PUT') {
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
    
    // Get donation ID from path parameters or body
    const donationId = event.pathParameters?.id || requestBody.donation_id;
    
    if (!donationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Donation ID is required' })
      };
    }

    // Initialize Supabase service
    const supabaseService = await getSupabaseService();

    // Prepare update data
    const updateData: any = {};
    
    // Validate and prepare fields for update
    if (requestBody.donor_name !== undefined) {
      if (typeof requestBody.donor_name !== 'string' || requestBody.donor_name.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid donor name' })
        };
      }
      updateData.donor_name = requestBody.donor_name.trim();
    }

    if (requestBody.donor_email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(requestBody.donor_email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email format' })
        };
      }
      updateData.donor_email = requestBody.donor_email.toLowerCase().trim();
    }

    if (requestBody.donor_phone !== undefined) {
      updateData.donor_phone = requestBody.donor_phone?.trim() || null;
    }

    if (requestBody.amount !== undefined) {
      const amount = parseFloat(requestBody.amount);
      if (isNaN(amount) || amount <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid donation amount' })
        };
      }
      updateData.amount = amount;
    }

    if (requestBody.store_id !== undefined) {
      const storeId = parseInt(requestBody.store_id);
      if (isNaN(storeId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid store ID' })
        };
      }
      
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
      
      updateData.store_id = storeId;
    }

    if (requestBody.photo_url !== undefined) {
      updateData.photo_url = requestBody.photo_url || null;
    }

    if (requestBody.notes !== undefined) {
      updateData.notes = requestBody.notes?.trim() || null;
    }

    if (requestBody.status !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(requestBody.status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid status', 
            validStatuses 
          })
        };
      }
      updateData.status = requestBody.status;
    }

    if (requestBody.processed_by !== undefined) {
      updateData.processed_by = requestBody.processed_by?.trim() || null;
    }

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid fields provided for update' })
      };
    }

    // Update the donation
    const updatedDonation = await supabaseService.updateDonation(donationId, updateData);

    console.log('Donation updated successfully:', {
      donationId: updatedDonation.id,
      updatedFields: Object.keys(updateData),
      newAmount: updatedDonation.amount
    });

    // Send notification email if status changed to approved
    if (updateData.status === 'approved' && requestBody.send_notification !== false) {
      try {
        // Get store information
        const stores = await supabaseService.getActiveStores();
        const store = stores.find(s => s.id === updatedDonation.store_id);
        
        if (store) {
          const emailTemplate = emailTemplates.donationConfirmation({
            donorName: updatedDonation.donor_name,
            amount: updatedDonation.amount,
            storeName: store.name,
            donationId: updatedDonation.id
          });

          await sendEmail({
            to: updatedDonation.donor_email,
            from: 'info@thfcscan.co.za',
            subject: emailTemplate.subject,
            htmlBody: emailTemplate.htmlBody,
            textBody: emailTemplate.textBody
          });

          console.log('Approval notification email sent to:', updatedDonation.donor_email);
        }
      } catch (emailError) {
        console.error('Failed to send approval notification email:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        donation: {
          id: updatedDonation.id,
          store_id: updatedDonation.store_id,
          donor_name: updatedDonation.donor_name,
          donor_email: updatedDonation.donor_email,
          donor_phone: updatedDonation.donor_phone,
          amount: updatedDonation.amount,
          photo_url: updatedDonation.photo_url,
          notes: updatedDonation.notes,
          status: updatedDonation.status,
          processed_by: updatedDonation.processed_by,
          created_at: updatedDonation.created_at,
          updated_at: updatedDonation.updated_at
        },
        updatedFields: Object.keys(updateData),
        message: 'Donation updated successfully'
      })
    };

  } catch (error) {
    console.error('Error updating donation:', error);
    
    // Handle specific error types
    if (error instanceof Error && error.message.includes('not found')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Donation not found',
          message: 'The specified donation does not exist'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to update donation',
        requestId: context.awsRequestId
      })
    };
  }
};

/**
 * Get donation by ID function
 */
export const getDonation = async (
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
    const donationId = event.pathParameters?.id;
    
    if (!donationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Donation ID is required' })
      };
    }

    const supabaseService = await getSupabaseService();
    
    // Get donation with store information
    const donations = await supabaseService.getDonationsForDateRange(
      '1900-01-01T00:00:00.000Z',
      '2100-12-31T23:59:59.999Z'
    );
    
    const donation = donations.find(d => d.id === donationId);
    
    if (!donation) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Donation not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        donation
      })
    };

  } catch (error) {
    console.error('Error fetching donation:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch donation',
        requestId: context.awsRequestId
      })
    };
  }
};