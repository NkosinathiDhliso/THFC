# AWS Amplify CI/CD Deployment Guide

## Overview
This guide explains how to set up continuous deployment for THFCScan using AWS Amplify.

## Current Setup
- **Production URL**: https://main.d1hgu8owfsmbo5.amplifyapp.com/
- **Repository**: GitHub
- **Framework**: React + Vite
- **Database**: Supabase

## Prerequisites

### 1. AWS Account Setup
- AWS Account with appropriate permissions
- AWS Amplify Console access
- IAM user with Amplify permissions

### 2. Required AWS Services
- AWS Amplify
- AWS IAM (for access keys)
- AWS S3 (for Lambda functions)
- AWS Lambda (for backend functions)

## Configuration Files

### 1. `amplify.yml` - Build Configuration
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "Installing dependencies..."
        - npm ci
    build:
      commands:
        - echo "Building the app..."
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - dist/**/*
```

### 2. Environment Variables
Set these in AWS Amplify Console:

#### Production Environment
```
VITE_APP_ENV=production
VITE_APP_URL=https://main.d1hgu8owfsmbo5.amplifyapp.com
VITE_DEV_SERVER_URL=https://main.d1hgu8owfsmbo5.amplifyapp.com
VITE_SUPABASE_URL=https://tqrlhajnkfcchgzsqpjd.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_SUPABASE_SERVICE_KEY=your-production-service-key
VITE_AWS_API_KEY=your-production-aws-api-key
```

#### Preview Environment
```
VITE_APP_ENV=preview
VITE_APP_URL=https://preview.d1hgu8owfsmbo5.amplifyapp.com
VITE_DEV_SERVER_URL=https://preview.d1hgu8owfsmbo5.amplifyapp.com
VITE_SUPABASE_URL=https://tqrlhajnkfcchgzsqpjd.supabase.co
VITE_SUPABASE_ANON_KEY=your-preview-anon-key
VITE_SUPABASE_SERVICE_KEY=your-preview-service-key
VITE_AWS_API_KEY=your-preview-aws-api-key
```

## GitHub Secrets Setup

Add these secrets to your GitHub repository:

1. **AWS_ACCESS_KEY_ID**: Your AWS access key
2. **AWS_SECRET_ACCESS_KEY**: Your AWS secret key
3. **AMPLIFY_APP_ID**: Your Amplify app ID

## Deployment Process

### 1. Automatic Deployment
- **Main Branch**: Automatically deploys to production
- **Pull Requests**: Creates preview deployments
- **Build Process**: Runs tests, builds, and deploys

### 2. Manual Deployment
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Deploy
amplify publish
```

## Branch Strategy

### Main Branch (`main`)
- **Purpose**: Production deployment
- **URL**: https://main.d1hgu8owfsmbo5.amplifyapp.com/
- **Auto-deploy**: Yes
- **Environment**: Production

### Feature Branches
- **Purpose**: Development and testing
- **URL**: https://[branch-name].d1hgu8owfsmbo5.amplifyapp.com/
- **Auto-deploy**: Yes (preview)
- **Environment**: Preview

## Build Commands

### Pre-build
```bash
npm ci
```

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

## Artifacts
- **Base Directory**: `dist`
- **Files**: All files in dist directory
- **Cache**: `node_modules` and `dist` directories

## Monitoring and Logs

### 1. Build Logs
- Access via AWS Amplify Console
- Real-time build status
- Error reporting

### 2. Application Logs
- CloudWatch integration
- Lambda function logs
- Performance monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `amplify.yml` configuration
   - Verify environment variables
   - Review build logs

2. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify Supabase credentials

3. **Deployment Issues**
   - Check AWS credentials
   - Verify Amplify app ID
   - Review IAM permissions

### Debug Commands
```bash
# Check Amplify status
amplify status

# View build logs
amplify console

# Manual build test
npm run build
```

## Security Considerations

### 1. Environment Variables
- Never commit secrets to repository
- Use AWS Amplify environment variables
- Rotate keys regularly

### 2. AWS Permissions
- Use least privilege principle
- Create dedicated IAM user for Amplify
- Monitor access logs

### 3. Supabase Security
- Use different keys for environments
- Enable RLS policies
- Monitor database access

## Performance Optimization

### 1. Build Optimization
- Enable build caching
- Optimize dependencies
- Use production builds

### 2. CDN Configuration
- Enable CloudFront distribution
- Configure caching headers
- Optimize static assets

## Backup and Recovery

### 1. Database Backups
- Supabase automatic backups
- Manual backup procedures
- Point-in-time recovery

### 2. Code Backup
- GitHub repository
- Multiple environment deployments
- Rollback procedures

## Support and Resources

### 1. Documentation
- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)

### 2. Community
- AWS Amplify Community
- Supabase Community
- GitHub Issues

## Migration from Vercel

### 1. Remove Vercel Configuration
```bash
# Remove Vercel files
rm vercel.json
rm .vercelignore
```

### 2. Update Deployment Scripts
- Update `package.json` scripts
- Modify build commands
- Update environment variables

### 3. Test Deployment
- Verify build process
- Test environment variables
- Check application functionality
