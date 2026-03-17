# 🔧 Supabase Setup Guide

## 📧 **Database Access Information**

**Email Address:** `thehealthfoodcompany@yahoo.com`
**New Project ID:** `tqrlhajnkfcchgzsqpjd`
**New Project URL:** `https://tqrlhajnkfcchgzsqpjd.supabase.co`

> 💡 **Note:** This is your NEW Supabase project. The old project (`bfgdsmorzouhfffriuot`) is no longer being used.

## Quick Setup Instructions

Your signup form is currently frozen because Supabase environment variables are not configured. Follow these steps to fix it:

### 1. Create Environment File

Create a new file called `.env.local` in your project root directory with this content:

```bash
VITE_SUPABASE_URL=https://tqrlhajnkfcchgzsqpjd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_KEY=your-service-key-here
```

### 2. Get Your Supabase Credentials

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **Sign in with:** `thehealthfoodcompany@yahoo.com`
3. Select your NEW THFCScan project (`tqrlhajnkfcchgzsqpjd`)
4. Go to **Settings > API**
5. Copy the following values:
   - **URL**: `https://tqrlhajnkfcchgzsqpjd.supabase.co`
   - **anon/public key**: Already provided above

### 3. Set Up Database Schema

Since this is a new project, you need to run the database migrations:

```bash
# Link to your new project
supabase link --project-ref tqrlhajnkfcchgzsqpjd

# Run all migrations
supabase db push
```

### 4. Restart Development Server

```bash
npm run dev
```

### 5. Test Signup Form

The signup form should now work properly and no longer freeze.

## Current Database Schema

Your project will have these tables set up after running migrations:
- `auth.users` (managed by Supabase Auth)
- `public.profiles` (user profiles with employee_id)
- `public.donations` (donation records)
- `public.bread_prices` (bread pricing data)
- `public.sales_periods` (sales period management)
- `public.stores` (store locations)
- `public.daily_donation_log` (daily tracking)
- `public.daily_donation_summary` (daily summaries)
- `public.daily_credits` (credit calculations)
- `public.user_favorites` (user preferences)

## Troubleshooting

### Form Still Freezing?
- Check browser console for error messages
- Verify environment variables are loaded (check browser dev tools > Application > Local Storage)
- Ensure Supabase project has the correct database schema

### "Failed to create user profile" Error?
- Check that RLS (Row Level Security) policies are configured
- Verify the `profiles` table exists and has the correct structure
- Check Supabase dashboard logs for detailed error messages

### Need Help?
- Check the browser console for detailed error logs
- Verify your Supabase project is active (not paused)
- Ensure your database migrations have been applied

## Security Note

- Never commit `.env.local` to version control
- The `.env.local` file is already in `.gitignore`
- Only share environment variables securely with team members 