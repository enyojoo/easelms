-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id UUID;
BEGIN
    -- Insert the user into the public.users table
    INSERT INTO public.users (id, full_name, email, is_instructor)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, COALESCE((NEW.raw_user_meta_data->>'is_workspace_owner')::boolean, false));

    -- If the user is a workspace owner, create a new workspace
    IF (NEW.raw_user_meta_data->>'is_workspace_owner')::boolean THEN
        INSERT INTO public.workspaces (name, subdomain, owner_id)
        VALUES (
            NEW.raw_user_meta_data->>'workspace_name',
            lower(regexp_replace(NEW.raw_user_meta_data->>'workspace_name', '\s+', '-', 'g')),
            NEW.id
        )
        RETURNING id INTO workspace_id;

        -- Update the user's workspace_id
        UPDATE public.users
        SET workspace_id = workspace_id
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is enabled on the users and workspaces tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Workspace owners can view their workspace" ON public.workspaces;

-- Create policies
CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Workspace owners can view their workspace"
ON public.workspaces FOR SELECT
USING (auth.uid() = owner_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.workspaces TO authenticated;

-- Ensure the auth.users table has the required column
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB;

