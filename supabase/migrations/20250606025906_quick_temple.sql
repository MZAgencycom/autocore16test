/*
  # Create cession_creances table

  1. New Tables
    - `cession_creances`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `invoice_id` (uuid, foreign key to invoices)
      - `invoice_number` (text)
      - `invoice_amount` (numeric)
      - `recipient_name` (text)
      - `recipient_email` (text)
      - `recipient_company` (text)
      - `recipient_address` (text)
      - `amount` (numeric)
      - `notes` (text)
      - `status` (text)
      - `due_date` (timestamp with time zone)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
      - `document_url` (text)
      - `signed` (boolean)
      - `signed_at` (timestamp with time zone)
      - `recipient_signature_url` (text)
  
  2. Security
    - Enable RLS on `cession_creances` table
    - Add policies for authenticated users to manage their own cession records
*/

-- Create the cession_creances table
CREATE TABLE IF NOT EXISTS cession_creances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_amount numeric(12,2) NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  recipient_company text NOT NULL,
  recipient_address text NOT NULL,
  amount numeric(12,2) NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  due_date timestamp with time zone NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  document_url text,
  signed boolean DEFAULT false,
  signed_at timestamp with time zone,
  recipient_signature_url text
);

-- Create index on client_id for faster queries
CREATE INDEX IF NOT EXISTS idx_cession_creances_client_id ON cession_creances(client_id);

-- Create index on invoice_id for faster queries
CREATE INDEX IF NOT EXISTS idx_cession_creances_invoice_id ON cession_creances(invoice_id);

-- Enable Row Level Security
ALTER TABLE cession_creances ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can insert cession_creances"
ON cession_creances
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can select their own cession_creances"
ON cession_creances
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can update their own cession_creances"
ON cession_creances
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own cession_creances"
ON cession_creances
FOR DELETE
TO authenticated
USING (created_by = auth.uid());