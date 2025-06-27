/*
  # Fix Storage Policies for Reports Bucket

  1. Changes
    - Creates or ensures existence of the 'reports' storage bucket
    - Establishes proper RLS policies on storage.objects for the 'reports' bucket
    - Configures full CRUD access for authenticated users
  
  2. Security
    - Ensures authenticated users can upload and manage reports
    - Uses proper Supabase storage access control
*/

-- Create the reports bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies directly on storage.objects table

-- Policy for SELECT operations
DROP POLICY IF EXISTS "reports_select_policy" ON storage.objects;
CREATE POLICY "reports_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Policy for INSERT operations
DROP POLICY IF EXISTS "reports_insert_policy" ON storage.objects;
CREATE POLICY "reports_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- Policy for UPDATE operations
DROP POLICY IF EXISTS "reports_update_policy" ON storage.objects;
CREATE POLICY "reports_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'reports');

-- Policy for DELETE operations
DROP POLICY IF EXISTS "reports_delete_policy" ON storage.objects;
CREATE POLICY "reports_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'reports');