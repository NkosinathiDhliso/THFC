# AWS RDS PostgreSQL Setup Guide - Cheapest Option

## Overview
Since your Supabase database was deleted, this guide will help you set up the cheapest AWS PostgreSQL database and migrate your schema.

## Cost Comparison

### Option 1: Amazon RDS Free Tier (RECOMMENDED)
- **Cost**: FREE for 12 months
- **After 12 months**: ~$15-20/month
- **Specs**: db.t3.micro (1 vCPU, 1 GB RAM, 20 GB storage)
- **Includes**: Automated backups, monitoring, security patches

### Option 2: Amazon Lightsail Database
- **Cost**: $15/month (flat rate)
- **Specs**: 1 GB RAM, 40 GB SSD, 1 vCPU
- **Best for**: Predictable pricing after free tier expires

### Option 3: Amazon RDS db.t4g.micro
- **Cost**: ~$12-15/month
- **Specs**: 1 vCPU, 1 GB RAM, 20 GB storage
- **Best for**: ARM-based instances (slightly cheaper)

## Step-by-Step Setup

### Step 1: Create RDS PostgreSQL Instance (Free Tier)

1. **Go to AWS Console** → RDS → Create Database

2. **Choose Database Creation Method**
   - Select: "Standard create"

3. **Engine Options**
   - Engine type: PostgreSQL
   - Version: PostgreSQL 15.x (latest stable)

4. **Templates**
   - ✅ Select: "Free tier" (this limits options to free tier eligible)

5. **Settings**
   - DB instance identifier: `thfcscan-db`
   - Master username: `postgres`
   - Master password: (create a strong password)
   - Confirm password

6. **Instance Configuration**
   - DB instance class: db.t3.micro (auto-selected with free tier)

7. **Storage**
   - Storage type: General Purpose SSD (gp2)
   - Allocated storage: 20 GB (free tier limit)
   - ❌ Uncheck "Enable storage autoscaling" (to stay in free tier)

8. **Connectivity**
   - Compute resource: Don't connect to an EC2 compute resource
   - VPC: Default VPC
   - Public access: ✅ Yes (so your Lambda functions can access it)
   - VPC security group: Create new
   - Security group name: `thfcscan-db-sg`

9. **Database Authentication**
   - Select: Password authentication

10. **Additional Configuration**
    - Initial database name: `thfcscan`
    - ❌ Uncheck "Enable automated backups" (optional, to save costs)
    - ❌ Uncheck "Enable encryption" (optional, free tier compatible)

11. **Click "Create database"**
    - Wait 5-10 minutes for creation

### Step 2: Configure Security Group

1. **Go to EC2** → Security Groups
2. **Find**: `thfcscan-db-sg`
3. **Edit Inbound Rules**
   - Add rule:
     - Type: PostgreSQL
     - Port: 5432
     - Source: 0.0.0.0/0 (for testing) or your Lambda VPC CIDR
   - Save rules

### Step 3: Get Connection Details

1. **Go to RDS** → Databases → `thfcscan-db`
2. **Copy these values**:
   - Endpoint: `thfcscan-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com`
   - Port: `5432`
   - Database name: `thfcscan`

### Step 4: Update Environment Variables

Update your `.env` file:

```env
# Old Supabase (REMOVE)
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=...

# New AWS RDS PostgreSQL
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@thfcscan-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/thfcscan
DB_HOST=thfcscan-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=thfcscan
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
```

### Step 5: Store Credentials in AWS Parameter Store

```bash
# Store database credentials securely
aws ssm put-parameter \
  --name "/thfcscan/prod/db/host" \
  --value "thfcscan-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com" \
  --type "String"

aws ssm put-parameter \
  --name "/thfcscan/prod/db/password" \
  --value "YOUR_PASSWORD" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/thfcscan/prod/db/name" \
  --value "thfcscan" \
  --type "String"
```

### Step 6: Connect and Run Schema Migration

