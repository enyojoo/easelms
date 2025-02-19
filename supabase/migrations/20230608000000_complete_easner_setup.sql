-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the workspaces table exists with the correct structure
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url_name TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to workspaces table
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

-- Function to get user's workspace
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
  WHERE w.owner_id = user_id;

  RETURN workspace_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle password reset request
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

-- Add a trigger to update the 'updated_at' column in the workspaces table
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_timestamp
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION update_workspace_timestamp();

-- Ensure RLS is enabled on auth.users table
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Add policies for auth.users table
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE tablename = 'users' AND schemaname = 'auth' AND policyname = 'Users can view and update their own data'
  ) THEN
      CREATE POLICY "Users can view and update their own data"
      ON auth.users
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

