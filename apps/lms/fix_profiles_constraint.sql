-- Fix profiles_user_type_check constraint
-- Run this in your Supabase SQL Editor

-- First, check the current constraint definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'profiles_user_type_check';

-- Drop the existing constraint if it's incorrect
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- Recreate the constraint to allow 'user' and 'admin'
ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('user', 'admin'));

-- Verify the constraint was created correctly
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'profiles_user_type_check';

