-- Migration: Enable RLS and create policies for new tables
-- Tables: lesson_resources, quiz_attempts, quiz_settings, resources

-- ============================================================================
-- LESSON_RESOURCES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and instructors can do everything
CREATE POLICY "Admins and instructors can manage lesson_resources"
ON public.lesson_resources
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
  )
);

-- Policy: Learners can read lesson_resources for lessons in courses they're enrolled in
CREATE POLICY "Learners can read lesson_resources for enrolled courses"
ON public.lesson_resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    INNER JOIN public.courses ON courses.id = lessons.course_id
    INNER JOIN public.enrollments ON enrollments.course_id = courses.id
    WHERE lessons.id = lesson_resources.lesson_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
  )
);

-- ============================================================================
-- QUIZ_ATTEMPTS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read and insert their own quiz attempts
CREATE POLICY "Users can manage their own quiz attempts"
ON public.quiz_attempts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Admins and instructors can read quiz attempts for courses they created
CREATE POLICY "Admins and instructors can read quiz attempts for their courses"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    INNER JOIN public.courses ON courses.created_by = profiles.id
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
    AND courses.id = quiz_attempts.course_id
  )
);

-- ============================================================================
-- QUIZ_SETTINGS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.quiz_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and instructors can manage quiz settings
CREATE POLICY "Admins and instructors can manage quiz_settings"
ON public.quiz_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
  )
);

-- Policy: Learners can read quiz settings for lessons in courses they're enrolled in
CREATE POLICY "Learners can read quiz_settings for enrolled courses"
ON public.quiz_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    INNER JOIN public.courses ON courses.id = lessons.course_id
    INNER JOIN public.enrollments ON enrollments.course_id = courses.id
    WHERE lessons.id = quiz_settings.lesson_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
  )
);

-- ============================================================================
-- RESOURCES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own resources
CREATE POLICY "Users can manage their own resources"
ON public.resources
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Policy: Admins and instructors can read all resources
CREATE POLICY "Admins and instructors can read all resources"
ON public.resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
  )
);

-- Policy: Learners can read resources for lessons in courses they're enrolled in
CREATE POLICY "Learners can read resources for enrolled courses"
ON public.resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lesson_resources
    INNER JOIN public.lessons ON lessons.id = lesson_resources.lesson_id
    INNER JOIN public.courses ON courses.id = lessons.course_id
    INNER JOIN public.enrollments ON enrollments.course_id = courses.id
    WHERE lesson_resources.resource_id = resources.id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
  )
);

-- Add comments for documentation
COMMENT ON POLICY "Admins and instructors can manage lesson_resources" ON public.lesson_resources IS 'Allows admins and instructors full access to lesson_resources';
COMMENT ON POLICY "Learners can read lesson_resources for enrolled courses" ON public.lesson_resources IS 'Allows learners to read lesson_resources for courses they are enrolled in';

COMMENT ON POLICY "Users can manage their own quiz attempts" ON public.quiz_attempts IS 'Allows users to create and read their own quiz attempts';
COMMENT ON POLICY "Admins and instructors can read quiz attempts for their courses" ON public.quiz_attempts IS 'Allows admins and instructors to read quiz attempts for courses they created';

COMMENT ON POLICY "Admins and instructors can manage quiz_settings" ON public.quiz_settings IS 'Allows admins and instructors full access to quiz_settings';
COMMENT ON POLICY "Learners can read quiz_settings for enrolled courses" ON public.quiz_settings IS 'Allows learners to read quiz_settings for courses they are enrolled in';

COMMENT ON POLICY "Users can manage their own resources" ON public.resources IS 'Allows users to create and manage resources they created';
COMMENT ON POLICY "Admins and instructors can read all resources" ON public.resources IS 'Allows admins and instructors to read all resources';
COMMENT ON POLICY "Learners can read resources for enrolled courses" ON public.resources IS 'Allows learners to read resources for courses they are enrolled in';
