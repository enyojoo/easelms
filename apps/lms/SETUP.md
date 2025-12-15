# EaseLMS Setup Guide

## Environment Variables Setup

### Step 1: Create `.env.local` file

Create a file named `.env.local` in the `apps/lms/` directory with the following content:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AWS S3 Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET_NAME=your_s3_bucket_name
AWS_CLOUDFRONT_DOMAIN=your_cloudfront_domain

# Payment Gateways
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_WEBHOOK_SECRET=your_flutterwave_webhook_secret

# Email Service
RESEND_API_KEY=your_resend_api_key

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=your_posthog_host

# App URL (for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 3: Set Up Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Open the file `apps/lms/supabase/schema.sql`
3. Copy and paste the entire SQL into the SQL Editor
4. Click **Run** to execute the schema

### Step 4: Restart Development Server

After adding environment variables, **you must restart your development server**:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Important Notes

- **File Location**: The `.env.local` file must be in `apps/lms/` directory (same level as `package.json`)
- **Variable Names**: Must start with `NEXT_PUBLIC_` for client-side access
- **No Quotes**: Don't wrap values in quotes unless the value itself contains spaces
- **Restart Required**: Always restart the dev server after changing `.env.local`

### Troubleshooting

**Error: "Your project's URL and API key are required"**

1. Check that `.env.local` exists in `apps/lms/` directory
2. Verify variable names are exactly:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Make sure there are no extra spaces or quotes
4. Restart your development server
5. Check the console for detailed error messages

**Example `.env.local` file:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development Mode (Without Supabase)

If you want to develop without Supabase configured, the app will automatically fall back to cookie-based authentication. However, you'll need to configure Supabase for full functionality.

