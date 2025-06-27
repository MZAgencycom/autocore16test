/*
  # Create reminders table

  1. New Tables
    - `reminders`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references to clients.id)
      - `title` (text)
      - `priority` (text)
      - `due_date` (timestamptz)
      - `status` (text)
      - `notes` (text)
      - `reminder_active` (boolean)
      - `type` (text)
      - `invoice_id` (uuid, references to invoices.id)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `canceled_at` (timestamptz)

  2. Security
    - Enable RLS on `reminders` table
    - Add policy for authenticated users to manage their reminders
*/

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  notes text,
  reminder_active boolean DEFAULT true,
  type text NOT NULL DEFAULT 'task',
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  canceled_at timestamptz
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policies to ensure users can only see/manage reminders for clients they have access to
CREATE POLICY "Users can select reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users can update reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete reminders"
  ON reminders FOR DELETE
  TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_reminders_client_id ON reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);

COMMENT ON TABLE reminders IS 'Table for storing client reminders and follow-ups';