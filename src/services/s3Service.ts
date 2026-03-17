import { getAppConfig } from '../utils/config';

interface S3UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a photo to AWS S3 through our Lambda API
 * This uses the process-donation Lambda endpoint which handles S3 uploads
 */
export const uploadPhotoToS3 = async (
  photoDataUrl: string, 
  userId: string
): Promise<string> => {
  console.log('📤 Starting S3 photo upload...');
  console.log('⏱️ S3 upload start time:', new Date().toISOString());

  try {
    // Generate filename with retail-friendly naming
    const timestamp = new Date();
    const dateString = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // HH-MM-SS
    const randomId = Math.random().toString(36).substring(2, 8);
    
    // Retail-friendly filename format: DONATION_YYYYMMDD_HHMMSS_StoreCode_CollectorID
    const filename = `DONATION_${dateString.replace(/-/g, '')}_${timeString.replace(/-/g, '')}_${randomId}_${userId.slice(0, 8)}.jpg`;
    
    console.log('📸 Generated filename:', filename);

    // Get AWS API endpoint from config
    const config = getAppConfig();
    const apiEndpoint = config.awsApiUrl || import.meta.env.VITE_AWS_API_URL;
    
    if (!apiEndpoint) {
      throw new Error('AWS API endpoint not configured. Please set VITE_AWS_API_URL environment variable.');
    }

    // Upload to S3 via Lambda
    const uploadResponse = await fetch(`${apiEndpoint}/upload-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': import.meta.env.VITE_AWS_API_KEY || ''
      },
      body: JSON.stringify({
        photoData: photoDataUrl,
        userId: userId,
        filename: filename
      })
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const result: S3UploadResponse = await uploadResponse.json();
    
    if (!result.success || !result.url) {
      throw new Error(`S3 upload failed: ${result.error || 'Unknown error'}`);
    }

    console.log('✅ Photo uploaded to S3 successfully:', result.url);
    console.log('⏱️ S3 upload end time:', new Date().toISOString());
    
    return result.url;

  } catch (error) {
    console.error('💥 Error uploading photo to S3:', error);
    console.log('⏱️ S3 upload error time:', new Date().toISOString());
    
    // Fallback to data URL if S3 upload fails
    console.warn('⚠️ Falling back to data URL storage');
    return photoDataUrl;
  }
};

/**
 * Helper function to get app configuration
 * This bridges to the AWS Lambda config if available
 */
const getAppConfigLocal = () => {
  return {
    awsApiUrl: import.meta.env.VITE_AWS_API_URL,
    awsApiKey: import.meta.env.VITE_AWS_API_KEY,
    s3BucketName: import.meta.env.VITE_S3_BUCKET_NAME || 'thfcscan-storage-prod'
  };
};

/**
 * Generate a presigned URL for direct S3 uploads (alternative approach)
 * This would require additional Lambda function to generate presigned URLs
 */
export const getPresignedUploadUrl = async (filename: string): Promise<string> => {
  const config = getAppConfigLocal();
  
  const response = await fetch(`${config.awsApiUrl}/get-upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.awsApiKey || ''
    },
    body: JSON.stringify({ filename })
  });

  if (!response.ok) {
    throw new Error('Failed to get presigned URL');
  }

  const { uploadUrl } = await response.json();
  return uploadUrl;
};

export default {
  uploadPhotoToS3,
  getPresignedUploadUrl
};
