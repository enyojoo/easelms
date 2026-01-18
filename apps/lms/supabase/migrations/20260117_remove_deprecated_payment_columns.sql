-- ============================================================================
-- Migration: Remove Deprecated Payment Columns
-- Date: 2026-01-17
-- Description: Remove deprecated amount and currency columns from payments table
--              These have been replaced by payment_amount and payment_currency
-- ============================================================================

-- Remove deprecated columns from payments table
-- WARNING: This will permanently delete data in these columns

ALTER TABLE public.payments
DROP COLUMN IF EXISTS amount,
DROP COLUMN IF EXISTS currency;

-- ============================================================================
-- VERIFICATION QUERY
-- Run this after migration to verify the table structure
-- ============================================================================

-- SELECT
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM information_schema.columns
-- WHERE table_name = 'payments'
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;