/*
  # Ensure insurer column exists in invoices table

  1. Changes
    - Adds insurer column if it doesn't exist yet
    - Uses jsonb type to store structured insurance information
    - Sets default value to NULL
  
  2. Purpose
    - Fixes the error "Could not find the 'insurer' column of 'invoices' in the schema cache"
    - Ensures consistent schema across all environments
    - Allows storing structured data (insurer name, policy number, claim number)
*/

-- Ensure the insurer column exists and is jsonb type
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

-- Update any NULL or non-existent insurer values
UPDATE invoices 
SET insurer = '{}'::jsonb
WHERE insurer IS NULL;

-- Ensure the template_color column exists with correct default
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

-- Ensure the legal_text column exists with meaningful default
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'legal_text'
  ) THEN
    ALTER TABLE invoices ADD COLUMN legal_text text NOT NULL DEFAULT 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l''échéance entraînera des pénalités conformément à la loi en vigueur.';
  END IF;
END $$;

-- Refresh schema cache
COMMENT ON TABLE invoices IS 'Table for storing invoice information including insurance details';