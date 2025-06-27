/*
  # Add chat_threads table for AutoCoreBot

  1. New Table
    - `chat_threads`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `messages` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `chat_threads` table
    - Add policy for authenticated users to read and write their own data
*/

CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

-- Policies for chat threads
CREATE POLICY "Users can select their own chat threads"
  ON chat_threads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert chat threads"
  ON chat_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat threads"
  ON chat_threads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat threads"
  ON chat_threads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);