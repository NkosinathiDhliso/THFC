# AWS Migration Plan for THFCScan

## Overview
Migrating THFCScan from Azure to AWS while keeping Supabase as the database solution.

## Migration Strategy
**Hybrid Approach**: AWS + Supabase
- **Keep**: Supabase (Database, Auth, Real-time)
- **Migrate**: Azure Functions → AWS Lambda
- **Migrate**: Azure Static Web Apps → AWS S3 + CloudFront
- **Migrate**: Azure Blob Storage → AWS S3

## Phase 1: Core Infrastructure Setup

### 1.1 AWS Services to Configure
- ✅ **AWS Lambda** - Replace Azure Functions
- ✅ **API Gateway** - HTTP endpoints for Lambda functions
- ✅ **S3** - Static website hosting + file storage
- ✅ **CloudFront** - CDN for global distribution
- ✅ **Systems Manager Parameter Store** - Configuration management
- ✅ **AWS Secrets Manager** - Secure credential storage
- ✅ **SES** - Email notifications (already configured)
- ✅ **CloudWatch** - Monitoring and logging

### 1.2 Required IAM Policies
Your current AWS account has these policies:
- AdministratorAccess-Amplify
- AmazonAPIGatewayAdministrator
- AmazonEventBridgeFullAccess
- AmazonRoute53FullAccess
- AmazonS3FullAccess
- AmazonSESFullAccess
- AmazonSNSFullAccess
- AmazonSSMFullAccess
- AmazonVPCFullAccess
- AWSCodePipeline_FullAccess

**Additional policies needed:**
- AWSLambda_FullAccess
- CloudWatchFullAccess
- SecretsManagerReadWrite

## Phase 2: Lambda Functions Migration

### 2.1 Current Azure Functions to Migrate
1. **process-donation** → AWS Lambda
2. **send-daily-summary** → AWS Lambda + EventBridge
3. **edit-donation** → AWS Lambda
4. **generate-expiring-shortcode** → AWS Lambda
5. **refresh-all-shortcodes** → AWS Lambda
6. **password-reset-email** → AWS Lambda
7. **welcome-email** → AWS Lambda
8. **debug-env** → AWS Lambda

### 2.2 Lambda Configuration
- **Runtime**: Node.js 18.x
- **Architecture**: x86_64
- **Memory**: 512 MB (adjustable)
- **Timeout**: 30 seconds (adjustable)
- **Environment Variables**: From Parameter Store/Secrets Manager

## Phase 3: Frontend Migration

### 3.1 S3 Static Website Hosting
- **Bucket**: thfcscan-frontend-prod
- **Configuration**: Static website hosting enabled
- **Index document**: index.html
- **Error document**: index.html (for SPA routing)

### 3.2 CloudFront Distribution
- **Origin**: S3 bucket
- **Caching**: Optimized for SPA
- **Custom domain**: Optional
- **SSL Certificate**: AWS Certificate Manager

## Phase 4: CI/CD Pipeline

### 4.1 GitHub Actions Workflow
- **Build**: React app + Lambda functions
- **Deploy**: S3 + Lambda functions
- **Test**: Health checks
- **Notify**: Deployment status

### 4.2 AWS CodePipeline (Alternative)
- Source: GitHub
- Build: CodeBuild
- Deploy: S3 + Lambda

## Phase 5: Configuration Management

### 5.1 Parameter Store Structure
```
/thfcscan/prod/supabase/url
/thfcscan/prod/supabase/anon_key
/thfcscan/prod/supabase/service_role_key
/thfcscan/prod/azure/storage_connection_string
```

### 5.2 Secrets Manager
```
/thfcscan/prod/aws/ses/access_key_id
/thfcscan/prod/aws/ses/secret_access_key
/thfcscan/prod/supabase/service_role_key
```

## Migration Timeline

### Week 1: Infrastructure Setup
- [ ] Create Lambda functions
- [ ] Set up API Gateway
- [ ] Configure S3 bucket
- [ ] Set up CloudFront
- [ ] Configure Parameter Store/Secrets Manager

### Week 2: Function Migration
- [ ] Migrate Azure Functions to Lambda
- [ ] Test Lambda functions locally
- [ ] Deploy and test in AWS

### Week 3: Frontend Migration
- [ ] Update API endpoints
- [ ] Deploy to S3
- [ ] Configure CloudFront
- [ ] Test complete application

### Week 4: CI/CD & Monitoring
- [ ] Update GitHub Actions
- [ ] Set up CloudWatch monitoring
- [ ] Performance testing
- [ ] Go-live preparation

## Cost Estimation

### Current Azure Costs (Estimated)
- Azure Functions: ~$20/month
- Azure Static Web Apps: ~$10/month
- Azure Blob Storage: ~$5/month
- **Total**: ~$35/month

### Projected AWS Costs
- Lambda: ~$15/month
- API Gateway: ~$5/month
- S3: ~$3/month
- CloudFront: ~$5/month
- Parameter Store: ~$1/month
- **Total**: ~$29/month

**Estimated Savings**: ~$6/month (17% reduction)

## Risk Mitigation

### Parallel Running
- Keep Azure infrastructure running during migration
- Gradual traffic switching
- Easy rollback capability

### Testing Strategy
- Unit tests for Lambda functions
- Integration tests with Supabase
- End-to-end testing
- Performance benchmarking

## Success Criteria

- [ ] All Azure Functions migrated to Lambda
- [ ] Frontend deployed to S3 + CloudFront
- [ ] All features working correctly
- [ ] Performance equal or better than Azure
- [ ] CI/CD pipeline functional
- [ ] Monitoring and alerting in place
- [ ] Cost reduction achieved

## Next Steps

1. **Immediate**: Create Lambda functions and API Gateway
2. **Short-term**: Migrate core functions (process-donation, daily-summary)
3. **Medium-term**: Complete function migration and frontend deployment
4. **Long-term**: Optimize performance and costs

---

**Note**: This migration maintains Supabase for database operations, ensuring minimal disruption to existing data and authentication flows.