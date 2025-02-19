-- Create functions for transaction handling
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
  -- Start a new transaction
  -- This is a no-op in Supabase because every RPC call is already in a transaction
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
  -- Commit the current transaction
  -- This is a no-op in Supabase because the transaction will be automatically committed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
  -- Rollback the current transaction
  RAISE EXCEPTION 'Transaction rolled back';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    workspace_id UUID;
BEGIN
    -- Check if the user is a workspace owner
    IF NEW.raw_user_meta_data->>'is_workspace_owner' = 'true' THEN
        -- Create a new workspace for the owner
        INSERT INTO public.workspaces (name, subdomain, owner_id)
        VALUES (
            NEW.raw_user_meta_data->>'workspace_name',
            lower(regexp_replace(NEW.raw_user_meta_data->>'workspace_name', '\s+', '-', 'g')),
            NEW.id
        )
        RETURNING id INTO workspace_id;

        -- Update the user's workspace_id
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('workspace_id', workspace_id)
        WHERE id = NEW.id;
    END IF;

    -- Insert the user into the public.users table
    INSERT INTO public.users (id, full_name, email, is_instructor, workspace_id)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'is_workspace_owner')::boolean, false),
        workspace_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.begin_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_transaction TO authenticated;

