-- Add signature_name column to courses table
-- This stores the name of the person signing the certificate

-- Check if column exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'courses' 
    AND column_name = 'signature_name'
  ) THEN
    ALTER TABLE public.courses 
    ADD COLUMN signature_name TEXT NULL;
    
    COMMENT ON COLUMN public.courses.signature_name IS 'Name of the person signing the certificate';
  END IF;
END $$;
