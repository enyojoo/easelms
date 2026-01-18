-- Add currency fields to payments table for multi-currency support
-- This migration adds fields to store both original course prices and payment amounts

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS original_currency TEXT,
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS payment_currency TEXT;

-- Update existing records to set original_amount = amount_usd and payment_amount = amount
-- This preserves existing data while adding the new multi-currency fields
UPDATE payments
SET
  original_amount = amount_usd,
  original_currency = 'USD',
  payment_amount = amount,
  payment_currency = currency
WHERE original_amount IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN payments.amount_usd IS 'DEPRECATED: Use original_amount and payment_amount instead';
COMMENT ON COLUMN payments.original_amount IS 'Course price in platform currency';
COMMENT ON COLUMN payments.original_currency IS 'Platform currency (e.g., NGN, USD)';
COMMENT ON COLUMN payments.payment_amount IS 'Amount actually paid by user';
COMMENT ON COLUMN payments.payment_currency IS 'Currency user paid in (e.g., USD, NGN)';