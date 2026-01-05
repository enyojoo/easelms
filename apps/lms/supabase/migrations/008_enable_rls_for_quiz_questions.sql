-- Migration: Enable RLS and create policies for quiz_questions table

-- Enable RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and instructors can manage quiz questions
CREATE POLICY "Admins and instructors can manage quiz_questions"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type IN ('admin', 'instructor')
  )
);

-- Policy: Learners can read quiz questions for lessons in courses they're enrolled in
CREATE POLICY "Learners can read quiz_questions for enrolled courses"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    INNER JOIN public.courses ON courses.id = lessons.course_id
    INNER JOIN public.enrollments ON enrollments.course_id = courses.id
    WHERE lessons.id = quiz_questions.lesson_id
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
COMMENT ON POLICY "Admins and instructors can manage quiz_questions" ON public.quiz_questions IS 'Allows admins and instructors full access to quiz_questions';
COMMENT ON POLICY "Learners can read quiz_questions for enrolled courses" ON public.quiz_questions IS 'Allows learners to read quiz_questions for courses they are enrolled in';
