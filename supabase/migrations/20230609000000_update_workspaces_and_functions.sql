-- Ensure the workspaces table has the correct structure
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url_name TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if the trigger exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspaces_timestamp') THEN
    CREATE TRIGGER update_workspaces_timestamp
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_timestamp();
  END IF;
END $$;

-- Enable Row Level Security on the workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for the workspaces table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspaces are viewable by everyone') THEN
    CREATE POLICY "Workspaces are viewable by everyone" 
    ON workspaces FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can insert their own workspace') THEN
    CREATE POLICY "Users can insert their own workspace" 
    ON workspaces FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can update their own workspace') THEN
    CREATE POLICY "Users can update their own workspace" 
    ON workspaces FOR UPDATE 
    USING (auth.uid() = owner_id);
  END IF;
END $$;

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

-- Function to check if a workspace name is available
CREATE OR REPLACE FUNCTION is_workspace_name_available(workspace_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM workspaces WHERE LOWER(name) = LOWER(workspace_name)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

