-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Workspace owners can view their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their own workspace" ON public.workspaces;

-- Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Insert the user into the public.users table
  INSERT INTO public.users (id, full_name, email, is_instructor)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, COALESCE((NEW.raw_user_meta_data->>'is_workspace_owner')::boolean, false));

  -- If the user is a workspace owner, create a new workspace
  IF (NEW.raw_user_meta_data->>'is_workspace_owner')::boolean THEN
    INSERT INTO public.workspaces (name, subdomain, owner_id)
    VALUES (
      NEW.raw_user_meta_data->>'workspace_name',
      LOWER(REPLACE(NEW.raw_user_meta_data->>'workspace_name', ' ', '-')),
      NEW.id
    )
    RETURNING id INTO workspace_id;

    -- Update the user's workspace_id
    UPDATE public.users
    SET workspace_id = workspace_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable RLS on the users and workspaces tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for the users table
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for the workspaces table
CREATE POLICY "Workspace owners can view their own workspace" ON public.workspaces
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update their own workspace" ON public.workspaces
  FOR UPDATE USING (auth.uid() = owner_id);

-- Ensure the auth.users table has the necessary columns
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB;

