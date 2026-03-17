# THFCScan AWS Lambda Functions

This directory contains the AWS Lambda functions for the THFCScan project, migrated from Azure Functions to provide serverless backend functionality.

## 🏗️ Architecture Overview

The Lambda functions integrate with:
- **Supabase**: Database and authentication (retained from original setup)
- **AWS S3**: File storage for donation photos and archives
- **AWS SES**: Email service for notifications
- **AWS Systems Manager Parameter Store**: Configuration management
- **AWS Secrets Manager**: Secure secret storage
- **AWS API Gateway**: HTTP endpoints for the functions
- **AWS CloudWatch**: Logging and monitoring

## 📁 Project Structure

```
aws-lambda/
├── src/
│   ├── functions/           # Lambda function handlers
│   │   ├── process-donation.ts
│   │   ├── send-daily-summary.ts
│   │   ├── edit-donation.ts
│   │   ├── generate-expiring-shortcode.ts
│   │   ├── refresh-all-shortcodes.ts
│   │   ├── password-reset-email.ts
│   │   ├── welcome-email.ts
│   │   └── get-donation-stats.ts
│   └── utils/               # Shared utilities
│       ├── config.ts        # Configuration management
│       ├── supabase.ts      # Supabase client utilities
│       └── email.ts         # Email service utilities
├── package.json             # Dependencies and scripts
├── serverless.yml           # Serverless Framework configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## 🚀 Lambda Functions

### 1. Process Donation (`process-donation`)
- **Trigger**: HTTP POST via API Gateway
- **Purpose**: Handle new donation submissions
- **Features**:
  - Validates donation data
  - Creates donation record in Supabase
  - Sends confirmation email to donor
  - Handles photo upload validation

### 2. Send Daily Summary (`send-daily-summary`)
- **Trigger**: EventBridge schedule (daily at 4 PM UTC / 6 PM SAST)
- **Purpose**: Generate and send daily donation summaries
- **Features**:
  - Aggregates daily donation data
  - Creates ZIP archive of donation photos
  - Uploads archive to S3
  - Sends summary email to administrators

### 3. Edit Donation (`edit-donation`)
- **Trigger**: HTTP PUT via API Gateway
- **Purpose**: Update existing donation records
- **Features**:
  - Validates update permissions
  - Updates donation data in Supabase
  - Sends notification emails on status changes
  - Maintains audit trail

### 4. Generate Expiring Shortcode (`generate-expiring-shortcode`)
- **Trigger**: HTTP POST via API Gateway
- **Purpose**: Create time-limited access codes for stores
- **Features**:
  - Generates unique shortcodes
  - Sets expiration times
  - Validates store permissions
  - Tracks usage statistics

### 5. Refresh All Shortcodes (`refresh-all-shortcodes`)
- **Trigger**: EventBridge schedule (configurable)
- **Purpose**: Maintain shortcode lifecycle
- **Features**:
  - Deactivates expired shortcodes
  - Generates new shortcodes for active stores
  - Cleans up old inactive codes
  - Sends admin notifications

### 6. Password Reset Email (`password-reset-email`)
- **Trigger**: HTTP POST via API Gateway
- **Purpose**: Handle password reset requests
- **Features**:
  - Validates user existence
  - Generates secure reset tokens
  - Sends reset emails via SES
  - Prevents email enumeration attacks

### 7. Welcome Email (`welcome-email`)
- **Trigger**: HTTP POST via API Gateway
- **Purpose**: Send welcome emails to new users
- **Features**:
  - Customizable welcome messages
  - Bulk email capabilities
  - Rate limiting protection
  - Email delivery tracking

### 8. Get Donation Stats (`get-donation-stats`)
- **Trigger**: HTTP GET via API Gateway
- **Purpose**: Provide donation analytics and reporting
- **Features**:
  - Overview statistics
  - Trend analysis
  - Store-specific metrics
  - Flexible date ranges and grouping

## 🛠️ Setup Instructions

### Prerequisites

1. **Node.js** (v18 or later)
2. **AWS CLI** configured with appropriate permissions
3. **Serverless Framework** installed globally:
   ```bash
   npm install -g serverless
   ```
4. **AWS Account** with the following services enabled:
   - Lambda
   - API Gateway
   - S3
   - SES
   - Systems Manager
   - Secrets Manager
   - EventBridge
   - CloudWatch

### Installation

1. **Install dependencies**:
   ```bash
   cd aws-lambda
   npm install
   ```

2. **Configure AWS credentials**:
   ```bash
   aws configure
   ```

3. **Set up environment variables in AWS Systems Manager Parameter Store**:
   ```bash
   # Supabase configuration
   aws ssm put-parameter --name "/thfcscan/supabase/url" --value "your-supabase-url" --type "String"
   aws ssm put-parameter --name "/thfcscan/supabase/anon-key" --value "your-anon-key" --type "SecureString"
   aws ssm put-parameter --name "/thfcscan/supabase/service-role-key" --value "your-service-role-key" --type "SecureString"
   
   # AWS SES configuration
   aws ssm put-parameter --name "/thfcscan/ses/region" --value "us-east-1" --type "String"
   aws ssm put-parameter --name "/thfcscan/ses/from-email" --value "noreply@thfcscan.com" --type "String"
   
   # Azure Storage (for migration period)
   aws ssm put-parameter --name "/thfcscan/azure/storage-connection-string" --value "your-azure-connection" --type "SecureString"
   ```

4. **Verify SES email addresses**:
   ```bash
   aws ses verify-email-identity --email-address noreply@thfcscan.com
   aws ses verify-email-identity --email-address admin@thfcscan.com
   ```

### Deployment

1. **Deploy to development**:
   ```bash
   npm run deploy:dev
   ```

2. **Deploy to production**:
   ```bash
   npm run deploy:prod
   ```

3. **Deploy specific function**:
   ```bash
   serverless deploy function --function processDonation
   ```

### Local Development

1. **Start local development server**:
   ```bash
   npm run dev
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Lint code**:
   ```bash
   npm run lint
   ```

