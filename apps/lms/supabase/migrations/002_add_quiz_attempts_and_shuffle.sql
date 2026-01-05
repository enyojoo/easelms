-- Migration: Add quiz_attempts table and shuffle support to quiz_results
-- This enables question and answer shuffling per user attempt

-- Create quiz_attempts table to store shuffle mapping
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  
  -- Shuffle mapping: question_order stores original question IDs in shuffled sequence
  -- Example: [3, 1, 5, 2, 4] means question 3 is first, question 1 is second, etc.
  question_order INTEGER[] NOT NULL,
  
  -- Shuffle mapping: answer_orders stores shuffled option indices per question
  -- Example: {"3": [2,0,3,1], "1": [1,3,0,2]} means for question 3, option 2 is first, etc.
  answer_orders JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT quiz_attempts_unique UNIQUE(user_id, lesson_id, attempt_number)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_lesson ON public.quiz_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lookup ON public.quiz_attempts(user_id, lesson_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson ON public.quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON public.quiz_attempts(course_id);

-- Add shuffle-related columns to quiz_results table (denormalized for performance)
ALTER TABLE public.quiz_results 
  ADD COLUMN IF NOT EXISTS attempt_id INTEGER REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shuffled_question_order INTEGER[], -- Denormalized: question order for this result
  ADD COLUMN IF NOT EXISTS shuffled_answer_orders JSONB; -- Denormalized: answer orders for this result

-- Create index for attempt_id lookups
CREATE INDEX IF NOT EXISTS idx_quiz_results_attempt ON public.quiz_results(attempt_id);

-- Add comment for documentation
COMMENT ON TABLE public.quiz_attempts IS 'Stores shuffle mapping for each quiz attempt to preserve question and answer order';
COMMENT ON COLUMN public.quiz_attempts.question_order IS 'Array of question IDs in shuffled order';
COMMENT ON COLUMN public.quiz_attempts.answer_orders IS 'JSONB object mapping question IDs to shuffled option indices';
COMMENT ON COLUMN public.quiz_results.attempt_id IS 'Reference to quiz_attempts record for this result';
COMMENT ON COLUMN public.quiz_results.shuffled_question_order IS 'Denormalized question order for instant results display';
COMMENT ON COLUMN public.quiz_results.shuffled_answer_orders IS 'Denormalized answer orders for instant results display';
