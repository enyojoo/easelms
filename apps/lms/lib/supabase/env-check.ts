/**
 * Environment variable checker for Supabase
 * Provides helpful error messages if variables are missing
 */

export function checkSupabaseEnv(): { valid: boolean; message?: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return {
      valid: false,
      message: `
Missing Supabase environment variables!

Please add the following to your .env.local file:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

You can find these values in your Supabase dashboard:
https://supabase.com/dashboard/project/_/settings/api

After adding the variables, restart your development server.
      `.trim(),
    }
  }

  if (url === 'your_supabase_project_url' || key === 'your_supabase_anon_key') {
    return {
      valid: false,
      message: `
Please replace the placeholder values in your .env.local file with your actual Supabase credentials.

Current values appear to be placeholders.
      `.trim(),
    }
  }

  return { valid: true }
}

