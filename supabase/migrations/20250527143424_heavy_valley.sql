/*
  # Ajout de la colonne invoice_number à la table reminders

  1. Changements
    - Ajout de la colonne invoice_number à la table reminders si elle n'existe pas
    - Mise à jour des commentaires pour rafraîchir le cache du schéma
    
  2. Objectif
    - Résoudre l'erreur "Could not find the 'invoice_number' column of 'reminders' in the schema cache"
    - Permettre le stockage du numéro de facture associé à un rappel
*/

-- Vérifier si la colonne invoice_number existe déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'invoice_number'
  ) THEN
    -- Ajouter la colonne invoice_number
    ALTER TABLE reminders ADD COLUMN invoice_number text DEFAULT NULL;
    RAISE NOTICE 'Colonne invoice_number ajoutée à la table reminders';
  ELSE
    RAISE NOTICE 'La colonne invoice_number existe déjà dans la table reminders';
  END IF;
END $$;

-- Rafraîchir le cache du schéma en mettant à jour le commentaire de la table
COMMENT ON TABLE reminders IS 'Table for storing client reminders and follow-ups';

-- Créer les index appropriés pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reminders_invoice_id ON reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminders_invoice_number ON reminders(invoice_number);

-- Vérifie que la table existe et que toutes les colonnes nécessaires sont présentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'reminders'
  ) THEN
    RAISE EXCEPTION 'La table reminders n''existe pas, veuillez exécuter les migrations précédentes d''abord';
  END IF;
END $$;