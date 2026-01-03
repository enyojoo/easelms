# Supabase Enrollments Table Migration

## Required Column: `completed_at`

The `enrollments` table needs a `completed_at` column to track when a course was completed.

### SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
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
```

### Current Table Structure

The `enrollments` table should have these columns:
- `id` (primary key)
- `user_id` (foreign key to profiles)
- `course_id` (foreign key to courses)
- `status` (text: 'active', 'completed', 'cancelled')
- `progress` (numeric, 0-100)
- `enrolled_at` (timestamptz) - when user enrolled
- `completed_at` (timestamptz) - when course was completed (NEW - needs to be added)
- `last_accessed_at` (timestamptz, optional) - last time user accessed the course

### Verification

After running the migration, verify the column exists:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;
```

You should see `completed_at` in the list with `data_type` = `timestamp with time zone`.
