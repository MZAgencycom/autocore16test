/*
  # Add IBAN field to users_extended table

  1. Changes
    - Adds IBAN field to users_extended table to store bank account information
    - Sets a default empty string value
    - Updates existing records to have an empty IBAN field
  
  2. Purpose
    - This allows users to store their IBAN (International Bank Account Number)
    - The IBAN will be displayed on invoices to facilitate payments
*/

-- Add IBAN column to users_extended table
ALTER TABLE users_extended 
ADD COLUMN IF NOT EXISTS iban text DEFAULT '';

-- Make sure all existing records have the IBAN field (even if empty)
UPDATE users_extended
SET iban = ''
WHERE iban IS NULL;