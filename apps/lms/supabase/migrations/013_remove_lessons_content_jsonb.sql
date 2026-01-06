-- Remove JSONB content column from lessons table
-- All lesson data is now stored in normalized columns:
-- - video_url (for video URLs)
-- - text_content (for text/HTML content)
-- - estimated_duration (for duration)
-- - quiz_questions table (for quiz questions)
-- - lesson_resources table (for resources)

DO $$ 
BEGIN
    -- First, ensure all data has been migrated to normalized columns
    -- Set content to NULL for all lessons (data should already be in normalized columns)
    UPDATE public.lessons
    SET content = NULL
    WHERE content IS NOT NULL;
    
    -- Add comment to mark column as deprecated (don't drop yet for safety)
    COMMENT ON COLUMN public.lessons.content IS 'DEPRECATED: This JSONB column is no longer used. All data is stored in normalized columns (video_url, text_content, estimated_duration) and normalized tables (quiz_questions, lesson_resources). Set to NULL for all rows.';
    
    -- Optional: Drop the column entirely (uncomment if you're sure no code references it)
    -- ALTER TABLE public.lessons DROP COLUMN IF EXISTS content;
    
    RAISE NOTICE 'Successfully deprecated content JSONB column in lessons table';
END $$;
