# Full AWS Migration Plan: Lightsail + Cognito
## THFCScan — Supabase → 100% AWS

**Target**: Everything in AWS, nothing in Supabase  
**Users**: 10  
**Estimated monthly cost**: ~$15-20/month  
**Timeline**: 3 weeks  

---

## What We're Replacing

| Supabase Feature | AWS Replacement |
|---|---|
| PostgreSQL database | Lightsail Managed Database (PostgreSQL) |
| Auth (signIn, signUp, sessions) | Amazon Cognito User Pool |
| Row Level Security (RLS) | Application-layer checks in Lambda |
| REST API (auto-generated) | Existing API Gateway + Lambda (no change) |
| File storage | Existing S3 (no change) |
| Realtime subscriptions | Remove (not used critically) |
| `profiles` table | Keep in Lightsail DB, linked to Cognito sub |

---

## Cost Breakdown

| Service | Cost |
|---|---|
| Lightsail Managed DB (1GB RAM, 40GB SSD) | $15/month |
| Cognito (up to 50,000 MAUs) | $0/month |
| Lambda (8 functions, 10 users) | ~$0/month |
| API Gateway HTTP API | ~$0/month |
| S3 (photo storage) | ~$0.25/month |
| SES (emails) | ~$0/month |
| Amplify hosting | ~$1/month |
| **Total** | **~$16.25/month** |

---

## Architecture After Migration

```
Browser (React)
    │
    ├── Auth → Amazon Cognito User Pool
    │           (login, signup, password reset, JWT tokens)
    │
    ├── API calls → API Gateway → Lambda functions
    │                               │
    │                               └── Lightsail PostgreSQL DB
    │                                   (donations, stores, profiles, etc.)
    │
    └── Photo uploads → Lambda (upload-photo) → S3
```

---

# Week 1 — Infrastructure Setup

## Day 1-2: Lightsail Database

### Step 1: Create Lightsail Managed Database

1. Go to AWS Console → Lightsail → Databases → Create database
2. Choose:
   - Database engine: PostgreSQL 16
   - Bundle: **$15/month** (1GB RAM, 40GB SSD, 1 vCPU)
   - Database name: `thfcscan`
   - Master username: `dbmasteruser` (Lightsail default)
   - Region: `us-east-1` (same as your Lambdas)
3. Enable public mode temporarily for initial migration
4. Note the endpoint, port (5432), username, password

### Step 2: Configure Security

In Lightsail → Databases → your DB → Networking:
- Add allowed IP: your Lambda function IPs (or use VPC peering)
- For simplicity with Lambda: enable public endpoint, restrict by IP later

### Step 3: Store credentials in Parameter Store

```bash
aws ssm put-parameter --name "/thfcscan/prod/db/host" \
  --value "YOUR_LIGHTSAIL_ENDPOINT" --type "String"

aws ssm put-parameter --name "/thfcscan/prod/db/port" \
  --value "5432" --type "String"

aws ssm put-parameter --name "/thfcscan/prod/db/name" \
  --value "thfcscan" --type "String"

aws ssm put-parameter --name "/thfcscan/prod/db/user" \
  --value "dbmasteruser" --type "String"

aws ssm put-parameter --name "/thfcscan/prod/db/password" \
  --value "YOUR_PASSWORD" --type "SecureString"
```

### Step 4: Run Schema Migration

Connect via psql and run the migrations in order:

```bash
psql -h YOUR_LIGHTSAIL_ENDPOINT -U dbmasteruser -d thfcscan -p 5432

# Run the main schema (this is the consolidated migration)
\i supabase/migrations/20250823120000_optimized_thfcscan_complete.sql

# Then run subsequent migrations
\i supabase/migrations/20250823130000_remove_zoho_completely.sql
\i supabase/migrations/20250823150000_fix_database_issues.sql
\i supabase/migrations/20250823160000_add_all_spar_stores.sql
\i supabase/migrations/20250823170000_add_missing_rpc_functions.sql
```

