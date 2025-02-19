-- Drop the existing foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Update the workspace_users table if it exists
ALTER TABLE IF EXISTS public.workspace_users
DROP CONSTRAINT IF EXISTS workspace_users_user_id_fkey;

ALTER TABLE IF EXISTS public.workspace_users
ADD CONSTRAINT workspace_users_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Update any other tables that reference auth.users
-- For example, if you have a courses table with an instructor_id column:
ALTER TABLE IF EXISTS public.courses
DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;

ALTER TABLE IF EXISTS public.courses
ADD CONSTRAINT courses_instructor_id_fkey
FOREIGN KEY (instructor_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Create a function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete the user from public.users
    DELETE FROM public.users WHERE id = OLD.id;
    
    -- If the user is a workspace owner, delete the workspace
    DELETE FROM public.workspaces WHERE owner_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_deletion();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

