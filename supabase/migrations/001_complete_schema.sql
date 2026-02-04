-- =====================================================
-- LAB INVENTORY SYSTEM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Users profile (extends Supabase auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'technician')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (Biochemistry, Hematology, Laboratory Kits)
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  has_machines BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machines (only for Biochemistry category)
CREATE TABLE IF NOT EXISTS public.machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, category_id)
);

-- Reagents
CREATE TABLE IF NOT EXISTS public.reagents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  unit TEXT DEFAULT 'bottles',
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  storage_condition TEXT DEFAULT 'Room Temperature',
  expiry_date DATE,
  lot_number TEXT,
  remarks TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, category_id, machine_id)
);

-- Stock transactions
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id SERIAL PRIMARY KEY,
  reagent_id INTEGER REFERENCES reagents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('withdraw', 'add')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'expiry', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reagent_id INTEGER REFERENCES reagents(id),
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reagents_category ON reagents(category_id);
CREATE INDEX IF NOT EXISTS idx_reagents_machine ON reagents(machine_id);
CREATE INDEX IF NOT EXISTS idx_reagents_stock ON reagents(current_stock, minimum_stock);
CREATE INDEX IF NOT EXISTS idx_transactions_reagent ON stock_transactions(reagent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON stock_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE reagents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users" ON profiles FOR INSERT TO authenticated WITH CHECK (true);

-- Categories policies
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Machines policies
CREATE POLICY "Anyone can view machines" ON machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage machines" ON machines FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Reagents policies
CREATE POLICY "Anyone can view reagents" ON reagents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage reagents" ON reagents FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can update reagent stock" ON reagents FOR UPDATE TO authenticated USING (true);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON stock_transactions FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can insert transactions" ON stock_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  user_role TEXT;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- First user becomes admin, others become technician
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'technician');
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update stock after transaction
CREATE OR REPLACE FUNCTION public.update_stock_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reagents 
  SET current_stock = NEW.new_stock, updated_at = NOW() 
  WHERE id = NEW.reagent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for stock update
DROP TRIGGER IF EXISTS on_transaction_insert ON stock_transactions;
CREATE TRIGGER on_transaction_insert
  AFTER INSERT ON stock_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_after_transaction();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert Categories
INSERT INTO categories (name, description, has_machines, color) VALUES
  ('Biochemistry', 'Biochemistry tests and reagents', true, '#3b82f6'),
  ('Hematology', 'Hematology tests and reagents', false, '#ef4444'),
  ('Laboratory Kits/Reagents', 'General laboratory kits and reagents', false, '#22c55e')
ON CONFLICT (name) DO NOTHING;

-- Insert Machines for Biochemistry
INSERT INTO machines (name, category_id, description) VALUES
  ('Zybio', 1, 'Zybio Biochemistry Analyzer'),
  ('Getein Biotech', 1, 'Getein Biotech Immunoassay Analyzer')
ON CONFLICT (name, category_id) DO NOTHING;

-- Insert Biochemistry Reagents - Zybio
INSERT INTO reagents (name, category_id, machine_id, unit, current_stock, minimum_stock, storage_condition) VALUES
  ('Glucose', 1, 1, 'bottles', 10, 5, '2-8°C'),
  ('Urea', 1, 1, 'bottles', 8, 5, '2-8°C'),
  ('Creatinine', 1, 1, 'bottles', 12, 5, '2-8°C'),
  ('Uric Acid', 1, 1, 'bottles', 7, 5, '2-8°C'),
  ('Cholesterol', 1, 1, 'bottles', 9, 5, '2-8°C'),
  ('Triglycerides', 1, 1, 'bottles', 11, 5, '2-8°C'),
  ('HDL-Cholesterol', 1, 1, 'bottles', 6, 5, '2-8°C'),
  ('LDL-Cholesterol', 1, 1, 'bottles', 8, 5, '2-8°C'),
  ('ALT/SGPT', 1, 1, 'bottles', 10, 5, '2-8°C'),
  ('AST/SGOT', 1, 1, 'bottles', 9, 5, '2-8°C'),
  ('Alkaline Phosphatase', 1, 1, 'bottles', 7, 5, '2-8°C'),
  ('Total Bilirubin', 1, 1, 'bottles', 8, 5, '2-8°C'),
  ('Direct Bilirubin', 1, 1, 'bottles', 6, 5, '2-8°C'),
  ('Total Protein', 1, 1, 'bottles', 10, 5, '2-8°C'),
  ('Albumin', 1, 1, 'bottles', 9, 5, '2-8°C'),
  ('Calcium', 1, 1, 'bottles', 7, 5, '2-8°C'),
  ('Phosphorus', 1, 1, 'bottles', 8, 5, '2-8°C')
