/*
  # Add address field to clients table

  1. Changes
    - Adds an address field to the clients table
    - Allows storing a complete postal address for clients
  
  2. Purpose
    - Enhances client profiles with complete address information
    - Required for proper invoice generation
    - Improves client management functionality
*/

-- Add address column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS address text DEFAULT NULL;

-- Ensure the column is added correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE clients ADD COLUMN address text DEFAULT NULL;
  END IF;
END $$;

-- Update the RLS policies to include the new column
DO $$
BEGIN
  -- Make sure select policy is up-to-date
  DROP POLICY IF EXISTS "Users can select clients" ON clients;
  CREATE POLICY "Users can select clients"
    ON clients FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
    
  -- Make sure insert policy is up-to-date
  DROP POLICY IF EXISTS "Users can insert clients" ON clients;
  CREATE POLICY "Users can insert clients"
    ON clients FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
    
  -- Make sure update policy is up-to-date
  DROP POLICY IF EXISTS "Users can update clients" ON clients;
  CREATE POLICY "Users can update clients"
    ON clients FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());
    
  -- Make sure delete policy is up-to-date
  DROP POLICY IF EXISTS "Users can delete clients" ON clients;
  CREATE POLICY "Users can delete clients"
    ON clients FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
END $$;