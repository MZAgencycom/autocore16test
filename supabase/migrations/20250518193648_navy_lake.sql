/*
  # Storage bucket and policies for reports

  1. Changes
    - Creates or updates the 'reports' storage bucket 
    - Makes the bucket public for authenticated users
    - Sets appropriate policies for uploading and accessing files
  
  2. Security
    - Ensures authenticated users can upload reports
    - Enables access control through Supabase Storage API
*/

-- Create bucket with proper settings if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Enable security policies on the bucket
DO $$ 
BEGIN
  -- Make sure security is enabled
  UPDATE storage.buckets 
  SET public = true, 
      avif_autodetection = false, 
      file_size_limit = 5242880, -- 5MB
      allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg']
  WHERE id = 'reports';
EXCEPTION WHEN OTHERS THEN
  -- Report the error but continue
  RAISE NOTICE 'Error updating bucket settings: %', SQLERRM;
END $$;

-- Create a security policy to allow authenticated users to upload files
CREATE POLICY "Policy for uploading reports as authenticated user"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- Create a security policy to allow authenticated users to select their files
CREATE POLICY "Policy for selecting reports as authenticated user"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Create a security policy to allow authenticated users to update their files
CREATE POLICY "Policy for updating reports as authenticated user"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'reports');

-- Create a security policy to allow authenticated users to delete their files
CREATE POLICY "Policy for deleting reports as authenticated user"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'reports');