-- Create workspaces table if it doesn't exist
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Update users table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'workspace_id') THEN
        ALTER TABLE users ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT CHECK (role IN ('instructor', 'learner')) NOT NULL DEFAULT 'learner';
    END IF;
END $$;

-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace policies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspaces are viewable by everyone') THEN
        CREATE POLICY "Workspaces are viewable by everyone" 
        ON workspaces FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspace can only be created by authenticated users') THEN
        CREATE POLICY "Workspace can only be created by authenticated users" 
        ON workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspace can only be updated by owner') THEN
        CREATE POLICY "Workspace can only be updated by owner" 
        ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
    END IF;
END $$;

-- Update user policies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view their own data') THEN
        CREATE POLICY "Users can view their own data"
        ON users FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update their own data') THEN
        CREATE POLICY "Users can update their own data"
        ON users FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Function to check if a workspace name is available
CREATE OR REPLACE FUNCTION is_workspace_name_available(workspace_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM workspaces WHERE name = workspace_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new workspace and update user
CREATE OR REPLACE FUNCTION create_workspace_and_update_user(
    workspace_name TEXT,
    user_id UUID
)
RETURNS UUID AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Create new workspace
    INSERT INTO workspaces (name, owner_id)
    VALUES (workspace_name, user_id)
    RETURNING id INTO new_workspace_id;

    -- Update user
    UPDATE users
    SET workspace_id = new_workspace_id, role = 'instructor'
    WHERE id = user_id;

    RETURN new_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

