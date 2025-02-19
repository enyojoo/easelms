-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Update users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id),
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('instructor', 'learner')) NOT NULL DEFAULT 'learner';

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Workspaces are viewable by everyone" 
  ON workspaces FOR SELECT USING (true);

CREATE POLICY "Workspace can only be created by authenticated users" 
  ON workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Workspace can only be updated by owner" 
  ON workspaces FOR UPDATE USING (auth.uid() = owner_id);

-- Update user policies
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE USING (auth.uid() = id);

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

