-- Create course_prerequisites table for managing course prerequisites
-- This allows courses to require completion of other courses before enrollment

CREATE TABLE IF NOT EXISTS public.course_prerequisites (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate prerequisites
  UNIQUE(course_id, prerequisite_course_id),
  
  -- Prevent self-dependency (course cannot require itself)
  CHECK(course_id != prerequisite_course_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course_id ON public.course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite_id ON public.course_prerequisites(prerequisite_course_id);

-- Add comment
COMMENT ON TABLE public.course_prerequisites IS 'Junction table for course prerequisites. Links courses to their required prerequisite courses.';

-- Enable Row Level Security
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read prerequisites
-- Learners need to see prerequisites on course pages
CREATE POLICY "Allow authenticated users to read prerequisites"
  ON public.course_prerequisites
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow admins and instructors to insert prerequisites
-- Only course creators/admins can set prerequisites
CREATE POLICY "Allow admins and instructors to insert prerequisites"
  ON public.course_prerequisites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_prerequisites.course_id
      AND courses.created_by = auth.uid()
    )
  );

-- Policy: Allow admins and instructors to update prerequisites
-- Only course creators/admins can modify prerequisites
CREATE POLICY "Allow admins and instructors to update prerequisites"
  ON public.course_prerequisites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_prerequisites.course_id
      AND courses.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_prerequisites.course_id
      AND courses.created_by = auth.uid()
    )
  );

-- Policy: Allow admins and instructors to delete prerequisites
-- Only course creators/admins can remove prerequisites
CREATE POLICY "Allow admins and instructors to delete prerequisites"
  ON public.course_prerequisites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_prerequisites.course_id
      AND courses.created_by = auth.uid()
    )
  );
