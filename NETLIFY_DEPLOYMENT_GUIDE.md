# Netlify Deployment Configuration Guide

## 🎯 Target Deployment Site
**URL**: `https://inquisitive-praline-1e9212.netlify.app`

## ✅ Current Status
Your CI/CD pipeline is already configured and ready! The GitHub Actions workflow will automatically deploy to Netlify when you push to the `main` branch.

## 🔧 Required Configuration Steps

### Step 1: Get Your Netlify Site ID

1. **Login to Netlify**: https://app.netlify.com
2. **Find your site**: Look for "inquisitive-praline-1e9212" in your sites list
3. **Go to Site settings**: Click on your site → Site settings → General
4. **Copy Site ID**: Under "Site details", copy the Site ID (e.g., `abc123def-456-789-ghi-jklmnop`)

### Step 2: Get Your Netlify Auth Token

1. **Go to User Settings**: https://app.netlify.com/user/applications#personal-access-tokens
2. **Generate new token**: Click "New access token"
3. **Name it**: e.g., "GitHub Actions CI/CD"
4. **Copy the token**: Save it securely (you'll only see it once)

### Step 3: Configure GitHub Secrets

1. **Go to your GitHub repository**: https://github.com/[your-username]/THFCScan
2. **Navigate to**: Settings → Secrets and variables → Actions
3. **Add these Repository secrets**:

   ```
   NETLIFY_AUTH_TOKEN = [Your auth token from Step 2]
   NETLIFY_SITE_ID = [Your site ID from Step 1]
   ```

4. **Verify these environment secrets exist** (add if missing):
   ```
   VITE_SUPABASE_URL = [Your Supabase project URL]
   VITE_SUPABASE_ANON_KEY = [Your Supabase anon key]
   VITE_AZURE_FUNCTION_URL = [Your Azure Functions URL]
   VITE_AZURE_FUNCTION_KEY = [Your Azure Functions key]
   ```

## 🚀 Deployment Process

Once configured, your deployment works like this:

1. **Push to main branch** → GitHub Actions triggers
2. **Build & Test** → Runs linting, type checking, and tests
3. **Build Frontend** → Creates optimized production build
4. **Deploy to Netlify** → Uploads build to your site
5. **Deploy Azure Functions** → Updates your backend functions
6. **Database Migrations** → Applies any Supabase schema changes
7. **Health Check** → Verifies deployment is working

## 📋 Workflow Features

Your existing workflow includes:

- ✅ **Parallel Deployments**: Azure Static Web Apps + Netlify
- ✅ **Build Optimization**: Caching and artifact management
- ✅ **Testing**: Linting, type checking, and unit tests
- ✅ **Database Migrations**: Automatic Supabase schema updates
- ✅ **Health Checks**: Post-deployment verification
- ✅ **Status Notifications**: Deployment status reporting

## 🔍 Monitoring Deployments

After pushing to main:

1. **GitHub Actions**: Check the "Actions" tab in your repo
2. **Netlify Deploy**: Monitor at https://app.netlify.com/sites/inquisitive-praline-1e9212/deploys
3. **Live Site**: https://inquisitive-praline-1e9212.netlify.app

## 🛠️ Troubleshooting

If deployment fails:

1. **Check GitHub Actions logs**: Actions tab → Latest workflow run
2. **Verify secrets**: Settings → Secrets and variables → Actions
3. **Check Netlify logs**: Netlify dashboard → Site → Deploys → [failed deploy]

## 📝 Next Steps

1. Configure the secrets above
2. Push any change to the `main` branch
3. Watch the magic happen! 🎉

Your site will be automatically deployed to: **https://inquisitive-praline-1e9212.netlify.app** 