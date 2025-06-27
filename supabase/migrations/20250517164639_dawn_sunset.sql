/*
  # Update users_extended table and policies

  1. Changes
    - This migration ensures the users_extended table exists
    - Conditionally recreates policies to avoid conflicts
    - Updates trigger function if needed
  
  2. Security
    - Uses conditional logic to prevent errors when resources already exist
    - Preserves RLS policies while ensuring they're correctly configured
*/

-- Only create table if it doesn't exist
DO $$ 
BEGIN
  -- Check if users_extended table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users_extended'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE public.users_extended (
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

    -- Enable RLS
    ALTER TABLE public.users_extended ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  -- Drop select policy if exists
  DROP POLICY IF EXISTS "Users can read own extended data" ON public.users_extended;
  
  -- Recreate select policy
  CREATE POLICY "Users can read own extended data"
    ON public.users_extended
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
  
  -- Drop update policy if exists
  DROP POLICY IF EXISTS "Users can update own extended data" ON public.users_extended;
  
  -- Recreate update policy
  CREATE POLICY "Users can update own extended data"
    ON public.users_extended
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);
  
  -- Drop insert policy if exists
  DROP POLICY IF EXISTS "Users can insert own extended data" ON public.users_extended;
  
  -- Recreate insert policy
  CREATE POLICY "Users can insert own extended data"
    ON public.users_extended
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
END $$;

-- Update or create the function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already has an extended profile
  IF NOT EXISTS (SELECT 1 FROM public.users_extended WHERE id = NEW.id) THEN
    INSERT INTO public.users_extended (id)
    VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists
DO $$ 
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Create the trigger
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END $$;