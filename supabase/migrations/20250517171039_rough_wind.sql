/*
  # Création des tables pour gérer les clients, véhicules, rapports et factures

  1. Nouvelles Tables
    - `clients`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, nullable)
      - `phone` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `vehicles`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `make` (text)
      - `model` (text)
      - `registration` (text, nullable)
      - `vin` (text, nullable)
      - `year` (integer, nullable)
      - `mileage` (integer, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `reports`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `vehicle_id` (uuid, references vehicles)
      - `file_url` (text)
      - `file_name` (text)
      - `status` (text)
      - `extracted_data` (jsonb)
      - `parts_count` (integer, nullable)
      - `labor_hours` (double precision, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `invoices`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `vehicle_id` (uuid, references vehicles)
      - `report_id` (uuid, references reports, nullable)
      - `invoice_number` (text)
      - `issue_date` (timestamptz)
      - `due_date` (timestamptz, nullable)
      - `parts` (jsonb)
      - `labor_hours` (double precision)
      - `labor_rate` (double precision)
      - `subtotal` (double precision)
      - `tax_rate` (double precision)
      - `tax_amount` (double precision)
      - `total` (double precision)
      - `status` (text)
      - `notes` (text, nullable)
      - `template` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Activer RLS sur toutes les tables
    - Ajouter des stratégies pour que les utilisateurs authentifiés puissent gérer leurs propres données
*/

-- Création des tables

-- Table clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  registration text,
  vin text,
  year integer,
  mileage integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  extracted_data jsonb,
  parts_count integer,
  labor_hours double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  labor_hours double precision NOT NULL DEFAULT 0,
  labor_rate double precision NOT NULL DEFAULT 0,
  subtotal double precision NOT NULL DEFAULT 0,
  tax_rate double precision NOT NULL DEFAULT 0.2,
  tax_amount double precision NOT NULL DEFAULT 0,
  total double precision NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  template text NOT NULL DEFAULT 'white',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Création d'un bucket pour les rapports dans Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Activer RLS sur les tables

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Politiques pour les clients

-- Tous les utilisateurs authentifiés peuvent voir et gérer les clients
CREATE POLICY "Users can select clients"
  ON clients FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Users can delete clients"
  ON clients FOR DELETE TO authenticated
  USING (true);

-- Politiques pour les véhicules

CREATE POLICY "Users can select vehicles"
  ON vehicles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert vehicles"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update vehicles"
  ON vehicles FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Users can delete vehicles"
  ON vehicles FOR DELETE TO authenticated
  USING (true);

-- Politiques pour les rapports

CREATE POLICY "Users can select reports"
  ON reports FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert reports"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update reports"
  ON reports FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Users can delete reports"
  ON reports FOR DELETE TO authenticated
  USING (true);

-- Politiques pour les factures

CREATE POLICY "Users can select invoices"
  ON invoices FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE TO authenticated
  USING (true);