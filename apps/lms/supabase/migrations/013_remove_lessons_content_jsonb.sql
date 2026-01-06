-- Remove JSONB columns from tables
-- All data is now stored in normalized columns and tables

DO $$ 
BEGIN
    -- ============================================
    -- LESSONS TABLE: Remove content JSONB column
    -- ============================================
    -- All lesson data is now stored in normalized columns:
    -- - video_url (for video URLs)
    -- - text_content (for text/HTML content)
    -- - estimated_duration (for duration)
    -- - quiz_questions table (for quiz questions)
    -- - lesson_resources table (for resources)
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'content'
    ) THEN
        -- Set content to NULL for all lessons (data should already be in normalized columns)
        UPDATE public.lessons
        SET content = NULL
        WHERE content IS NOT NULL;
        
        -- Add comment to mark column as deprecated (don't drop yet for safety)
        COMMENT ON COLUMN public.lessons.content IS 'DEPRECATED: This JSONB column is no longer used. All data is stored in normalized columns (video_url, text_content, estimated_duration) and normalized tables (quiz_questions, lesson_resources). Set to NULL for all rows.';
        
        -- Optional: Drop the column entirely (uncomment if you're sure no code references it)
        -- ALTER TABLE public.lessons DROP COLUMN IF EXISTS content;
        
        RAISE NOTICE 'Successfully deprecated content JSONB column in lessons table';
    END IF;
    
    -- ============================================
    -- COURSES TABLE: Remove settings JSONB column (if exists)
    -- ============================================
    -- All course settings are now stored in dedicated columns:
    -- - enrollment_mode, price, recurring_price (enrollment settings)
    -- - certificate_enabled, certificate_template, certificate_title, etc. (certificate settings)
    -- - minimum_quiz_score, requires_sequential_progress (course settings)
    -- - course_prerequisites table (for prerequisites)
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'settings'
        AND data_type = 'jsonb'
    ) THEN
        -- Set settings to NULL for all courses (data should already be in normalized columns)
        UPDATE public.courses
        SET settings = NULL
        WHERE settings IS NOT NULL;
        
        -- Add comment to mark column as deprecated
        COMMENT ON COLUMN public.courses.settings IS 'DEPRECATED: This JSONB column is no longer used. All settings are stored in dedicated columns (enrollment_mode, price, certificate_enabled, etc.) and normalized tables (course_prerequisites). Set to NULL for all rows.';
        
        -- Optional: Drop the column entirely (uncomment if you're sure no code references it)
        -- ALTER TABLE public.courses DROP COLUMN IF EXISTS settings;
        
        RAISE NOTICE 'Successfully deprecated settings JSONB column in courses table';
    END IF;
    
END $$;
