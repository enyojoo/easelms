-- Add role column to auth.users if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE auth.users ADD COLUMN role TEXT CHECK (role IN ('owner', 'instructor', 'learner'));
  END IF;
END $$;

-- Ensure auth.users table has is_instructor column (for backwards compatibility)
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_instructor BOOLEAN DEFAULT false;

-- Create or update public.users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    workspace_id UUID
);

-- Create or update public.workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    url_name TEXT UNIQUE NOT NULL
);

-- Create workspace_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workspace_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    workspace_id UUID REFERENCES public.workspaces(id),
    role TEXT CHECK (role IN ('owner', 'instructor', 'learner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, workspace_id)
);

-- Add foreign key constraint between users and workspaces if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_workspace') THEN
    ALTER TABLE public.users
    ADD CONSTRAINT fk_workspace
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
    -- Drop policies for workspaces table
    DROP POLICY IF EXISTS "Workspace owners can do anything" ON public.workspaces;
    DROP POLICY IF EXISTS "Instructors can view and update workspaces" ON public.workspaces;
    DROP POLICY IF EXISTS "Users can view their own workspace" ON public.workspaces;
    
    -- Drop policies for users table
    DROP POLICY IF EXISTS "Users can view and update their own data" ON public.users;
    DROP POLICY IF EXISTS "Workspace owners and instructors can view all users in their workspace" ON public.users;
    
    -- Drop policies for workspace_users table
    DROP POLICY IF EXISTS "Users can view their own workspace roles" ON public.workspace_users;
    DROP POLICY IF EXISTS "Workspace owners can manage workspace users" ON public.workspace_users;
END $$;

-- Create policies for workspaces
CREATE POLICY "Workspace owners can do anything" ON public.workspaces
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Instructors can view and update workspaces" ON public.workspaces
    FOR SELECT
    USING (id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role = 'instructor'));

CREATE POLICY "Users can view their own workspace" ON public.workspaces
    FOR SELECT
    USING (id IN (SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()));

-- Create policies for users
CREATE POLICY "Users can view and update their own data" ON public.users
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Workspace owners and instructors can view all users in their workspace" ON public.users
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('owner', 'instructor')
        )
    );

-- Create policies for workspace_users
CREATE POLICY "Users can view their own workspace roles" ON public.workspace_users
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Workspace owners can manage workspace users" ON public.workspace_users
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
    );

-- Function to create a new workspace and set the creator as owner
CREATE OR REPLACE FUNCTION create_workspace_and_set_owner(
    p_workspace_name TEXT,
    p_url_name TEXT
)
RETURNS UUID AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- Create the workspace
    INSERT INTO public.workspaces (name, owner_id, url_name)
    VALUES (p_workspace_name, auth.uid(), p_url_name)
    RETURNING id INTO v_workspace_id;

    -- Set the user's role to 'owner' in the workspace_users table
    INSERT INTO public.workspace_users (user_id, workspace_id, role)
    VALUES (auth.uid(), v_workspace_id, 'owner');

    -- Update the user's workspace_id in the public.users table
    UPDATE public.users
    SET workspace_id = v_workspace_id
    WHERE id = auth.uid();

    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite a user to a workspace as an instructor
CREATE OR REPLACE FUNCTION invite_instructor_to_workspace(
    p_email TEXT,
    p_full_name TEXT,
    p_workspace_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Create the user in auth.users
    INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data, role)
    VALUES (p_email, now(), jsonb_build_object('full_name', p_full_name), 'instructor')
    RETURNING id INTO v_user_id;

    -- Create the user in public.users
    INSERT INTO public.users (id, full_name, workspace_id)
    VALUES (v_user_id, p_full_name, p_workspace_id);

    -- Add the user to the workspace_users table
    INSERT INTO public.workspace_users (user_id, workspace_id, role)
    VALUES (v_user_id, p_workspace_id, 'instructor');

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a learner in a specific workspace
CREATE OR REPLACE FUNCTION create_learner_in_workspace(
    p_full_name TEXT,
    p_email TEXT,
    p_workspace_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Create the user in auth.users
    INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data, role)
    VALUES (p_email, now(), jsonb_build_object('full_name', p_full_name), 'learner')
    RETURNING id INTO v_user_id;

    -- Create the user in public.users
    INSERT INTO public.users (id, full_name, workspace_id)
    VALUES (v_user_id, p_full_name, p_workspace_id);

    -- Add the user to the workspace_users table
    INSERT INTO public.workspace_users (user_id, workspace_id, role)
    VALUES (v_user_id, p_workspace_id, 'learner');

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

