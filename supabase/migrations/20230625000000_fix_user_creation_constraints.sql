-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Insert the user into the public.users table
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  -- Check if the user is a workspace owner
  IF (NEW.raw_user_meta_data->>'is_workspace_owner')::boolean THEN
    -- Create a new workspace
    INSERT INTO public.workspaces (name, subdomain, owner_id)
    VALUES (
      NEW.raw_user_meta_data->>'workspace_name',
      lower(regexp_replace(NEW.raw_user_meta_data->>'workspace_name', '\s+', '-', 'g')),
      NEW.id
    )
    RETURNING id INTO workspace_id;

    -- Update the user's workspace_id
    UPDATE public.users
    SET workspace_id = workspace_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the auth.users table has the necessary column
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB;

-- Remove the foreign key constraint from public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Add a new constraint that doesn't enforce referential integrity
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- Update RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.workspaces TO authenticated;

