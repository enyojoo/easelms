-- Migration: Create quiz_settings table
-- This migrates quiz settings from JSONB storage to normalized table

CREATE TABLE quiz_settings (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Settings
  enabled BOOLEAN NOT NULL DEFAULT false,
  shuffle_quiz BOOLEAN NOT NULL DEFAULT false,
  max_attempts INTEGER DEFAULT 3,
  show_correct_answers BOOLEAN NOT NULL DEFAULT true,
  allow_multiple_attempts BOOLEAN NOT NULL DEFAULT true,
  time_limit INTEGER, -- in seconds
  passing_score INTEGER, -- percentage (0-100)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT quiz_settings_lesson_unique UNIQUE(lesson_id)
);

CREATE INDEX idx_quiz_settings_lesson ON quiz_settings(lesson_id);
CREATE INDEX idx_quiz_settings_enabled ON quiz_settings(enabled);

-- Add comments for documentation
COMMENT ON TABLE quiz_settings IS 'Quiz settings for lessons, normalized from JSONB storage';
COMMENT ON COLUMN quiz_settings.time_limit IS 'Time limit in seconds (NULL = no limit)';
COMMENT ON COLUMN quiz_settings.passing_score IS 'Minimum score percentage required to pass (0-100)';
