-- Enhanced quiz_questions table to support all question types
-- This migration creates/enhances the quiz_questions table

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS public.quiz_questions CASCADE;

-- Create enhanced quiz_questions table
CREATE TABLE public.quiz_questions (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL,
  question_type VARCHAR(50) NOT NULL DEFAULT 'multiple-choice',
  question_text TEXT NOT NULL,
  
  -- Store all question data in JSONB to support different types
  -- This includes: options, correctOption, correctAnswer, correctAnswers, correctKeywords, etc.
  question_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Common fields
  points INTEGER DEFAULT 1,
  explanation TEXT,
  difficulty VARCHAR(20),
  time_limit INTEGER,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT quiz_questions_lesson_id_fkey 
    FOREIGN KEY (lesson_id) 
    REFERENCES public.lessons(id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson_id 
  ON public.quiz_questions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_order 
  ON public.quiz_questions(lesson_id, order_index);

-- Update quiz_results table to use integer foreign key
-- First, add a new column for integer quiz_question_id
ALTER TABLE public.quiz_results 
  ADD COLUMN IF NOT EXISTS quiz_question_id_new INTEGER;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_quiz_results_question_id_new 
  ON public.quiz_results(quiz_question_id_new);

-- Add foreign key constraint (will be enabled after migration)
-- ALTER TABLE public.quiz_results
--   ADD CONSTRAINT quiz_results_question_id_fkey
--   FOREIGN KEY (quiz_question_id_new)
--   REFERENCES public.quiz_questions(id)
--   ON DELETE CASCADE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_questions_updated_at();
