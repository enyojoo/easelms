-- Create lesson_resources junction table for linking resources to lessons
-- This allows multiple resources to be attached to a lesson with ordering

CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate resource assignments to the same lesson
  UNIQUE(lesson_id, resource_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_id ON public.lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_resource_id ON public.lesson_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_order_index ON public.lesson_resources(lesson_id, order_index);

-- Add comment
COMMENT ON TABLE public.lesson_resources IS 'Junction table linking lessons to resources. Allows multiple resources per lesson with ordering.';

-- Enable Row Level Security
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read lesson-resource links
-- Learners need to see resources attached to lessons
CREATE POLICY "Allow authenticated users to read lesson_resources"
  ON public.lesson_resources
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow admins and instructors to manage lesson-resource links
CREATE POLICY "Allow admins and instructors to manage lesson_resources"
  ON public.lesson_resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
  );
