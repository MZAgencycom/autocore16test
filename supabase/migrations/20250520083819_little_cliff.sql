/*
  # Add insurer column to invoices table

  1. Changes
    - Adds insurer column of type jsonb to store insurance information
    - Sets a default value of NULL
  
  2. Purpose
    - This allows for storing structured insurance information for invoices
    - The jsonb type can store complex data including insurer name, policy number, and claim number
*/

-- Add insurer column to invoices table if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS insurer jsonb DEFAULT NULL;

-- Verify template_color exists with correct default
DO $$ 
BEGIN
  -- Check if template_color column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'template_color'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE invoices 
    ADD COLUMN template_color text NOT NULL DEFAULT 'blue';
  END IF;
END $$;

-- Verify legal_text exists
DO $$ 
BEGIN
  -- Check if legal_text column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'legal_text'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE invoices 
    ADD COLUMN legal_text text DEFAULT 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l''échéance entraînera des pénalités conformément à la loi en vigueur.';
  END IF;
END $$;