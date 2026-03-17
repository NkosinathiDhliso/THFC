# THFCScan Production Environment Setup

## 📧 **Database Access Information**

**Email:** `thehealthfoodcompany@yahoo.com`
**Project ID:** `tqrlhajnkfcchgzsqpjd`
**Project URL:** `https://tqrlhajnkfcchgzsqpjd.supabase.co`

## Required Environment Variables

Create a `.env.local` file in your project root with these values:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://tqrlhajnkfcchgzsqpjd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_KEY=your-service-key-here

# Azure Functions Configuration
VITE_AZURE_FUNCTION_URL=https://your-function-app.azurewebsites.net
VITE_AZURE_FUNCTION_KEY=your_azure_function_key

# Application Configuration
VITE_APP_URL=https://thfcscan.app
VITE_APP_ENV=production

# Email Configuration (for Azure Functions)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
SES_FROM_EMAIL=noreply@thfcscan.app
THFCSCAN_APP_URL=https://thfcscan.app
```

## Azure Functions Environment Variables

In your Azure Function App, configure these application settings:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
SES_FROM_EMAIL=noreply@thfcscan.app
THFCSCAN_APP_URL=https://thfcscan.app
SUPABASE_URL=https://tqrlhajnkfcchgzsqpjd.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
```

## Security Notes

1. **Never commit .env.local** - It's already in .gitignore
2. **Use strong function keys** - Generate secure Azure Function keys
3. **Configure SES properly** - Verify your domain and set up DKIM
4. **Enable HTTPS only** - Ensure all URLs use HTTPS
5. **Set up proper CORS** - Configure allowed origins for your domain 