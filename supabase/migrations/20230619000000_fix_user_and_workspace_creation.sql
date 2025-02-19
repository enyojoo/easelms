-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_workspace_for_owner() CASCADE;

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user into the public.users table
  INSERT INTO public.users (id, full_name, email, is_instructor)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, COALESCE((NEW.raw_user_meta_data->>'is_instructor')::boolean, false));

  -- If the user is a workspace owner, create a workspace for them
  IF (NEW.raw_user_meta_data->>'is_workspace_owner')::boolean THEN
    INSERT INTO public.workspaces (name, subdomain, owner_id)
    VALUES (
      NEW.raw_user_meta_data->>'workspace_name',
      LOWER(REPLACE(NEW.raw_user_meta_data->>'workspace_name', ' ', '-')),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call handle_new_user() on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Update RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE POLICY "Users can view their own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE OR REPLACE POLICY "Workspace owners can view their workspace"
ON public.workspaces FOR SELECT
USING (auth.uid() = owner_id);

CREATE OR REPLACE POLICY "Workspace owners can update their workspace"
ON public.workspaces FOR UPDATE
USING (auth.uid() = owner_id);

