/*
  # Ajout du support de signature électronique

  1. Nouvelles colonnes
    - `electronic_signatures` dans la table vehicle_loans pour stocker les signatures du prêt
    - `client_signature_url` dans la table vehicle_loans pour stocker l'URL de la signature du client
    - `dealer_signature_url` dans la table vehicle_loans pour stocker l'URL de la signature du carrossier
    - `initial_condition_report` et `final_condition_report` pour les états des lieux
    - `condition_photos` pour stocker les URLs des photos d'état des lieux
  
  2. Sécurité
    - Maintien des politiques RLS existantes
*/

-- Ajout des colonnes pour les signatures électroniques et les états des lieux
ALTER TABLE vehicle_loans 
ADD COLUMN IF NOT EXISTS electronic_signatures jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS client_signature_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dealer_signature_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS initial_condition_report jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS final_condition_report jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS condition_photos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS signature_date timestamptz DEFAULT NULL;

-- Créer un nouveau bucket pour les signatures si nécessaire
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques pour le bucket signatures
DO $$ 
BEGIN
  -- Create a security policy to allow authenticated users to upload files
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Policy for uploading signatures as authenticated user' AND tablename = 'objects') THEN
    CREATE POLICY "Policy for uploading signatures as authenticated user"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'signatures');
  END IF;

  -- Create a security policy to allow authenticated users to select their files
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Policy for selecting signatures as authenticated user' AND tablename = 'objects') THEN
    CREATE POLICY "Policy for selecting signatures as authenticated user"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'signatures');
  END IF;

  -- Create a security policy to allow authenticated users to update their files
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Policy for updating signatures as authenticated user' AND tablename = 'objects') THEN
    CREATE POLICY "Policy for updating signatures as authenticated user"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'signatures');
  END IF;

  -- Create a security policy to allow authenticated users to delete their files
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Policy for deleting signatures as authenticated user' AND tablename = 'objects') THEN
    CREATE POLICY "Policy for deleting signatures as authenticated user"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'signatures');
  END IF;
END $$;

-- Mise à jour des commentaires pour rafraîchir le cache du schéma
COMMENT ON TABLE vehicle_loans IS 'Table pour stocker les prêts de véhicules avec signatures électroniques et états des lieux';

-- Ajout de colonnes à la table traffic_violations pour lier aux prêts et clients
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'traffic_violations' 
    AND column_name = 'client_notification_sent'
  ) THEN
    ALTER TABLE traffic_violations 
    ADD COLUMN client_notification_sent boolean DEFAULT false,
    ADD COLUMN notification_date timestamptz DEFAULT NULL;
  END IF;
END $$;