#### Option A: Using psql (Command Line)

```bash
# Install PostgreSQL client if needed
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Connect to database
psql -h thfcscan-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d thfcscan \
     -p 5432

# Once connected, run the schema
\i supabase/migrations/20250823120000_optimized_thfcscan_complete.sql
```

#### Option B: Using DBeaver or pgAdmin (GUI)

1. Download DBeaver: https://dbeaver.io/download/
2. Create new connection:
   - Host: Your RDS endpoint
   - Port: 5432
   - Database: thfcscan
   - Username: postgres
   - Password: Your password
3. Open SQL editor
4. Copy contents of `supabase/migrations/20250823120000_optimized_thfcscan_complete.sql`
5. Execute

#### Option C: Using Node.js Script

Create `scripts/migrate-to-rds.js`:

```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to RDS PostgreSQL');

    const sql = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/20250823120000_optimized_thfcscan_complete.sql'),
      'utf8'
    );

    await client.query(sql);
    console.log('✅ Schema migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
```

Run it:
```bash
npm install pg
node scripts/migrate-to-rds.js
```

### Step 7: Update Lambda Functions

Update `aws-lambda/src/utils/supabase.ts` to use direct PostgreSQL connection:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};
```

### Step 8: Handle Authentication

Since you're losing Supabase Auth, you have two options:

#### Option A: AWS Cognito (Recommended)
- Free tier: 50,000 MAUs
- Integrates with Lambda
- Cost: ~$0-5/month

#### Option B: Custom JWT Auth
- Use your existing `profiles` table
- Implement JWT tokens in Lambda
- Store sessions in RDS

## Important Notes

### What You're Losing from Supabase:
- ❌ Built-in authentication (need to implement)
- ❌ Auto-generated REST APIs (need to create Lambda endpoints)
- ❌ Real-time subscriptions (need to implement WebSockets if needed)
- ❌ Row Level Security (need to implement in application layer)
- ❌ Storage for files (already using S3, so no change)

### What You're Gaining:
- ✅ Full control over database
- ✅ No vendor lock-in
- ✅ Everything in AWS ecosystem
- ✅ Potentially lower costs
- ✅ Better integration with Lambda

## Cost Optimization Tips

1. **Use Free Tier**: 12 months free with db.t3.micro
2. **Disable Automated Backups**: Save ~$0.10/GB/month
3. **Use Single-AZ**: Multi-AZ doubles costs
4. **Monitor Storage**: Stay under 20 GB for free tier
5. **Use Reserved Instances**: After free tier, save 30-60%

## Monitoring

Set up CloudWatch alarms:
- CPU utilization > 80%
- Free storage space < 2 GB
- Database connections > 80

## Backup Strategy

Even without automated backups:
```bash
# Manual backup
pg_dump -h thfcscan-db.xxx.rds.amazonaws.com \
        -U postgres \
        -d thfcscan \
        -F c \
        -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -h thfcscan-db.xxx.rds.amazonaws.com \
           -U postgres \
           -d thfcscan \
           backup_20250317.dump
```

## Next Steps

1. ✅ Create RDS instance
2. ✅ Run schema migration
3. ⬜ Implement authentication (Cognito or custom)
4. ⬜ Update Lambda functions to use PostgreSQL
5. ⬜ Update frontend to use new API endpoints
6. ⬜ Test all functionality
7. ⬜ Set up monitoring and backups

## Troubleshooting

### Can't connect to RDS
- Check security group allows port 5432
- Verify public access is enabled
- Check VPC and subnet configuration

### Schema migration fails
- Check PostgreSQL version compatibility
- Run migrations one at a time
- Check for syntax errors

### Lambda can't connect
- Add Lambda to same VPC as RDS
- Or keep RDS publicly accessible
- Update security group to allow Lambda IPs

---

**Estimated Total Cost**: $0/month (first 12 months), then $15-20/month
