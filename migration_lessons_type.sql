-- Update lessons_type_check constraint to allow 'mixed' type
-- Drop the existing constraint
ALTER TABLE lessons 
DROP CONSTRAINT IF EXISTS lessons_type_check;

-- Add the new constraint that allows 'video', 'text', and 'mixed'
ALTER TABLE lessons 
ADD CONSTRAINT lessons_type_check 
CHECK (type IN ('video', 'text', 'mixed'));
