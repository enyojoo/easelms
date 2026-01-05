-- Add dedicated columns to lessons table to eliminate content JSONB dependency
-- All lesson data should be stored in proper columns, not JSONB

DO $$ 
BEGIN
    -- Add video_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'video_url'
    ) THEN
        ALTER TABLE public.lessons 
        ADD COLUMN video_url TEXT NULL;
        
        -- Migrate existing video URLs from content JSONB to video_url column
        UPDATE public.lessons
        SET video_url = (content->>'url')
        WHERE content->>'url' IS NOT NULL 
        AND content->>'url' != ''
        AND video_url IS NULL;
        
        COMMENT ON COLUMN public.lessons.video_url IS 'S3 URL for lesson video file. Stored in dedicated column for better querying and data integrity.';
    END IF;

    -- Add text_content column if it doesn't exist (for text/html content)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'text_content'
    ) THEN
        ALTER TABLE public.lessons 
        ADD COLUMN text_content TEXT NULL;
        
        -- Migrate existing text/html content from content JSONB to text_content column
        UPDATE public.lessons
        SET text_content = COALESCE(content->>'html', content->>'text')
        WHERE (content->>'html' IS NOT NULL OR content->>'text' IS NOT NULL)
        AND text_content IS NULL;
        
        COMMENT ON COLUMN public.lessons.text_content IS 'HTML or text content for text-based and mixed lessons. Stored in dedicated column instead of JSONB.';
    END IF;

    -- Add estimated_duration column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'estimated_duration'
    ) THEN
        ALTER TABLE public.lessons 
        ADD COLUMN estimated_duration INTEGER NULL DEFAULT 0;
        
        -- Migrate existing estimatedDuration from content JSONB to estimated_duration column
        UPDATE public.lessons
        SET estimated_duration = COALESCE((content->>'estimatedDuration')::INTEGER, 0)
        WHERE content->>'estimatedDuration' IS NOT NULL
        AND estimated_duration IS NULL OR estimated_duration = 0;
        
        COMMENT ON COLUMN public.lessons.estimated_duration IS 'Estimated duration of lesson in minutes. Stored in dedicated column instead of JSONB.';
    END IF;
END $$;