ON CONFLICT (name, category_id, machine_id) DO NOTHING;

-- Insert Biochemistry Reagents - Getein Biotech
INSERT INTO reagents (name, category_id, machine_id, unit, current_stock, minimum_stock, storage_condition) VALUES
  ('HbA1c', 1, 2, 'kits', 5, 3, '2-8°C'),
  ('TSH', 1, 2, 'kits', 6, 3, '2-8°C'),
  ('T3', 1, 2, 'kits', 4, 3, '2-8°C'),
  ('T4', 1, 2, 'kits', 5, 3, '2-8°C'),
  ('Troponin I', 1, 2, 'kits', 5, 3, '2-8°C'),
  ('CRP', 1, 2, 'kits', 8, 3, '2-8°C'),
  ('Ferritin', 1, 2, 'kits', 5, 3, '2-8°C'),
  ('Vitamin D', 1, 2, 'kits', 6, 3, '2-8°C'),
  ('Beta-HCG', 1, 2, 'kits', 6, 3, '2-8°C'),
  ('PSA', 1, 2, 'kits', 3, 3, '2-8°C'),
  ('Procalcitonin', 1, 2, 'kits', 4, 3, '2-8°C')
ON CONFLICT (name, category_id, machine_id) DO NOTHING;

-- Insert Hematology Reagents (no machine)
INSERT INTO reagents (name, category_id, machine_id, unit, current_stock, minimum_stock, storage_condition) VALUES
  ('Diluent', 2, NULL, 'liters', 20, 10, 'Room Temperature'),
  ('Lyse', 2, NULL, 'liters', 15, 10, 'Room Temperature'),
  ('Rinse', 2, NULL, 'liters', 18, 10, 'Room Temperature'),
  ('Cleanser', 2, NULL, 'liters', 10, 5, 'Room Temperature'),
  ('Diff Pack', 2, NULL, 'kits', 8, 5, '2-8°C')
ON CONFLICT (name, category_id, machine_id) DO NOTHING;

-- Insert Laboratory Kits/Reagents (no machine)
INSERT INTO reagents (name, category_id, machine_id, unit, current_stock, minimum_stock, storage_condition) VALUES
  ('Urine Strips 10P', 3, NULL, 'bottles', 25, 10, 'Room Temperature'),
  ('Urine Strips 11P', 3, NULL, 'bottles', 20, 10, 'Room Temperature'),
  ('PT Reagent', 3, NULL, 'kits', 10, 5, '2-8°C'),
  ('APTT Reagent', 3, NULL, 'kits', 8, 5, '2-8°C'),
  ('D-Dimer', 3, NULL, 'kits', 6, 3, '2-8°C'),
  ('Blood Collection Tubes (EDTA)', 3, NULL, 'boxes', 15, 10, 'Room Temperature'),
  ('Blood Collection Tubes (Plain)', 3, NULL, 'boxes', 15, 10, 'Room Temperature'),
  ('Blood Collection Tubes (Fluoride)', 3, NULL, 'boxes', 10, 5, 'Room Temperature'),
  ('Lancets', 3, NULL, 'boxes', 20, 10, 'Room Temperature'),
  ('Slides', 3, NULL, 'boxes', 12, 5, 'Room Temperature')
ON CONFLICT (name, category_id, machine_id) DO NOTHING;

-- Verify
SELECT 'Categories: ' || COUNT(*)::TEXT FROM categories;
SELECT 'Machines: ' || COUNT(*)::TEXT FROM machines;
SELECT 'Reagents: ' || COUNT(*)::TEXT FROM reagents;
