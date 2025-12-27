-- Create quiz_results table for storing user quiz submissions
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  quiz_question_id TEXT NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_course_id ON public.quiz_results(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_lesson_id ON public.quiz_results(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_course ON public.quiz_results(user_id, course_id);

-- Enable RLS
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to see their own quiz results
CREATE POLICY "Users can view their own quiz results"
  ON public.quiz_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy to allow users to insert their own quiz results
CREATE POLICY "Users can insert their own quiz results"
  ON public.quiz_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for service role to access all quiz results
CREATE POLICY "Service role can access all quiz results"
  ON public.quiz_results
  USING (true)
  WITH CHECK (true);

