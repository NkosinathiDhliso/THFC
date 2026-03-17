/*
  # THFCScan Database Schema

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `address` (text, nullable)
    - `donations`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to stores, nullable)
      - `store_name_manual` (text, nullable for manual entry)
      - `white_bread_qty` (integer, not null, default 0)
      - `brown_bread_qty` (integer, not null, default 0)
      - `photo_url` (text, not null)
      - `collected_at` (timestamptz, not null, default now())
      - `collector_id` (uuid, foreign key to auth.users, not null)
    - `zoho_sales_data`
      - `id` (uuid, primary key)
      - `total_sales_order_quantity` (integer, not null)
      - `last_updated_at` (timestamptz, not null, default now())
    - `profiles`
      - `id` (uuid, primary key, foreign key to auth.users)
      - `full_name` (text, nullable)
      - `employee_id` (text, nullable)
      - `email` (text, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for donations and profiles access
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id),
  store_name_manual text,
  white_bread_qty integer NOT NULL DEFAULT 0,
  brown_bread_qty integer NOT NULL DEFAULT 0,
  photo_url text NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  collector_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create zoho_sales_data table
CREATE TABLE IF NOT EXISTS zoho_sales_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_sales_order_quantity integer NOT NULL,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  employee_id text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for stores table
CREATE POLICY "Anyone can read stores"
  ON stores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only authenticated users can insert stores"
  ON stores
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for donations table
CREATE POLICY "Users can read all donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own donations"
  ON donations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = collector_id);

CREATE POLICY "Users can update their own donations"
  ON donations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = collector_id)
  WITH CHECK (auth.uid() = collector_id);

-- Create policies for zoho_sales_data table
CREATE POLICY "Anyone can read sales data"
  ON zoho_sales_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales data"
  ON zoho_sales_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales data"
  ON zoho_sales_data
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for profiles table
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert some sample Spar stores
INSERT INTO stores (name, address) VALUES
  ('Spar Rondebosch', '123 Main Road, Rondebosch, Cape Town'),
  ('Spar Claremont', '456 Claremont Road, Claremont, Cape Town'),
  ('Spar Wynberg', '789 Wynberg Street, Wynberg, Cape Town'),
  ('Spar Constantia', '321 Constantia Road, Constantia, Cape Town'),
  ('Spar Bellville', '654 Bellville Avenue, Bellville, Cape Town'),
  ('Spar Parow', '987 Parow Street, Parow, Cape Town'),
  ('Spar Goodwood', '147 Goodwood Road, Goodwood, Cape Town'),
  ('Spar Brackenfell', '258 Brackenfell Boulevard, Brackenfell, Cape Town'),
  ('Spar Durbanville', '369 Durbanville Drive, Durbanville, Cape Town'),
  ('Spar Stellenbosch', '741 Stellenbosch Street, Stellenbosch')
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();