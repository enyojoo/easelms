-- Add url_name column to workspaces table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'url_name') THEN
        ALTER TABLE workspaces
        ADD COLUMN url_name TEXT UNIQUE;
    END IF;
END $$;

-- Update existing workspaces to set url_name
UPDATE workspaces
SET url_name = LOWER(name)
WHERE url_name IS NULL;

-- Update the is_workspace_name_available function
CREATE OR REPLACE FUNCTION is_workspace_name_available(workspace_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM workspaces WHERE LOWER(name) = LOWER(workspace_name)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the create_workspace_and_update_user function
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
    UPDATE users
    SET workspace_id = new_workspace_id, role = 'instructor'
    WHERE id = user_id;

    RETURN jsonb_build_object(
        'id', new_workspace_id,
        'name', workspace_name,
        'url_name', lowercase_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS is enabled on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Update or create policies for workspaces table
DO $$ 
BEGIN 
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Workspaces are viewable by everyone" ON workspaces;
    DROP POLICY IF EXISTS "Workspace can only be created by authenticated users" ON workspaces;
    DROP POLICY IF EXISTS "Workspace can only be updated by owner" ON workspaces;

    -- Create new policies
    CREATE POLICY "Workspaces are viewable by everyone" 
    ON workspaces FOR SELECT USING (true);

    CREATE POLICY "Workspace can only be created by authenticated users" 
    ON workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    CREATE POLICY "Workspace can only be updated by owner" 
    ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
END $$;

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update or create policies for users table
DO $$ 
BEGIN 
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own data" ON users;
    DROP POLICY IF EXISTS "Users can update their own data" ON users;

    -- Create new policies
    CREATE POLICY "Users can view their own data"
    ON users FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE USING (auth.uid() = id);
END $$;

