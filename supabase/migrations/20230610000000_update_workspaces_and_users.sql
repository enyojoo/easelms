-- Add role column to auth.users table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE auth.users ADD COLUMN role TEXT CHECK (role IN ('admin', 'instructor', 'learner'));
  END IF;
END $$;

-- Add workspace_id column to auth.users table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'workspace_id') THEN
    ALTER TABLE auth.users ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
  END IF;
END $$;

-- Ensure workspaces table has necessary columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'slug') THEN
    ALTER TABLE workspaces ADD COLUMN slug TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'created_at') THEN
    ALTER TABLE workspaces ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'updated_at') THEN
    ALTER TABLE workspaces ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
  END IF;
END $$;

-- Create or replace function to automatically create a personal workspace for new users
CREATE OR REPLACE FUNCTION create_personal_workspace()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Create a personal workspace for the new user if they don't have one
  IF NEW.workspace_id IS NULL THEN
    INSERT INTO workspaces (name, slug)
    VALUES (NEW.email || '''s Workspace', NEW.id)
    RETURNING id INTO workspace_id;

    -- Update the user's workspace_id and role
    NEW.workspace_id := workspace_id;
    NEW.role := 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_personal_workspace();

-- Enable Row Level Security (RLS) on the workspaces table if not already enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Create or replace policies for workspaces table
CREATE OR REPLACE POLICY "Users can view their own workspace" ON workspaces
  FOR SELECT USING (id = auth.uid());

CREATE OR REPLACE POLICY "Admins can update their workspaces" ON workspaces
  FOR UPDATE USING (id = auth.uid() AND EXISTS (SELECT 1 FROM auth.users WHERE users.workspace_id = workspaces.id AND users.role = 'admin'));

-- Create or replace function to handle user role changes
CREATE OR REPLACE FUNCTION handle_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role != OLD.role THEN
    -- Perform any necessary actions when a user's role changes
    -- For example, you might want to log this change or update other related data
    INSERT INTO role_change_logs (user_id, old_role, new_role)
    VALUES (NEW.id, OLD.role, NEW.role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger for user role changes
DROP TRIGGER IF EXISTS on_user_role_change ON auth.users;
CREATE TRIGGER on_user_role_change
  AFTER UPDATE OF role ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_role_change();

-- Create role_change_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_change_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  old_role TEXT,
  new_role TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

