# THFCScan S3 Configuration

## Required Environment Variables

Add these to your `.env` file:

```bash
# AWS S3 Configuration - DEPLOYED AND READY!
VITE_AWS_API_URL=https://u8e38bd0n0.execute-api.us-east-1.amazonaws.com/dev
VITE_AWS_API_KEY=your-api-key-here
VITE_S3_BUCKET_NAME=thfcscan-storage-dev

# Existing Supabase Configuration (keep these)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## AWS Lambda Environment

Make sure your AWS Lambda functions have these parameters in AWS Systems Manager Parameter Store:

```
/thfcscan/prod/s3-bucket-name = thfcscan-storage-prod
/thfcscan/prod/supabase-url = your-supabase-url
/thfcscan/prod/supabase-anon-key = your-supabase-anon-key
```

## S3 Bucket Configuration

Your S3 bucket should be configured with:
- **Public Read Access** for donation photos
- **CORS Configuration** to allow web uploads
- **Lifecycle Policy** to optimize storage costs

## File Naming Convention

Photos are now stored with retail-friendly names:
```
DONATION_YYYYMMDD_HHMMSS_RandomID_UserID.jpg
```

Example: `DONATION_20250823_140530_a3b7k2_5a2b10b8.jpg`

This format makes it easy for retail managers to:
- Sort by date
- Identify collection time
- Track which team member took the photo

## Email Report Updates

Daily reports now use retail-sector terminology:
- **Subject**: "📊 THF Daily Donation Report - 2025-08-23 | 15 Collections | R450.00 Value"
- **Title**: "THF Daily Collection Report" 
- **Subtitle**: "Retail Food Recovery • Daily Operations Summary"
- **CSV**: "THF_Daily_Collections_YYYYMMDD.csv"
- **Sections**: "Individual Collections", "Team Performance Summary"
