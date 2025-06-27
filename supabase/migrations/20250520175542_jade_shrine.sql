/*
  # Add payment_method field to invoice table

  1. Changes
    - Add column payment_method to track how the client pays
    - Default to "Virement bancaire"
    - Allow this to be null for backward compatibility
  
  2. Purpose
    - Enhances invoice functionality to track payment methods
    - Will be displayed on invoices and in reporting
*/

-- Add payment_method to invoices if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_method text DEFAULT 'Virement bancaire';
  END IF;
END $$;