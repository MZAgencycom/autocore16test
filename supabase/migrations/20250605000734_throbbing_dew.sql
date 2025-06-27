/*
  # Expenses Module Database Schema

  1. New Tables
    - `expenses` - Stores all expense transactions
    - `expense_categories` - Pre-defined expense categories 
    - `expense_tags` - Tags for organizing expenses

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own expenses
*/

-- Create expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text,
  icon text,
  is_system boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on expense_categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Policies for expense_categories
CREATE POLICY "Users can view system categories" ON expense_categories
  FOR SELECT
  USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can manage their own categories" ON expense_categories
  FOR ALL
  USING (user_id = auth.uid());

-- Insert default categories
INSERT INTO expense_categories (name, description, color, icon, is_system) VALUES
('Pièces détachées', 'Achats de pièces pour réparations', '#3B82F6', 'Wrench', true),
('Fournitures', 'Fournitures d''atelier', '#10B981', 'Package', true),
('Outillage', 'Achat et entretien d''outils', '#F59E0B', 'Tool', true),
('Loyer', 'Loyer du local', '#6366F1', 'Home', true),
('Énergie', 'Électricité, gaz, eau', '#EC4899', 'Zap', true),
('Carburant', 'Carburant pour véhicules', '#F97316', 'Fuel', true),
('Assurance', 'Primes d''assurance', '#0EA5E9', 'Shield', true),
('Salaires', 'Salaires et charges sociales', '#8B5CF6', 'Users', true),
('Formation', 'Formation et documentation', '#14B8A6', 'GraduationCap', true),
('Marketing', 'Publicité et marketing', '#EF4444', 'Megaphone', true),
('Fournitures bureau', 'Fournitures administratives', '#6B7280', 'PenTool', true),
('Informatique', 'Matériel et logiciels', '#0D9488', 'Computer', true),
('Télécom', 'Téléphone et internet', '#8B5CF6', 'Phone', true),
('Frais bancaires', 'Frais bancaires et financiers', '#64748B', 'CreditCard', true),
('Déplacements', 'Frais de déplacement', '#0891B2', 'Car', true),
('Restauration', 'Repas professionnels', '#D946EF', 'UtensilsCrossed', true),
('Impôts et taxes', 'Impôts, taxes et cotisations', '#475569', 'Building', true),
('Autres', 'Dépenses diverses', '#94A3B8', 'CircleDashed', true);

-- Create expense tags table
CREATE TABLE IF NOT EXISTS expense_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on expense_tags
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

-- Policies for expense_tags
CREATE POLICY "Users can manage their own tags" ON expense_tags
  FOR ALL
  USING (user_id = auth.uid());

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount numeric(12,2) NOT NULL,
  tax_amount numeric(12,2),
  tax_rate numeric(5,2),
  date date NOT NULL,
  description text,
  vendor_name text,
  category_id uuid REFERENCES expense_categories(id),
  report_id uuid REFERENCES reports(id),
  client_id uuid REFERENCES clients(id),
  receipt_url text,
  receipt_text text,
  status text DEFAULT 'pending',
  payment_method text,
  reference_number text,
  is_recurring boolean DEFAULT false,
  recurring_period text,
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies for expenses
CREATE POLICY "Users can manage their own expenses" ON expenses
  FOR ALL
  USING (user_id = auth.uid());

-- Create join table for expenses and tags
CREATE TABLE IF NOT EXISTS expense_to_tags (
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES expense_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);

-- Enable RLS on expense_to_tags
ALTER TABLE expense_to_tags ENABLE ROW LEVEL SECURITY;

-- Policies for expense_to_tags
CREATE POLICY "Users can manage their own expense tags" ON expense_to_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_id
      AND expenses.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_tags_updated_at
  BEFORE UPDATE ON expense_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_report_id ON expenses(report_id);
CREATE INDEX idx_expenses_client_id ON expenses(client_id);