> Note: Remove any Supabase-specific RLS policies from the SQL before running.
> Search for `CREATE POLICY`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`,
> and `auth.uid()` — delete those blocks, we handle auth in Lambda now.

---

## Day 3-4: Cognito User Pool

### Step 1: Create Cognito User Pool

1. Go to AWS Console → Cognito → Create user pool
2. Configure:
   - Sign-in: Email
   - Password policy: min 8 chars, require uppercase + number
   - MFA: Optional (off for simplicity)
   - Email: Send via Cognito (free) or SES (already configured)
   - User pool name: `thfcscan-users`
3. App client:
   - App type: Public client (for React frontend)
   - App client name: `thfcscan-web`
   - Auth flows: `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`
   - No client secret (public client)
4. Note:
   - User Pool ID: `us-east-1_XXXXXXXXX`
   - App Client ID: `XXXXXXXXXXXXXXXXXXXXXXXXXX`

### Step 2: Store Cognito config in Parameter Store

```bash
aws ssm put-parameter --name "/thfcscan/prod/cognito/user_pool_id" \
  --value "us-east-1_XXXXXXXXX" --type "String"

aws ssm put-parameter --name "/thfcscan/prod/cognito/client_id" \
  --value "XXXXXXXXXXXXXXXXXXXXXXXXXX" --type "String"

aws ssm put-parameter --name "/thfcscan/prod/cognito/region" \
  --value "us-east-1" --type "String"
