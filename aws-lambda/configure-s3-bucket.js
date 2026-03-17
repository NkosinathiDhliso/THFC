const { S3Client, PutBucketCorsCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: 'us-east-1' });
const bucketName = 'thfcscan-photo-archives-dev';

async function configureBucket() {
  try {
    // Configure CORS
    const corsParams = {
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST'],
            AllowedOrigins: ['*'], // In production, specify your domain
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    };

    await s3Client.send(new PutBucketCorsCommand(corsParams));
    console.log('✅ CORS configuration applied successfully');

    // Configure bucket policy for public read access to images
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/donations/*`
        }
      ]
    };

    const policyParams = {
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy)
    };

    await s3Client.send(new PutBucketPolicyCommand(policyParams));
    console.log('✅ Bucket policy applied successfully');
    console.log('🎉 S3 bucket configured for public photo access');

  } catch (error) {
    console.error('❌ Error configuring S3 bucket:', error);
  }
}

configureBucket();
