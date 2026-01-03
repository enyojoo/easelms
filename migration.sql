-- Add completed_at column to enrollments table
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add index for faster queries on completed enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_completed_at 
ON enrollments(completed_at) 
WHERE completed_at IS NOT NULL;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_enrollments_status 
ON enrollments(status);
