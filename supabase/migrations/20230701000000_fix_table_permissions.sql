-- Enable Row Level Security for users and workspaces tables if not already enabled
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;

-- Check if the policy exists for users table before creating it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'users'
        AND policyname = 'Users can view their own data'
    ) THEN
        CREATE POLICY "Users can view their own data" ON public.users
        FOR SELECT USING (auth.uid() = id);
    END IF;
END
$$;

-- Check if the policy exists for workspaces table before creating it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'workspaces'
        AND policyname = 'Users can view workspaces they own'
    ) THEN
        CREATE POLICY "Users can view workspaces they own" ON public.workspaces
        FOR SELECT USING (auth.uid() = owner_id);
    END IF;
END
$$;

-- Grant necessary permissions to authenticated users if not already granted
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.role_table_grants
        WHERE grantee = 'authenticated'
        AND table_name = 'users'
        AND privilege_type = 'SELECT'
    ) THEN
        GRANT SELECT ON public.users TO authenticated;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.role_table_grants
        WHERE grantee = 'authenticated'
        AND table_name = 'workspaces'
        AND privilege_type = 'SELECT'
    ) THEN
        GRANT SELECT ON public.workspaces TO authenticated;
    END IF;
END
$$;

