/*
  # Add missing columns to invoices table

  1. Changes
    - Added `laborDetails` column of type `jsonb` with default value `[]`
    - Added `template_color` column of type `text` with default value `'blue'`
    - Added `insurer` column of type `jsonb` with default value `null`
    - Added `legal_text` column of type `text` with default value for standard legal text
    - Added `payment_method` column of type `text` with default value `'Virement bancaire'`

  This migration adds columns that are referenced in the code but were missing from the
  database schema, particularly the `laborDetails` column which was causing errors.
*/

-- Add missing columns to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS "laborDetails" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "template_color" text DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS "insurer" jsonb DEFAULT null,
ADD COLUMN IF NOT EXISTS "legal_text" text DEFAULT 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l''échéance entraînera des pénalités conformément à la loi en vigueur.',
ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'Virement bancaire';