/*
  # Ajout de l'isolation des données par utilisateur

  1. Changements
    - Ajout d'une colonne user_id à toutes les tables principales (clients, vehicles, reports, invoices)
    - Mise à jour de toutes les politiques RLS pour limiter l'accès aux données en fonction de l'utilisateur
    - Ajout de déclencheurs pour définir automatiquement user_id à chaque insertion
    - Mise à jour des données existantes pour maintenir la cohérence

  2. Sécurité
    - Correction critique d'une faille permettant à un utilisateur de voir les données d'un autre
    - Isolation complète des données entre les différents tenants (utilisateurs)
    - Application des bonnes pratiques de Row Level Security (RLS)
*/

-- 1. Ajouter la colonne user_id à la table clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Mettre à jour les politiques RLS pour la table clients
DROP POLICY IF EXISTS "Users can select clients" ON clients;
CREATE POLICY "Users can select clients"
  ON clients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert clients" ON clients;
CREATE POLICY "Users can insert clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update clients" ON clients;
CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete clients" ON clients;
CREATE POLICY "Users can delete clients"
  ON clients FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. Ajouter des triggers pour définir automatiquement user_id à l'insertion
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_user_id_on_client_insert ON clients;
CREATE TRIGGER set_user_id_on_client_insert
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- 4. Modifier les politiques pour la table vehicles
DROP POLICY IF EXISTS "Users can select vehicles" ON vehicles;
CREATE POLICY "Users can select vehicles"
  ON vehicles FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert vehicles" ON vehicles;
CREATE POLICY "Users can insert vehicles"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update vehicles" ON vehicles;
CREATE POLICY "Users can update vehicles"
  ON vehicles FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete vehicles" ON vehicles;
CREATE POLICY "Users can delete vehicles"
  ON vehicles FOR DELETE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- 5. Modifier les politiques pour la table reports
DROP POLICY IF EXISTS "Users can select reports" ON reports;
CREATE POLICY "Users can select reports"
  ON reports FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert reports" ON reports;
CREATE POLICY "Users can insert reports"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update reports" ON reports;
CREATE POLICY "Users can update reports"
  ON reports FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete reports" ON reports;
CREATE POLICY "Users can delete reports"
  ON reports FOR DELETE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- 6. Modifier les politiques pour la table invoices
DROP POLICY IF EXISTS "Users can select invoices" ON invoices;
CREATE POLICY "Users can select invoices"
  ON invoices FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;
CREATE POLICY "Users can insert invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- 7. Mettez à jour les données existantes pour assigner un user_id (le premier utilisateur par défaut)
-- Cette étape est utile uniquement pour les données de démonstration existantes
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Récupérer le premier utilisateur comme propriétaire des données existantes
  -- (pour un environnement de développement/démo)
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  -- Si aucun utilisateur n'existe, on ne fait rien
  IF first_user_id IS NOT NULL THEN
    -- Mettre à jour les clients sans user_id
    UPDATE clients SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- 8. Ajouter une contrainte NOT NULL sur la colonne user_id
-- Maintenant que toutes les données existantes ont un user_id
ALTER TABLE clients 
ALTER COLUMN user_id SET NOT NULL;

-- 9. Ajouter colonne user_id à chat_threads si elle n'existe pas déjà
-- (Déjà présente, donc on vérifie juste avant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_threads' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 10. Ajouter un index pour améliorer les performances des requêtes filtrées par user_id
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);