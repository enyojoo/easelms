-- Fix role assignment in handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'is_workspace_owner' = 'true' THEN
    -- Create a new workspace
    INSERT INTO public.workspaces (name, subdomain, owner_id)
    VALUES (
      NEW.raw_user_meta_data->>'workspace_name',
      lower(regexp_replace(NEW.raw_user_meta_data->>'workspace_name', '\s+', '-', 'g')),
      NEW.id
    );

    -- Insert the user as an owner
    INSERT INTO public.users (id, full_name, email, role, workspace_id)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'owner',
      (SELECT id FROM public.workspaces WHERE owner_id = NEW.id)
    );
  ELSE
    -- Insert the user as a learner (for [workspace]/signup)
    INSERT INTO public.users (id, full_name, email, role, workspace_id)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'learner',
      (SELECT id FROM public.workspaces WHERE subdomain = NEW.raw_user_meta_data->>'workspace_subdomain')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reapply the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing users with incorrect roles
UPDATE public.users
SET role = 'owner'
WHERE id IN (SELECT owner_id FROM public.workspaces);

