-- Update the foreign key constraint on the users table
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_workspace_id_fkey,
ADD CONSTRAINT users_workspace_id_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id)
    ON DELETE SET NULL;

-- Update the foreign key constraint on the workspace_users table
ALTER TABLE public.workspace_users
DROP CONSTRAINT IF EXISTS workspace_users_user_id_fkey,
ADD CONSTRAINT workspace_users_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- Create a function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete the user's owned workspaces
    DELETE FROM public.workspaces WHERE owner_id = OLD.id;
    
    -- Delete the user's record from public.users
    DELETE FROM public.users WHERE id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a user is deleted
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- Ensure cascading deletes for workspaces
ALTER TABLE public.workspace_users
DROP CONSTRAINT IF EXISTS workspace_users_workspace_id_fkey,
ADD CONSTRAINT workspace_users_workspace_id_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id)
    ON DELETE CASCADE;

-- You may need to add similar CASCADE constraints for other tables related to workspaces
-- For example, if you have a courses table:
-- ALTER TABLE public.courses
-- DROP CONSTRAINT IF EXISTS courses_workspace_id_fkey,
-- ADD CONSTRAINT courses_workspace_id_fkey
--     FOREIGN KEY (workspace_id)
--     REFERENCES public.workspaces(id)
--     ON DELETE CASCADE;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

