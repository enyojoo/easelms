-- Update the handle_new_user function to assign correct roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Insert the user into the public.users table
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN (NEW.raw_user_meta_data->>'is_workspace_owner')::boolean THEN 'owner'
      WHEN (NEW.raw_user_meta_data->>'is_instructor')::boolean THEN 'instructor'
      ELSE 'learner'
    END
  );

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

-- Remove the url_name column from the workspaces table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'url_name') THEN
    ALTER TABLE public.workspaces DROP COLUMN url_name;
  END IF;
END $$;

-- Add the unique constraint on subdomain if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_subdomain_key') THEN
    ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_subdomain_key UNIQUE (subdomain);
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.workspaces TO authenticated;

-- Update RLS policies for workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can view their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Instructors can view their workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Learners can view their workspace" ON public.workspaces;

-- Create new policies
CREATE POLICY "Owners can view their own workspace"
ON public.workspaces FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Instructors can view their workspace"
ON public.workspaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.workspace_id = workspaces.id
    AND users.role = 'instructor'
  )
);

CREATE POLICY "Learners can view their workspace"
ON public.workspaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.workspace_id = workspaces.id
    AND users.role = 'learner'
  )
);

-- Update RLS policies for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Owners can view users in their workspace" ON public.users;

-- Create new policies
CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Owners can view users in their workspace"
ON public.users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = users.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
);

