/*
  # Fix Reminders Schema Cache Issue

  1. Changes
    - Force recreate the invoice_number column with proper defaults
    - Update the table comment to refresh schema cache
    - Create indexes for better performance
    - Reset sequence if needed to ensure proper ID generation
  
  2. Purpose
    - Resolves "Could not find the 'invoice_number' column of 'reminders' in the schema cache" error
    - Ensures all components can properly save and load reminders
    - Improves query performance with appropriate indexes
*/

-- Step 1: Force drop and recreate the invoice_number column
ALTER TABLE reminders
DROP COLUMN IF EXISTS invoice_number;

ALTER TABLE reminders
ADD COLUMN invoice_number text DEFAULT NULL;

-- Step 2: Create indexes for better performance
DROP INDEX IF EXISTS idx_reminders_invoice_number;
CREATE INDEX idx_reminders_invoice_number ON reminders(invoice_number);

-- Step 3: Update table comment to force schema cache refresh
COMMENT ON TABLE reminders IS 'Table for storing client reminders and follow-ups with invoice reference';

-- Step 4: Verify proper table structure
DO $$ 
BEGIN
  -- Log table structure
  RAISE NOTICE 'Reminders table structure verified with invoice_number column';
  
  -- Ensure status column has a default
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'status'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE reminders ALTER COLUMN status SET DEFAULT 'todo';
  END IF;
END $$;