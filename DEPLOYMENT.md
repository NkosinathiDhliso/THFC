# CI/CD Deployment Guide

This project uses GitHub Actions for automated CI/CD deployment to Azure. Every commit to the `main` branch will automatically trigger a deployment to production.

## 🚀 Pipeline Overview

The deployment pipeline consists of four main jobs:

1. **Build & Test** - Installs dependencies, runs tests, and builds both frontend and backend
2. **Deploy Frontend** - Deploys the React app to Azure Static Web Apps
3. **Deploy Functions** - Deploys Azure Functions to Azure Functions App
4. **Database Migrations** - Runs Supabase database migrations
5. **Notify** - Reports deployment status

## 🔧 Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### Go to: Settings → Secrets and variables → Actions → New repository secret

### Frontend Environment Variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_AZURE_FUNCTION_URL` - Your Azure Functions base URL
- `VITE_AZURE_FUNCTION_KEY` - Your Azure Functions access key

### Azure Deployment Secrets:
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Azure Static Web Apps deployment token
- `AZURE_CREDENTIALS` - Azure service principal credentials (JSON format)
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` - Azure Functions publish profile

### Supabase Database:
- `SUPABASE_DB_URL` - Your Supabase database connection URL
- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token

## 📋 Setup Instructions

### 1. Azure Static Web Apps Setup

1. Create an Azure Static Web App in the Azure portal
2. Connect it to your GitHub repository
3. Copy the deployment token from the Azure portal
4. Add it as the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret

### 2. Azure Functions Setup

1. Create an Azure Functions App in the Azure portal
2. Go to "Deployment Center" → "Download Publish Profile"
3. Copy the entire XML content as the `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` secret
4. Update the `AZURE_FUNCTIONAPP_NAME` in the workflow file if needed

### 3. Azure Service Principal Setup

Create a service principal for Azure authentication:

```bash
az ad sp create-for-rbac --name "github-actions-thfcscan" --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} --sdk-auth
```

Copy the entire JSON output as the `AZURE_CREDENTIALS` secret.

### 4. Supabase Setup

1. Get your Supabase project URL and anon key from the Supabase dashboard
2. Get your database connection URL from Supabase settings
3. Generate a Supabase access token from your account settings

## 🔄 How It Works

### Automatic Deployment

- **Push to main** → Full deployment to production
- **Pull requests** → Build and test only (no deployment)

### Build Process

1. **Frontend**: Vite builds the React app with production environment variables
2. **Backend**: TypeScript compilation of Azure Functions
3. **Tests**: Runs all unit tests with Vitest
4. **Linting**: ESLint checks code quality

### Deployment Process

1. **Frontend** → Azure Static Web Apps (CDN-distributed)
2. **Backend** → Azure Functions (serverless)
3. **Database** → Supabase migrations applied

## 🛠️ Local Development

To run the project locally:

```bash
# Install dependencies
npm install
cd azure-functions && npm install && cd ..

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 🚨 Important Notes

- **Environment Variables**: Make sure all secrets are properly configured
- **Branch Protection**: Only commits to `main` trigger production deployment
- **Database Migrations**: Migrations run automatically after successful deployment
- **Rollback**: If deployment fails, the previous version remains live

## 📊 Monitoring

You can monitor deployments in:
- GitHub Actions tab for build/deploy logs
- Azure portal for application status
- Supabase dashboard for database health

## 🔧 Customization

To customize the pipeline:

1. **Change trigger branch**: Modify the `branches` in `.github/workflows/deploy.yml`
2. **Add staging environment**: Create additional jobs with different secrets
3. **Add notifications**: Configure Slack/Teams notifications in the workflow
4. **Modify build steps**: Update the build commands as needed

## 🆘 Troubleshooting

### Common Issues:

1. **Build fails**: Check that all dependencies are listed in package.json
2. **Deployment fails**: Verify Azure credentials and resource names
3. **Database migrations fail**: Check Supabase connection and permissions
4. **Environment variables missing**: Ensure all secrets are configured

### Debugging:

- Check GitHub Actions logs for detailed error messages
- Verify Azure resource names match the workflow configuration
- Test database connections with Supabase CLI locally

## 📚 Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli) 