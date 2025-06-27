/*
  # Fix insurer column in invoices table

  1. Changes
    - Correctly adds insurer column as jsonb type if it doesn't exist
    - Adds status_history column for tracking invoice status changes
    - Creates a trigger to track invoice status changes
    - Adds a comment to the invoices table to refresh the schema cache
  
  2. Purpose
    - Fixes the "Could not find the 'insurer' column of 'invoices' in the schema cache" error
    - Provides proper data structure for storing insurance information
    - Creates proper tracking of invoice status changes over time
*/

-- First check if insurer column exists, add it if not
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'insurer'
  ) THEN
    ALTER TABLE invoices ADD COLUMN insurer jsonb DEFAULT NULL;
  END IF;
END $$;

-- Make sure status_history exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'status_history'
  ) THEN
    ALTER TABLE invoices ADD COLUMN status_history jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create or replace the status tracking function
CREATE OR REPLACE FUNCTION track_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the new status change to the history array
  NEW.status_history = COALESCE(OLD.status_history, '[]'::jsonb) || 
    jsonb_build_object(
      'status', NEW.status,
      'timestamp', CURRENT_TIMESTAMP,
      'previous', OLD.status
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_trigger 
    WHERE tgname = 'on_invoice_status_change'
  ) THEN
    CREATE TRIGGER on_invoice_status_change
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION track_invoice_status_change();
  END IF;
END $$;

-- Force schema cache refresh by updating table comment
COMMENT ON TABLE invoices IS 'Table for storing invoice information including insurance details';

-- Update any NULL values in existing records
UPDATE invoices 
SET insurer = '{}'::jsonb
WHERE insurer IS NULL;

-- Double check template_color exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'template_color'
  ) THEN
    ALTER TABLE invoices ADD COLUMN template_color text NOT NULL DEFAULT 'blue';
  END IF;
END $$;

-- Double check legal_text exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'legal_text'
  ) THEN
    ALTER TABLE invoices ADD COLUMN legal_text text DEFAULT 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l''échéance entraînera des pénalités conformément à la loi en vigueur.';
  END IF;
END $$;