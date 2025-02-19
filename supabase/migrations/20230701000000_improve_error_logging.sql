-- Improve error logging in handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  BEGIN
    -- Insert the user into the public.users table
    INSERT INTO public.users (id, full_name, email, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      CASE
        WHEN (NEW.raw_user_meta_data->>'is_workspace_owner')::boolean THEN 'owner'
        ELSE 'learner'
      END
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error inserting user into public.users: %', SQLERRM;
    RETURN NULL;
  END;

  -- If the user is a workspace owner, create a new workspace
  IF (NEW.raw_user_meta_data->>'is_workspace_owner')::boolean THEN
    BEGIN
      INSERT INTO public.workspaces (name, subdomain, owner_id)
      VALUES (
        NEW.raw_user_meta_data->>'workspace_name',
        lower(regexp_replace(NEW.raw_user_meta_data->>'workspace_name', '\s+', '-', 'g')),
        NEW.id
      )
      RETURNING id INTO workspace_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error creating workspace: %', SQLERRM;
      RETURN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

