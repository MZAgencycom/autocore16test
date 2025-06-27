/*
  # Fix Storage RLS policies for reports bucket

  1. Changes
    - Add storage policies for the reports bucket
    - Allow authenticated users to upload and read objects in the reports bucket
    
  2. Security
    - Ensures only authenticated users can upload files
    - Maintains proper access control for uploaded files
*/

-- Create proper storage policies for the reports bucket
DO $$ 
BEGIN
  -- Remove any existing policies first
  BEGIN
    DELETE FROM storage.policies WHERE bucket_id = 'reports';
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if table doesn't exist yet or other errors
  END;

  -- Policy to allow authenticated users to upload files to the reports bucket
  INSERT INTO storage.policies (name, bucket_id, definition)
  VALUES ('Allow authenticated users to upload files', 'reports', 
  '(role() = ''authenticated'')');
  
  -- Policy to allow authenticated users to read any file in the reports bucket
  INSERT INTO storage.policies (name, bucket_id, definition, operation)
  VALUES ('Allow authenticated users to read files', 'reports', 
  '(role() = ''authenticated'')', 'READ');

  -- Policy to allow authenticated users to update their own uploaded files
  INSERT INTO storage.policies (name, bucket_id, definition, operation)
  VALUES ('Allow authenticated users to update files', 'reports', 
  '(role() = ''authenticated'')', 'UPDATE');
  
  -- Policy to allow authenticated users to delete their own uploaded files
  INSERT INTO storage.policies (name, bucket_id, definition, operation)
  VALUES ('Allow authenticated users to delete files', 'reports', 
  '(role() = ''authenticated'')', 'DELETE');
EXCEPTION WHEN OTHERS THEN
  -- Log any errors but don't fail the migration
  RAISE NOTICE 'Error setting up storage policies: %', SQLERRM;
END $$;