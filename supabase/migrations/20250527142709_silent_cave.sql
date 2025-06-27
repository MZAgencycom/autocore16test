/*
  # Add invoice_number to reminders table

  1. New Columns
    - `invoice_number` (text, nullable)
    - Added to store the human-readable invoice number separately from the invoice_id UUID
  
  2. Purpose
    - Allows direct access to the invoice number for display in the UI
    - Prevents the need for additional joins when only the invoice number is needed
*/

-- Add invoice_number column to reminders table if it doesn't exist
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS invoice_number text DEFAULT NULL;

-- Update the comment to refresh the schema cache
COMMENT ON TABLE reminders IS 'Table for storing client reminders and follow-ups';