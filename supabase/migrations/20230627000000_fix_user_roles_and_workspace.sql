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

-- Remove the url_name column from the workspaces table
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS url_name;

-- Update the workspaces table to ensure subdomain is unique
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_subdomain_key UNIQUE (subdomain);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.workspaces TO authenticated;

-- Update RLS policies for workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE POLICY "Owners can view their own workspace"
ON public.workspaces FOR SELECT
USING (auth.uid() = owner_id);

CREATE OR REPLACE POLICY "Instructors can view their workspace"
ON public.workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.workspace_id = workspaces.id
    AND users.role = 'instructor'
  )
);

CREATE OR REPLACE POLICY "Learners can view their workspace"
ON public.workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.workspace_id = workspaces.id
    AND users.role = 'learner'
  )
);

