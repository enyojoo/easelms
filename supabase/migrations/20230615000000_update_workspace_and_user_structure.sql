-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Instructors can view users in their workspace" ON public.users;
DROP POLICY IF EXISTS "Users can view their own workspace roles" ON public.workspace_users;
DROP POLICY IF EXISTS "Instructors can manage workspace users" ON public.workspace_users;

-- Update auth.users table
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_instructor BOOLEAN DEFAULT false;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Update public.workspaces table
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_instructor BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- Create a function to handle new workspace owner signup
CREATE OR REPLACE FUNCTION public.handle_new_workspace_owner()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id UUID;
    workspace_subdomain TEXT;
BEGIN
    -- Set is_instructor to true for workspace owners
    NEW.is_instructor := true;
    
    -- Generate a subdomain from the workspace name
    workspace_subdomain := lower(regexp_replace(NEW.raw_user_meta_data->>'workspace_name', '[^a-zA-Z0-9]+', '-', 'g'));
    
    -- Ensure subdomain uniqueness
    WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE subdomain = workspace_subdomain) LOOP
        workspace_subdomain := workspace_subdomain || '-' || substr(md5(random()::text), 1, 4);
    END LOOP;

    -- Create a new workspace for the owner
    INSERT INTO public.workspaces (name, subdomain, owner_id)
    VALUES (NEW.raw_user_meta_data->>'workspace_name', workspace_subdomain, NEW.id)
    RETURNING id INTO workspace_id;

    -- Update the workspace_id in auth.users
    NEW.workspace_id := workspace_id;

    -- Create a record in public.users
    INSERT INTO public.users (id, full_name, workspace_id, is_instructor)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', workspace_id, true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for new workspace owner signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_workspace_owner_signup
BEFORE INSERT ON auth.users
FOR EACH ROW
WHEN (NEW.raw_user_meta_data->>'is_workspace_owner' = 'true')
EXECUTE FUNCTION public.handle_new_workspace_owner();

-- Create a function to handle new learner signup
CREATE OR REPLACE FUNCTION public.handle_new_learner()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id UUID;
BEGIN
    -- Find the workspace ID based on the subdomain
    SELECT id INTO workspace_id FROM public.workspaces WHERE subdomain = NEW.raw_user_meta_data->>'workspace_subdomain';

    -- Set the workspace_id for the new user
    NEW.workspace_id := workspace_id;

    -- Create a record in public.users
    INSERT INTO public.users (id, full_name, workspace_id, is_instructor)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', workspace_id, false);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for new learner signup
CREATE TRIGGER on_learner_signup
BEFORE INSERT ON auth.users
FOR EACH ROW
WHEN (NEW.raw_user_meta_data->>'is_learner' = 'true')
EXECUTE FUNCTION public.handle_new_learner();

-- Function to invite an instructor to a workspace
CREATE OR REPLACE FUNCTION public.invite_instructor_to_workspace(
    p_email TEXT,
    p_full_name TEXT,
    p_workspace_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Create the user in auth.users
    INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data, is_instructor, workspace_id)
    VALUES (p_email, now(), jsonb_build_object('full_name', p_full_name, 'is_instructor', true), true, p_workspace_id)
    RETURNING id INTO v_user_id;

    -- Create the user in public.users
    INSERT INTO public.users (id, full_name, workspace_id, is_instructor)
    VALUES (v_user_id, p_full_name, p_workspace_id, true);

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for public.workspaces
CREATE POLICY "Workspace owners and instructors can view their workspace" ON public.workspaces
FOR SELECT USING (auth.uid() = owner_id OR auth.uid() IN (
    SELECT id FROM auth.users WHERE workspace_id = public.workspaces.id AND is_instructor = true
));

-- Policies for public.users
CREATE POLICY "Users can view their own data" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Workspace owners and instructors can view users in their workspace" ON public.users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = public.users.workspace_id
        AND (owner_id = auth.uid() OR auth.uid() IN (
            SELECT id FROM auth.users WHERE workspace_id = public.workspaces.id AND is_instructor = true
        ))
    )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

