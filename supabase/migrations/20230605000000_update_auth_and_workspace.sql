-- Add a function to handle password reset
CREATE OR REPLACE FUNCTION handle_password_reset_request(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if the user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = user_email) INTO user_exists;
  
  -- If the user exists, we'll assume the password reset email is sent
  -- In a real-world scenario, you'd integrate with your email service here
  IF user_exists THEN
    -- Log the password reset request (optional)
    INSERT INTO auth.password_reset_requests (email, requested_at)
    VALUES (user_email, now());
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the password_reset_requests table exists
CREATE TABLE IF NOT EXISTS auth.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Update the create_workspace_and_update_user function to handle instructor role
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

    -- Update user and set role to instructor
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

-- Add a function to get user's workspace
CREATE OR REPLACE FUNCTION get_user_workspace(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    workspace_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'url_name', w.url_name
    ) INTO workspace_data
    FROM workspaces w
    JOIN auth.users u ON u.raw_app_meta_data->>'workspace_id' = w.id::TEXT
    WHERE u.id = user_id;

    RETURN workspace_data;
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

