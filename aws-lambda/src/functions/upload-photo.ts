import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getAppConfig } from '../utils/config';

/**
 * Upload photo to S3 Lambda function
 * Handles photo uploads for donation documentation
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Processing photo upload request:', {
    requestId: context.awsRequestId,
    contentType: event.headers['content-type'],
    hasBody: !!event.body
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

    // Parse request body (expecting base64 encoded data)
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const requestBody = JSON.parse(event.body);
    const { photoData, userId, filename } = requestBody;

    if (!photoData || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'photoData and userId are required' })
      };
    }

    // Get configuration
    const config = await getAppConfig();
    const bucketName = config.aws.s3.photoBucket || 'thfcscan-storage-prod';

    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Generate retail-friendly filename if not provided
    const finalFilename = filename || generateRetailFilename(userId);

    // Convert base64 to buffer (remove data:image/jpeg;base64, prefix if present)
    const base64Data = photoData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: `donations/${finalFilename}`,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=31536000', // 1 year cache
      Metadata: {
        'uploaded-by': userId,
        'upload-time': new Date().toISOString(),
        'source': 'thfcscan-app'
      }
    });

    await s3Client.send(uploadCommand);

    // Generate public URL
    const publicUrl = `https://${bucketName}.s3.amazonaws.com/donations/${finalFilename}`;

    console.log('Photo uploaded successfully:', {
      filename: finalFilename,
      size: imageBuffer.length,
      url: publicUrl
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: publicUrl,
        filename: finalFilename
      })
    };

  } catch (error) {
    console.error('Error uploading photo:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
};

/**
 * Generate retail-friendly filename for donation photos
 */
function generateRetailFilename(userId: string): string {
  const timestamp = new Date();
  const dateString = timestamp.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  const timeString = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, ''); // HHMMSS
  const randomId = Math.random().toString(36).substring(2, 8);
  
  // Format: DONATION_YYYYMMDD_HHMMSS_RandomID_UserID.jpg
  return `DONATION_${dateString}_${timeString}_${randomId}_${userId.slice(0, 8)}.jpg`;
}
