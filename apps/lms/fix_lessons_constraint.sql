-- Add foreign key constraint to lessons table if it doesn't exist
-- This links lessons to courses with CASCADE delete

-- First, check if the constraint already exists and drop it if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'lessons_course_id_fkey'
    ) THEN
        ALTER TABLE public.lessons 
        DROP CONSTRAINT lessons_course_id_fkey;
    END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.lessons
ADD CONSTRAINT lessons_course_id_fkey 
FOREIGN KEY (course_id) 
REFERENCES public.courses (id) 
ON DELETE CASCADE;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_lessons_course_id 
ON public.lessons (course_id);

