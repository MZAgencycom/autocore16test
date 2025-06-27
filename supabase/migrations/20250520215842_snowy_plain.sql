/*
  # Create storage bucket for company logos
  
  1. Changes
    - Creates a 'logos' storage bucket for storing company logos
    - Sets proper file size limits (5MB) and MIME types for images
    - Adds security policies to control access to the bucket
  
  2. Security
    - Only authenticated users can upload logos
    - Ensures proper access control through storage.objects policies
*/

-- Create the logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE 
SET public = true;

-- Set reasonable file size limit and allowed MIME types
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif']
WHERE id = 'logos';

-- Create policies directly on the storage.objects table instead of the storage.policies table

-- Policy for INSERT operations (upload)
DROP POLICY IF EXISTS "logos_insert_policy" ON storage.objects;
CREATE POLICY "logos_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Policy for SELECT operations (read/download)
DROP POLICY IF EXISTS "logos_select_policy" ON storage.objects;
CREATE POLICY "logos_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'logos');

-- Policy for UPDATE operations
DROP POLICY IF EXISTS "logos_update_policy" ON storage.objects;
CREATE POLICY "logos_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

-- Policy for DELETE operations
DROP POLICY IF EXISTS "logos_delete_policy" ON storage.objects;
CREATE POLICY "logos_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'logos');