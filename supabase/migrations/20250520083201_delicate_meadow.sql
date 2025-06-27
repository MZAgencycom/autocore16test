/*
  # Add missing columns to invoices table

  1. Changes
    - Add `insurer` column (jsonb) to store insurer information
    - Add `template_color` column (text) to store the invoice template color
    - Add `legal_text` column (text) to store legal information text

  This migration adds columns that are referenced in the InvoiceGenerator component
  but were missing from the original table structure, causing errors when saving invoices.
*/

-- Add the missing columns to the invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS insurer jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS template_color text DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS legal_text text DEFAULT NULL;