```

### Step 3: Update Lambda IAM permissions

Add to `serverless.yml` IAM statements:

```yaml
- Effect: Allow
  Action:
    - cognito-idp:AdminGetUser
    - cognito-idp:AdminCreateUser
    - cognito-idp:AdminSetUserPassword
    - cognito-idp:ListUsers
  Resource:
    - arn:aws:cognito-idp:us-east-1:*:userpool/*
```

---

## Day 5: Migrate Existing Users

Since you have existing Supabase users, export and import them:

### Export from Supabase

```sql
-- Run in Supabase SQL editor before shutting it down
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'employee_id' as employee_id,
  created_at
FROM auth.users;
```

### Import to Cognito

Create a script `scripts/migrate-users-to-cognito.js`:

```javascript
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const users = [
  // Paste exported users here
  { email: 'user@example.com', fullName: 'User Name', employeeId: 'FF-001' }
];

async function migrateUsers() {
  for (const user of users) {
    // Create user (sends temp password email)
    await client.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.email,
      UserAttributes: [
        { Name: 'email', Value: user.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: user.fullName },
        { Name: 'custom:employee_id', Value: user.employeeId || '' }
      ],
      MessageAction: 'SUPPRESS' // Don't send temp password, we'll reset manually
    }));
    console.log(`Created: ${user.email}`);
  }
}

migrateUsers();
```

> Users will need to reset their passwords on first login. Send them a password reset email via Cognito.

---

# Week 2 — Code Migration

## Lambda Functions: Replace Supabase with pg + Cognito JWT

### Step 1: Install pg driver in aws-lambda

```bash
cd aws-lambda
npm install pg @aws-sdk/client-cognito-identity-provider
npm install --save-dev @types/pg
```

### Step 2: Create new database utility

Replace `aws-lambda/src/utils/supabase.ts` with a direct PostgreSQL client:

```typescript
// aws-lambda/src/utils/db.ts
import { Pool } from 'pg';
import { getParameter } from './config';

let pool: Pool | null = null;

export async function getDbPool(): Promise<Pool> {
  if (pool) return pool;

  const [host, port, name, user, password] = await Promise.all([
    getParameter('db/host'),
    getParameter('db/port'),
    getParameter('db/name'),
    getParameter('db/user'),
    getParameter('db/password', true) // decrypt SecureString
  ]);

  pool = new Pool({
    host, port: parseInt(port), database: name,
    user, password,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pool;
}

export async function query(sql: string, params?: any[]) {
  const db = await getDbPool();
  return db.query(sql, params);
}
```

### Step 3: Create Cognito JWT verifier utility

```typescript
// aws-lambda/src/utils/auth.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { getParameter } from './config';

let verifier: any = null;

export async function getCognitoVerifier() {
  if (verifier) return verifier;

  const [userPoolId, clientId] = await Promise.all([
    getParameter('cognito/user_pool_id'),
    getParameter('cognito/client_id')
  ]);

  verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'access',
    clientId
  });

  return verifier;
}

export async function verifyToken(token: string) {
  const v = await getCognitoVerifier();
  return v.verify(token); // throws if invalid
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
```

Install the JWT verifier:
```bash
npm install aws-jwt-verify
```

### Step 4: Update each Lambda function

Each function currently calls `getSupabaseClient()` or `getAdminSupabaseClient()`.
Replace with `query()` from the new db utility.

Example — `process-donation.ts` pattern change:

```typescript
// BEFORE (Supabase)
const supabase = await getAdminSupabaseClient();
const { data, error } = await supabase.from('donations').insert(donationData).select().single();

// AFTER (pg)
import { query } from '../utils/db';
import { verifyToken, extractBearerToken } from '../utils/auth';

// Verify auth at top of handler
const token = extractBearerToken(event.headers?.Authorization);
if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
const claims = await verifyToken(token); // throws if invalid
const userId = claims.sub; // Cognito user ID

// DB query
const result = await query(
  `INSERT INTO donations (store_id, user_id, white_bread_qty, brown_bread_qty, photo_url, collected_at)
   VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
  [storeId, userId, whiteBreadQty, brownBreadQty, photoUrl]
);
const donation = result.rows[0];
```

### Functions to update (all 8):

| Function | Auth needed | DB queries |
|---|---|---|
| `process-donation` | yes | INSERT donations |
| `edit-donation` | yes | UPDATE donations |
| `send-daily-summary` | no (scheduled) | SELECT donations |
| `upload-photo` | yes | none (S3 only) |
| `generate-expiring-shortcode` | yes | INSERT/SELECT shortcodes |
| `refresh-all-shortcodes` | admin only | UPDATE shortcodes |
| `get-donation-stats` | yes | SELECT aggregates |
| `welcome-email` | no | SELECT profiles |
| `password-reset-email` | no | Cognito API call |

### Step 5: Update password-reset-email Lambda

This currently uses Supabase's built-in reset. Replace with Cognito:

```typescript
// aws-lambda/src/functions/password-reset-email.ts
import { CognitoIdentityProviderClient, ForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// In handler:
await cognitoClient.send(new ForgotPasswordCommand({
  ClientId: process.env.COGNITO_CLIENT_ID,
  Username: email
}));
// Cognito sends the reset email automatically via SES
```

### Step 6: Update welcome-email Lambda

Replace Supabase user creation with Cognito AdminCreateUser:

```typescript
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';
```

---

## Frontend: Replace Supabase Auth with Cognito

### Step 1: Install Amplify Auth (lightest Cognito client)

```bash
npm install aws-amplify
```

### Step 2: Create new auth utility

Replace `src/lib/supabase.ts` with `src/lib/auth.ts`:

```typescript
// src/lib/auth.ts
import { Amplify } from 'aws-amplify';
import { signIn, signOut, signUp, getCurrentUser, 
         resetPassword, confirmResetPassword,
         fetchAuthSession } from 'aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: { email: true }
    }
  }
});

export { signIn, signOut, signUp, getCurrentUser, 
         resetPassword, confirmResetPassword, fetchAuthSession };

export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() ?? null;
  } catch {
    return null;
  }
}
```

### Step 3: Update LoginForm.tsx

```typescript
// Replace:
import { supabase } from '../../lib/supabase';
// With:
import { signIn } from '../../lib/auth';

// Replace login call:
const { isSignedIn } = await signIn({ username: email, password });
if (isSignedIn) onLogin();

// Replace forgot password:
import { resetPassword } from '../../lib/auth';
await resetPassword({ username: resetEmail });
// Cognito sends the email automatically
```

### Step 4: Update SignUpForm.tsx

```typescript
import { signUp } from '../../lib/auth';

const { isSignUpComplete } = await signUp({
  username: email,
  password,
  options: {
    userAttributes: {
      email,
      name: formData.fullName,
      'custom:employee_id': employeeId
    }
  }
});
// Then call your welcome-email Lambda to create the profiles DB record
```

### Step 5: Update App.tsx auth initialization

```typescript
// Replace supabase.auth.onAuthStateChange with:
import { getCurrentUser, fetchAuthSession } from './lib/auth';

// In initializeAuth():
try {
  const user = await getCurrentUser();
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  setState(prev => ({ ...prev, user: { id: user.userId, email: user.signInDetails?.loginId }, loading: false }));
} catch {
  setState(prev => ({ ...prev, user: null, loading: false }));
}
```

### Step 6: Update apiClient.ts to send Cognito JWT

```typescript
// In getAuthHeaders():
import { getAccessToken } from '../lib/auth';

const token = await getAccessToken();
return token ? { 'Authorization': `Bearer ${token}` } : {};
```

### Step 7: Update environment variables

Add to `.env`:
```env
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

Remove:
```env
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# VITE_SUPABASE_SERVICE_KEY=...
```

Update in AWS Amplify Console environment variables too.

---

# Week 3 — Testing, Cutover & Cleanup

## Day 1-2: Integration Testing

Test each flow end-to-end:

- [ ] Sign up new user → Cognito creates user → profiles row created in Lightsail DB
- [ ] Login → Cognito returns JWT → API calls succeed
- [ ] Submit donation → Lambda verifies JWT → inserts to Lightsail DB → SES email sent
- [ ] Upload photo → Lambda verifies JWT → uploads to S3
- [ ] Password reset → Cognito sends email → user resets → can login
- [ ] Daily summary cron → Lambda queries Lightsail DB → SES email sent
- [ ] Admin portal → stats load from Lightsail DB
- [ ] Edit donation → Lambda verifies JWT → updates Lightsail DB

## Day 3: Data Migration from Supabase

```bash
# Export all existing donations from Supabase
pg_dump "postgresql://postgres:[password]@db.tqrlhajnkfcchgzsqpjd.supabase.co:5432/postgres" \
  --table=donations --table=stores --table=profiles \
  --table=sales_periods --table=daily_donation_log \
  --data-only -f thfcscan_data_export.sql

# Import to Lightsail
psql -h YOUR_LIGHTSAIL_ENDPOINT -U dbmasteruser -d thfcscan \
  -f thfcscan_data_export.sql
```

## Day 4: Cutover

1. Put app in maintenance mode (update Amplify env `VITE_MAINTENANCE=true`)
2. Do final data export from Supabase
3. Import to Lightsail
4. Deploy updated frontend and Lambda functions
5. Smoke test all flows
6. Remove maintenance mode
7. Monitor CloudWatch logs for 24 hours

## Day 5: Cleanup

- Cancel Supabase subscription (or let free tier lapse)
- Remove all `@supabase/supabase-js` references
- Delete old `src/lib/supabase.ts`
- Update README
- Archive old migration docs

---

## Updated serverless.yml changes summary

```yaml
provider:
  memorySize: 256  # Down from 512, saves cost
  environment:
    STAGE: ${self:provider.stage}
    REGION: ${self:provider.region}
    COGNITO_CLIENT_ID: ${ssm:/thfcscan/${self:provider.stage}/cognito/client_id}

# Add to IAM statements:
- Effect: Allow
  Action:
    - cognito-idp:AdminGetUser
    - cognito-idp:AdminCreateUser
    - cognito-idp:ForgotPassword
  Resource: '*'
```

---

## Files Changed Summary

| File | Change |
|---|---|
| `aws-lambda/src/utils/supabase.ts` | Delete — replaced by `db.ts` |
| `aws-lambda/src/utils/db.ts` | New — pg Pool connection to Lightsail |
| `aws-lambda/src/utils/auth.ts` | New — Cognito JWT verifier |
| `aws-lambda/src/utils/config.ts` | Update — add Cognito + DB params |
| `aws-lambda/src/functions/*.ts` | All 8 — replace Supabase calls with pg queries |
| `aws-lambda/serverless.yml` | Update — memory, IAM, env vars |
| `src/lib/supabase.ts` | Delete |
| `src/lib/auth.ts` | New — Amplify Cognito config |
| `src/components/Auth/LoginForm.tsx` | Update — use Cognito signIn |
| `src/components/Auth/SignUpForm.tsx` | Update — use Cognito signUp |
| `src/components/Auth/ResetPasswordPage.tsx` | Update — use Cognito resetPassword |
| `src/App.tsx` | Update — auth init with Cognito |
| `src/services/apiClient.ts` | Update — attach Cognito JWT |
| `.env` | Update — swap Supabase vars for Cognito vars |
| `package.json` | Add `aws-amplify`, remove `@supabase/supabase-js` |

---

## Risk & Rollback

- Keep Supabase project alive until Day 3 of Week 3 (data migration day)
- Run both systems in parallel during Week 2 testing
- Rollback = revert env vars to Supabase URLs, redeploy — takes 5 minutes

---

*Ready to start coding? Say "start Week 1" and I'll implement the infrastructure files and db.ts/auth.ts utilities.*
