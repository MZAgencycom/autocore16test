/*
  # Create users_extended table

  1. New Tables
    - `users_extended`
      - `id` (uuid, primary key, references to auth.users.id)
      - `company_name` (text)
      - `siret` (text)
      - `vat_number` (text)
      - `address_street` (text)
      - `address_zip_code` (text)
      - `address_city` (text)
      - `address_country` (text)
      - `phone` (text)
      - `logo_url` (text)
      - `hourly_rate` (float)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `users_extended` table
    - Add policy for authenticated users to read and update their own data
*/

CREATE TABLE IF NOT EXISTS users_extended (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  siret text,
  vat_number text,
  address_street text,
  address_zip_code text,
  address_city text,
  address_country text DEFAULT 'France',
  phone text,
  logo_url text,
  hourly_rate float DEFAULT 70.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users_extended ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own data
CREATE POLICY "Users can read own extended data"
  ON users_extended
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy to allow users to update their own data
CREATE POLICY "Users can update own extended data"
  ON users_extended
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policy to allow users to insert their own data
CREATE POLICY "Users can insert own extended data"
  ON users_extended
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_extended (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a row in users_extended when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();