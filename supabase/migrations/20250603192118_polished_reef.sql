/*
  # Module de Véhicules de Prêt et Infractions

  1. Nouvelles Tables
    - `loan_vehicles` - Véhicules de prêt
    - `vehicle_loans` - Prêts de véhicules 
    - `vehicle_damages` - Dommages aux véhicules
    - `traffic_violations` - Infractions routières

  2. Sécurité
    - Activation de RLS sur toutes les tables
    - Politiques pour que les utilisateurs ne voient que leurs propres données
*/

-- Création des types enum seulement s'ils n'existent pas déjà
DO $$ 
BEGIN
  -- Création du type loan_status s'il n'existe pas
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
    CREATE TYPE loan_status AS ENUM ('available', 'loaned', 'maintenance', 'retired');
  END IF;
  
  -- Création du type violation_status s'il n'existe pas
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'violation_status') THEN
    CREATE TYPE violation_status AS ENUM ('pending', 'forwarded', 'paid', 'contested', 'resolved');
  END IF;
END $$;

-- Table des véhicules de prêt
CREATE TABLE IF NOT EXISTS loan_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  make text NOT NULL,
  model text NOT NULL,
  registration text NOT NULL,
  chassis_number text,
  engine_number text,
  initial_mileage integer NOT NULL,
  current_mileage integer NOT NULL,
  color text,
  fuel_level integer DEFAULT 50,
  status loan_status DEFAULT 'available',
  registration_doc_url text,
  insurance_doc_url text,
  front_image_url text,
  rear_image_url text,
  left_side_image_url text,
  right_side_image_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des prêts de véhicules
CREATE TABLE IF NOT EXISTS vehicle_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES loan_vehicles(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  start_date timestamptz NOT NULL,
  expected_end_date timestamptz NOT NULL,
  actual_end_date timestamptz,
  start_mileage integer NOT NULL,
  end_mileage integer,
  start_fuel_level integer NOT NULL,
  end_fuel_level integer,
  driver_license_front_url text,
  driver_license_back_url text,
  driver_name text NOT NULL,
  driver_license_number text NOT NULL,
  driver_license_issue_date date NOT NULL,
  driver_birthdate date NOT NULL,
  driver_birthplace text NOT NULL,
  insurance_company text NOT NULL,
  insurance_policy_number text NOT NULL,
  contract_signed boolean DEFAULT false,
  contract_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des dommages aux véhicules
CREATE TABLE IF NOT EXISTS vehicle_damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES loan_vehicles(id) ON DELETE CASCADE,
  loan_id uuid REFERENCES vehicle_loans(id),
  body_part text NOT NULL,
  damage_type text NOT NULL,
  severity text DEFAULT 'minor',
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des infractions routières
CREATE TABLE IF NOT EXISTS traffic_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES loan_vehicles(id),
  loan_id uuid REFERENCES vehicle_loans(id),
  violation_date timestamptz NOT NULL,
  amount numeric(10,2) NOT NULL,
  points_lost integer DEFAULT 0,
  payment_deadline timestamptz,
  violation_image_url text,
  status violation_status DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation de RLS sur toutes les tables
ALTER TABLE loan_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_violations ENABLE ROW LEVEL SECURITY;

-- Création d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_loan_vehicles_user_id ON loan_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_loans_vehicle_id ON vehicle_loans(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_loans_client_id ON vehicle_loans(client_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damages_vehicle_id ON vehicle_damages(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damages_loan_id ON vehicle_damages(loan_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_vehicle_id ON traffic_violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_loan_id ON traffic_violations(loan_id);

-- Politiques pour loan_vehicles
DROP POLICY IF EXISTS "Users can select their own loan vehicles" ON loan_vehicles;
CREATE POLICY "Users can select their own loan vehicles"
  ON loan_vehicles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own loan vehicles" ON loan_vehicles;
CREATE POLICY "Users can insert their own loan vehicles"
  ON loan_vehicles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own loan vehicles" ON loan_vehicles;
CREATE POLICY "Users can update their own loan vehicles"
  ON loan_vehicles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own loan vehicles" ON loan_vehicles;
CREATE POLICY "Users can delete their own loan vehicles"
  ON loan_vehicles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Politiques pour vehicle_loans
DROP POLICY IF EXISTS "Users can select loans for their vehicles" ON vehicle_loans;
CREATE POLICY "Users can select loans for their vehicles"
  ON vehicle_loans FOR SELECT
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert loans for their vehicles" ON vehicle_loans;
CREATE POLICY "Users can insert loans for their vehicles"
  ON vehicle_loans FOR INSERT
  TO authenticated
  WITH CHECK (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update loans for their vehicles" ON vehicle_loans;
CREATE POLICY "Users can update loans for their vehicles"
  ON vehicle_loans FOR UPDATE
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete loans for their vehicles" ON vehicle_loans;
CREATE POLICY "Users can delete loans for their vehicles"
  ON vehicle_loans FOR DELETE
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

-- Politiques pour vehicle_damages
DROP POLICY IF EXISTS "Users can select damages for their vehicles" ON vehicle_damages;
CREATE POLICY "Users can select damages for their vehicles"
  ON vehicle_damages FOR SELECT
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert damages for their vehicles" ON vehicle_damages;
CREATE POLICY "Users can insert damages for their vehicles"
  ON vehicle_damages FOR INSERT
  TO authenticated
  WITH CHECK (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update damages for their vehicles" ON vehicle_damages;
CREATE POLICY "Users can update damages for their vehicles"
  ON vehicle_damages FOR UPDATE
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete damages for their vehicles" ON vehicle_damages;
CREATE POLICY "Users can delete damages for their vehicles"
  ON vehicle_damages FOR DELETE
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

-- Politiques pour traffic_violations
DROP POLICY IF EXISTS "Users can select violations for their vehicles" ON traffic_violations;
CREATE POLICY "Users can select violations for their vehicles"
  ON traffic_violations FOR SELECT
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert violations for their vehicles" ON traffic_violations;
CREATE POLICY "Users can insert violations for their vehicles"
  ON traffic_violations FOR INSERT
  TO authenticated
  WITH CHECK (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update violations for their vehicles" ON traffic_violations;
CREATE POLICY "Users can update violations for their vehicles"
  ON traffic_violations FOR UPDATE
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete violations for their vehicles" ON traffic_violations;
CREATE POLICY "Users can delete violations for their vehicles"
  ON traffic_violations FOR DELETE
  TO authenticated
  USING (vehicle_id IN (SELECT id FROM loan_vehicles WHERE user_id = auth.uid()));