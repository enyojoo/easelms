-- Ensure auth.users table has the necessary columns
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_app_meta_data JSONB;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB;

-- Ensure public.users table has the necessary columns
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  workspace_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure public.workspaces table exists
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url_name TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure public.workspace_users table exists
CREATE TABLE IF NOT EXISTS public.workspace_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner', 'instructor', 'learner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
  workspace_url_name TEXT;
BEGIN
  -- Generate a URL-friendly version of the user's name
  workspace_url_name := lower(regexp_replace(NEW.raw_user_meta_data->>'full_name', '[^a-zA-Z0-9]+', '-', 'g'));
  
  -- Ensure uniqueness by appending a random string if necessary
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE url_name = workspace_url_name) LOOP
    workspace_url_name := workspace_url_name || '-' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- Create a new workspace for the user
  INSERT INTO public.workspaces (name, url_name, owner_id)
  VALUES (NEW.raw_user_meta_data->>'full_name' || '''s Workspace', workspace_url_name, NEW.id)
  RETURNING id INTO workspace_id;

  -- Create a record in public.users
  INSERT INTO public.users (id, full_name, workspace_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', workspace_id);

  -- Add user to workspace_users as owner
  INSERT INTO public.workspace_users (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

