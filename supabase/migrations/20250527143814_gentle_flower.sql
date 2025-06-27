/*
  # Add invoice_number column to reminders table

  1. Changes
    - Adds invoice_number column to reminders table
    - Updates table comment to refresh schema cache
    - Creates index for better performance
  
  2. Purpose
    - Fixes "Could not find the 'invoice_number' column of 'reminders' in the schema cache" error
    - Ensures all required fields are available for reminder creation
    - Improves query performance with appropriate index
*/

-- Force add the invoice_number column and refresh schema cache
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS invoice_number text DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reminders_invoice_number ON reminders(invoice_number);

-- Update comment to refresh schema cache
COMMENT ON TABLE reminders IS 'Table for storing client reminders and follow-ups with invoice reference';