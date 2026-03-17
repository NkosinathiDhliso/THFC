# Environment Variables Example

Create a `.env.local` file in your project root with these values:

```bash
# THFCScan Environment Variables
# Email: thehealthfoodcompany@yahoo.com
# Project ID: tqrlhajnkfcchgzsqpjd

# Supabase Configuration
VITE_SUPABASE_URL=https://tqrlhajnkfcchgzsqpjd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_KEY=your-service-key-here

# Azure Functions Configuration (if using)
VITE_AZURE_FUNCTION_URL=https://your-function-app.azurewebsites.net
VITE_AZURE_FUNCTION_KEY=your_azure_function_key

# Application Configuration
VITE_APP_URL=https://thfcscan.app
VITE_APP_ENV=development

# Email Configuration (for Azure Functions)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
SES_FROM_EMAIL=noreply@thfcscan.app
THFCSCAN_APP_URL=https://thfcscan.app
```

## Important Notes

1. **Never commit** `.env.local` to version control
2. **Copy the exact values** provided above
3. **Use the email** `thehealthfoodcompany@yahoo.com` to access Supabase
4. **Project ID** is `tqrlhajnkfcchgzsqpjd`
