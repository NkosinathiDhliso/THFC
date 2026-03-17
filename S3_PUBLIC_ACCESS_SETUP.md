# S3 Bucket Public Access Configuration

## Current Status
✅ **CORS Configuration**: Successfully applied via AWS CLI  
❌ **Public Policy**: Blocked by AWS "Block Public Access" settings

## Issue
Photos uploaded to S3 cannot be viewed in the confirmation screen due to public access restrictions. The automatic setup failed because AWS has "Block Public Access" enabled on the bucket.

## Solution Options

### Option 1: AWS Console (Recommended)
1. Go to AWS S3 Console: https://s3.console.aws.amazon.com/
2. Find bucket: `thfcscan-photo-archives-dev`
3. Go to **Permissions** tab
4. Click **Block public access** → **Edit** → Uncheck "Block all public access" → Save
5. Click **Bucket policy** → **Edit** → Add this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::thfcscan-photo-archives-dev/donations/*"
    }
  ]
}
```

6. Click **Cross-origin resource sharing (CORS)** → **Edit** → Add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Option 2: AWS CLI
```bash
# Set bucket policy
aws s3api put-bucket-policy --bucket thfcscan-photo-archives-dev --policy file://bucket-policy.json

# Set CORS configuration  
aws s3api put-bucket-cors --bucket thfcscan-photo-archives-dev --cors-configuration file://cors-config.json
```

## Current Workaround
The app now shows placeholder icons when S3 images can't be loaded, so the system works fine even without public access configured.

## Security Note
For production, replace `"AllowedOrigins": ["*"]` with your specific domain: `["https://yourdomain.com"]`
