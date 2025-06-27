/*
  # Ajouter et corriger la colonne insurer dans la table invoices

  1. Changements
    - Ajouter la colonne insurer de type jsonb si elle n'existe pas déjà
    - Garantir que tous les enregistrements existants ont une valeur par défaut
    - Ajouter un commentaire sur la table pour forcer le rafraîchissement du cache du schéma
    
  2. Données
    - Les données d'assurance seront stockées au format JSON avec les champs:
      - name: nom de l'assurance
      - policy_number: numéro de police
      - claim_number: numéro de sinistre
      - contact: informations de contact
*/

-- Vérifier si la colonne insurer existe, sinon la créer
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'insurer'
  ) THEN
    ALTER TABLE invoices ADD COLUMN insurer jsonb;
  END IF;
END $$;

-- Mettre à jour les enregistrements existants pour éviter les valeurs NULL
UPDATE invoices 
SET insurer = '{}'::jsonb
WHERE insurer IS NULL;

-- S'assurer que les autres colonnes nécessaires existent
DO $$
BEGIN
  -- Vérifier si template_color existe
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'template_color'
  ) THEN
    ALTER TABLE invoices ADD COLUMN template_color text NOT NULL DEFAULT 'blue';
  END IF;
  
  -- Vérifier si legal_text existe
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'legal_text'
  ) THEN
    ALTER TABLE invoices ADD COLUMN legal_text text DEFAULT 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l''échéance entraînera des pénalités conformément à la loi en vigueur.';
  END IF;
END $$;

-- Ajouter status_history si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'status_history'
  ) THEN
    ALTER TABLE invoices ADD COLUMN status_history jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Mettre à jour le commentaire pour forcer le rafraîchissement du cache
COMMENT ON TABLE invoices IS 'Table for storing invoice information including insurance details';

-- Créer un trigger pour suivre les changements de statut si nécessaire
CREATE OR REPLACE FUNCTION track_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status_history = COALESCE(OLD.status_history, '[]'::jsonb) || 
    jsonb_build_object(
      'status', NEW.status,
      'timestamp', CURRENT_TIMESTAMP,
      'previous', OLD.status
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_trigger 
    WHERE tgname = 'on_invoice_status_change'
  ) THEN
    CREATE TRIGGER on_invoice_status_change
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION track_invoice_status_change();
  END IF;
END $$;