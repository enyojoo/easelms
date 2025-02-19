-- Function to check if a workspace name is available
CREATE OR REPLACE FUNCTION is_workspace_name_available(workspace_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM workspaces WHERE LOWER(name) = LOWER(workspace_name)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new workspace and update user
CREATE OR REPLACE FUNCTION create_workspace_and_update_user(
    workspace_name TEXT,
    user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    new_workspace_id UUID;
    lowercase_name TEXT;
BEGIN
    -- Convert workspace name to lowercase for URL
    lowercase_name := LOWER(workspace_name);

    -- Create new workspace
    INSERT INTO workspaces (name, url_name, owner_id)
    VALUES (workspace_name, lowercase_name, user_id)
    RETURNING id INTO new_workspace_id;

    -- Update user
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::JSONB) || 
        jsonb_build_object('workspace_id', new_workspace_id, 'role', 'instructor')
    WHERE id = user_id;

    RETURN jsonb_build_object(
        'id', new_workspace_id,
        'name', workspace_name,
        'url_name', lowercase_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the workspaces table exists
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url_name TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Check if policies exist before creating them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'workspaces' AND policyname = 'Workspaces are viewable by everyone'
    ) THEN
        CREATE POLICY "Workspaces are viewable by everyone"
        ON workspaces FOR SELECT
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'workspaces' AND policyname = 'Users can insert their own workspace'
    ) THEN
        CREATE POLICY "Users can insert their own workspace"
        ON workspaces FOR INSERT
        WITH CHECK (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'workspaces' AND policyname = 'Users can update their own workspace'
    ) THEN
        CREATE POLICY "Users can update their own workspace"
        ON workspaces FOR UPDATE
        USING (auth.uid() = owner_id);
    END IF;
END $$;

