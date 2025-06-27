/*
  # Invoice template enhancements

  1. Changes
    - Add template_color column to invoices table for visual customization
    - Add legal_text column to include mandatory legal information
    - Set default legal text for all invoices
    - Update existing invoices to include the legal text
    
  2. Template Options
    - Add support for three template options: white, carbon, tech
    - Each template can have color variants: blue, violet, gray
*/

-- First, add the template_color column to the invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS template_color text NOT NULL DEFAULT 'blue';

-- Add the legal_text column with the required default text
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS legal_text text NOT NULL 
DEFAULT 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l''échéance entraînera des pénalités conformément à la loi en vigueur.';

-- Update any existing invoices without a legal text
UPDATE invoices
SET legal_text = 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l''échéance entraînera des pénalités conformément à la loi en vigueur.'
WHERE legal_text IS NULL OR legal_text = '';