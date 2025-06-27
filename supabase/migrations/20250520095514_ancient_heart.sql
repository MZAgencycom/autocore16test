/*
  # Add business regulatory information fields

  1. Changes
    - Adds RCS/RM number field to users_extended table
    - Adds APE code field to users_extended table
    - Updates table comments for schema cache refresh
  
  2. Purpose
    - Allows storing mandatory French business registration information
    - These fields will be displayed on invoices for legal compliance
*/

-- Add RCS/RM number field if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users_extended' 
    AND column_name = 'rcs_number'
  ) THEN
    ALTER TABLE users_extended ADD COLUMN rcs_number text DEFAULT NULL;
  END IF;
END $$;

-- Add APE code field if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users_extended' 
    AND column_name = 'ape_code'
  ) THEN
    ALTER TABLE users_extended ADD COLUMN ape_code text DEFAULT NULL;
  END IF;
END $$;

-- Update comment to refresh schema cache
COMMENT ON TABLE users_extended IS 'Extended user profile information including business registration details';

-- Ensure all users_extended policies are correctly set up
DO $$
BEGIN
  -- Make sure select policy exists
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'users_extended' 
    AND policyname = 'Users can read own extended data'
  ) THEN
    CREATE POLICY "Users can read own extended data"
      ON users_extended
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
  
  -- Make sure update policy exists
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'users_extended' 
    AND policyname = 'Users can update own extended data'
  ) THEN
    CREATE POLICY "Users can update own extended data"
      ON users_extended
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id);
  END IF;
  
  -- Make sure insert policy exists
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'users_extended' 
    AND policyname = 'Users can insert own extended data'
  ) THEN
    CREATE POLICY "Users can insert own extended data"
      ON users_extended
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;