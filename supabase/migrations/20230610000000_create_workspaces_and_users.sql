-- Create workspaces table
CREATE TABLE workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workspace_users table
CREATE TABLE workspace_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'instructor', 'learner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Create function to automatically create a personal workspace for new users
CREATE OR REPLACE FUNCTION create_personal_workspace()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Create a personal workspace for the new user
  INSERT INTO workspaces (name, slug)
  VALUES (NEW.email || '''s Workspace', NEW.id)
  RETURNING id INTO workspace_id;

  -- Add the user to their personal workspace as an admin
  INSERT INTO workspace_users (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_personal_workspace();

-- Enable Row Level Security (RLS) on the tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;

-- Create policies for workspaces table
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_users.workspace_id = workspaces.id
      AND workspace_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their workspaces" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_users.workspace_id = workspaces.id
      AND workspace_users.user_id = auth.uid()
      AND workspace_users.role = 'admin'
    )
  );

-- Create policies for workspace_users table
CREATE POLICY "Users can view members of their workspaces" ON workspace_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_users AS wu
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workspace users" ON workspace_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_users AS wu
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id = auth.uid()
      AND wu.role = 'admin'
    )
  );