4. **Build TypeScript**:
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables

The functions use AWS Systems Manager Parameter Store for configuration:

| Parameter | Description | Type |
|-----------|-------------|------|
| `/thfcscan/supabase/url` | Supabase project URL | String |
| `/thfcscan/supabase/anon-key` | Supabase anonymous key | SecureString |
| `/thfcscan/supabase/service-role-key` | Supabase service role key | SecureString |
| `/thfcscan/ses/region` | AWS SES region | String |
| `/thfcscan/ses/from-email` | Default sender email | String |
| `/thfcscan/azure/storage-connection-string` | Azure storage (migration) | SecureString |

### IAM Permissions

The Lambda functions require the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/thfcscan/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:thfcscan/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::thfcscan-storage/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## 📊 Monitoring and Logging

### CloudWatch Logs

All functions log to CloudWatch with the following log groups:
- `/aws/lambda/thfcscan-dev-processDonation`
- `/aws/lambda/thfcscan-dev-sendDailySummary`
- `/aws/lambda/thfcscan-dev-editDonation`
- etc.

### Metrics

Key metrics to monitor:
- **Invocation count**: Number of function executions
- **Duration**: Function execution time
- **Error rate**: Percentage of failed executions
- **Throttles**: Number of throttled requests

### Alarms

Recommended CloudWatch alarms:
- High error rate (>5%)
- Long duration (>30 seconds)
- High throttle rate
- Failed email deliveries

## 🔄 Migration from Azure

### Migration Checklist

- [x] **Lambda Functions**: All 8 Azure Functions migrated
- [x] **Configuration**: Parameter Store and Secrets Manager setup
- [x] **Email Service**: SES configured and verified
- [x] **Storage**: S3 bucket created with CORS
- [x] **Scheduling**: EventBridge rules for scheduled functions
- [x] **API Gateway**: HTTP endpoints configured
- [x] **Monitoring**: CloudWatch logging enabled
- [ ] **DNS**: Update API endpoints in frontend
- [ ] **Testing**: End-to-end testing completed
- [ ] **Go-Live**: Switch traffic from Azure to AWS

### Parallel Running

During migration, both Azure and AWS functions will run in parallel:
1. Deploy AWS functions
2. Test AWS endpoints thoroughly
3. Update frontend to use AWS endpoints
4. Monitor both systems for 1-2 weeks
5. Decommission Azure functions

### Rollback Plan

If issues arise:
1. Revert frontend to Azure endpoints
2. Investigate and fix AWS issues
3. Re-test before switching back

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Load Testing

```bash
npm run test:load
```

### Manual Testing

Use the provided Postman collection or curl commands:

```bash
# Test donation processing
curl -X POST https://api.thfcscan.com/dev/donations \
  -H "Content-Type: application/json" \
  -d '{
    "donor_name": "Test Donor",
    "donor_email": "test@example.com",
    "amount": 100,
    "store_id": "store-123"
  }'

# Test donation stats
curl "https://api.thfcscan.com/dev/donations/stats?stats_type=overview&start_date=2024-01-01"
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**:
   - Check IAM roles and policies
   - Verify Parameter Store access

2. **Email Not Sending**:
   - Verify SES email addresses
   - Check SES sending limits
   - Review CloudWatch logs

3. **Database Connection Issues**:
   - Verify Supabase credentials
   - Check network connectivity
   - Review Supabase service status

4. **Function Timeouts**:
   - Increase timeout in serverless.yml
   - Optimize database queries
   - Review function memory allocation

### Debug Commands

```bash
# View function logs
serverless logs --function processDonation --tail

# Invoke function locally
serverless invoke local --function processDonation --data '{"test": true}'

# Check function info
serverless info
```

## 📈 Performance Optimization

### Best Practices

1. **Connection Pooling**: Reuse Supabase connections
2. **Caching**: Cache configuration parameters
3. **Batch Operations**: Process multiple items together
4. **Async Processing**: Use async/await properly
5. **Memory Allocation**: Right-size Lambda memory

### Monitoring Performance

- Use AWS X-Ray for distributed tracing
- Monitor cold start times
- Track database query performance
- Set up custom metrics for business logic

## 🔐 Security

### Security Measures

1. **Secrets Management**: All secrets in Secrets Manager
2. **Encryption**: Data encrypted at rest and in transit
3. **Access Control**: Least privilege IAM policies
4. **Input Validation**: All inputs validated and sanitized
5. **Rate Limiting**: API Gateway throttling enabled
6. **CORS**: Proper CORS configuration

### Security Checklist

- [ ] No hardcoded secrets in code
- [ ] All API endpoints use HTTPS
- [ ] Input validation on all functions
- [ ] Rate limiting configured
- [ ] CloudWatch monitoring enabled
- [ ] Regular security updates

## 📞 Support

For issues and questions:

1. **Check CloudWatch Logs**: First line of debugging
2. **Review Documentation**: This README and inline comments
3. **GitHub Issues**: Create issue with detailed description
4. **Team Contact**: Reach out to development team

## 📝 License

This project is part of the THFCScan application. All rights reserved.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Migration Status**: In Progress