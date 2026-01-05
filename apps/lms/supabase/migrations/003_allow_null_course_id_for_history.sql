-- Migration: Allow NULL course_id in payments and certificates for historical preservation
-- This ensures that course deletion doesn't fail due to foreign key constraints
-- while preserving financial records and certificates for audit/history purposes

-- Update payments table to allow NULL course_id
-- First, check if course_id column exists and update constraint if needed
DO $$
BEGIN
  -- Drop existing foreign key constraint if it exists and doesn't allow NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%payments_course_id%' 
    AND table_name = 'payments'
  ) THEN
    -- Drop the constraint (we'll recreate it with ON DELETE SET NULL)
    ALTER TABLE public.payments 
      DROP CONSTRAINT IF EXISTS payments_course_id_fkey;
  END IF;
  
  -- Make course_id nullable if it's not already
  ALTER TABLE public.payments 
    ALTER COLUMN course_id DROP NOT NULL;
    
  -- Recreate foreign key constraint with ON DELETE SET NULL
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_course_id_fkey 
    FOREIGN KEY (course_id) 
    REFERENCES public.courses(id) 
    ON DELETE SET NULL;
END $$;

-- Update certificates table to allow NULL course_id
DO $$
BEGIN
  -- Drop existing foreign key constraint if it exists and doesn't allow NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%certificates_course_id%' 
    AND table_name = 'certificates'
  ) THEN
    -- Drop the constraint (we'll recreate it with ON DELETE SET NULL)
    ALTER TABLE public.certificates 
      DROP CONSTRAINT IF EXISTS certificates_course_id_fkey;
  END IF;
  
  -- Make course_id nullable if it's not already
  ALTER TABLE public.certificates 
    ALTER COLUMN course_id DROP NOT NULL;
    
  -- Recreate foreign key constraint with ON DELETE SET NULL
  ALTER TABLE public.certificates
    ADD CONSTRAINT certificates_course_id_fkey 
    FOREIGN KEY (course_id) 
    REFERENCES public.courses(id) 
    ON DELETE SET NULL;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.payments.course_id IS 'Course ID - can be NULL if course is deleted (preserved for historical/audit purposes)';
COMMENT ON COLUMN public.certificates.course_id IS 'Course ID - can be NULL if course is deleted (preserved for historical/audit purposes)';
