-- THFCScan Optimized Complete Database Schema
-- This migration creates all necessary tables, functions, and policies for THFCScan
-- Optimized for deployment and aligned with codebase requirements

BEGIN;

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create bread_prices table
CREATE TABLE IF NOT EXISTS public.bread_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type text NOT NULL CHECK (bread_type IN ('white', 'brown')),
  price_per_loaf decimal(10,2) NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  employee_id text,
  email text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'volunteer')),
  short_code text UNIQUE,
  short_code_created_at timestamptz,
  short_code_last_used timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id),
  store_name_manual text,
  white_bread_qty integer NOT NULL DEFAULT 0,
  brown_bread_qty integer NOT NULL DEFAULT 0,
  white_bread_monetary_value decimal(10,2),
  calculated_brown_bread_qty decimal(10,2),
  deficit_percentage_applied decimal(5,2) DEFAULT 5.6,
  calculation_notes text,
  photo_url text NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  collector_id uuid REFERENCES auth.users(id) NOT NULL,
  white_bread_price_id uuid REFERENCES public.bread_prices(id),
  brown_bread_price_id uuid REFERENCES public.bread_prices(id)
);

-- Create sales_periods table
CREATE TABLE IF NOT EXISTS public.sales_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_sales_amount decimal(12,2) NOT NULL DEFAULT 0,
  target_deficit_percentage decimal(5,2) DEFAULT 5.6,
  required_donation_value decimal(12,2),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create daily_donation_log table
CREATE TABLE IF NOT EXISTS public.daily_donation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL UNIQUE,
  total_donations integer DEFAULT 0,
  total_white_bread integer DEFAULT 0,
  total_brown_bread integer DEFAULT 0,
  total_monetary_value decimal(12,2) DEFAULT 0,
  summary_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_donation_summary table
CREATE TABLE IF NOT EXISTS public.daily_donation_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date date NOT NULL UNIQUE,
  total_donations integer NOT NULL DEFAULT 0,
  total_white_bread_qty integer NOT NULL DEFAULT 0,
  total_brown_bread_qty integer NOT NULL DEFAULT 0,
  total_monetary_value decimal(12,2) NOT NULL DEFAULT 0,
  unique_stores_count integer NOT NULL DEFAULT 0,
  unique_collectors_count integer NOT NULL DEFAULT 0,
  deficit_percentage decimal(5,2) NOT NULL DEFAULT 5.6,
  required_brown_bread_qty decimal(10,2) NOT NULL DEFAULT 0,
  deficit_amount decimal(10,2) NOT NULL DEFAULT 0,
  summary_data jsonb,
  photos_archive_url text,
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_credits table
CREATE TABLE IF NOT EXISTS public.daily_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_date date NOT NULL UNIQUE,
  total_white_bread_value decimal(12,2) NOT NULL DEFAULT 0,
  brown_bread_credit decimal(12,2) NOT NULL DEFAULT 0,
  deficit_percentage decimal(5,2) NOT NULL DEFAULT 5.6,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Create current_sales_data table
CREATE TABLE IF NOT EXISTS public.current_sales_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_period_id uuid REFERENCES public.sales_periods(id),
  total_sales_order_quantity integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ==============================================
-- VIEWS FOR OPTIMIZED QUERIES
-- ==============================================

-- Create donations_with_calculations view
CREATE OR REPLACE VIEW public.donations_with_calculations AS
SELECT 
  d.*,
  s.name as store_name,
  s.address as store_address,
  p.full_name as collector_name,
  p.email as collector_email,
  p.role as collector_role,
  wp.price_per_loaf as white_bread_price_used,
  bp.price_per_loaf as brown_bread_price_used,
  COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 8.80)) as calculated_white_bread_value,
  COALESCE(d.calculated_brown_bread_qty, 
    (COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 8.80)) * 
     COALESCE(d.deficit_percentage_applied, 5.6) / 100) / COALESCE(bp.price_per_loaf, 7.75)
  ) as calculated_brown_equivalent
FROM public.donations d
LEFT JOIN public.stores s ON d.store_id = s.id
LEFT JOIN public.profiles p ON d.collector_id = p.id
LEFT JOIN public.bread_prices wp ON d.white_bread_price_id = wp.id
LEFT JOIN public.bread_prices bp ON d.brown_bread_price_id = bp.id;

-- Create stores_summary view
CREATE OR REPLACE VIEW public.stores_summary AS
SELECT 
  s.id,
  s.name,
  s.address,
  s.created_at,
  COUNT(d.id) as total_donations,
  COALESCE(SUM(d.white_bread_qty), 0) as total_white_bread,
  COALESCE(SUM(d.brown_bread_qty), 0) as total_brown_bread,
  COALESCE(SUM(COALESCE(d.white_bread_monetary_value, d.white_bread_qty * 8.80)), 0) as total_value,
  MAX(d.collected_at) as last_donation_date,
  COUNT(DISTINCT d.collector_id) as unique_collectors
FROM public.stores s
LEFT JOIN public.donations d ON s.id = d.store_id
GROUP BY s.id, s.name, s.address, s.created_at;

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to get current bread price
CREATE OR REPLACE FUNCTION public.get_current_bread_price(bread_type_param text)
RETURNS decimal(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_price decimal(10,2);
BEGIN
  SELECT price_per_loaf INTO current_price
  FROM public.bread_prices
  WHERE bread_type = bread_type_param
    AND is_active = true
    AND effective_from <= now()
    AND (effective_until IS NULL OR effective_until > now())
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- Fallback to default prices
  IF current_price IS NULL THEN
    IF bread_type_param = 'white' THEN
      current_price := 8.80;
    ELSIF bread_type_param = 'brown' THEN
      current_price := 7.75;
    ELSE
      current_price := 8.00;
    END IF;
  END IF;
  
  RETURN current_price;
END;
$$;

-- Function to generate short codes
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  short_code text := '';
  i integer;
  code_exists boolean := true;
BEGIN
  WHILE code_exists LOOP
    short_code := '';
    FOR i IN 1..6 LOOP
      short_code := short_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE short_code = short_code) INTO code_exists;
  END LOOP;
  
  RETURN short_code;
END;
$$;

-- Function to calculate brown bread equivalent
CREATE OR REPLACE FUNCTION public.calculate_brown_bread_equivalent(
  white_bread_value numeric,
  deficit_percentage numeric DEFAULT 5.6
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  brown_bread_price numeric;
  brown_equivalent numeric;
BEGIN
  -- Get current brown bread price
  brown_bread_price := public.get_current_bread_price('brown');
  
  -- Calculate brown bread equivalent
  brown_equivalent := (white_bread_value * deficit_percentage / 100) / brown_bread_price;
  
  RETURN ROUND(brown_equivalent, 2);
END;
$$;

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_periods_updated_at 
  BEFORE UPDATE ON public.sales_periods 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_donation_log_updated_at 
  BEFORE UPDATE ON public.daily_donation_log 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_donation_summary_updated_at 
  BEFORE UPDATE ON public.daily_donation_summary 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_credits_updated_at 
  BEFORE UPDATE ON public.daily_credits 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_favorites_updated_at 
  BEFORE UPDATE ON public.user_favorites 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bread_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_donation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_donation_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_sales_data ENABLE ROW LEVEL SECURITY;

-- Stores policies
CREATE POLICY "Anyone can read stores" ON public.stores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stores" ON public.stores
  FOR INSERT TO authenticated WITH CHECK (true);

-- Bread prices policies
CREATE POLICY "Anyone can read bread prices" ON public.bread_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage bread prices" ON public.bread_prices
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Donations policies
CREATE POLICY "Users can read all donations" ON public.donations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own donations" ON public.donations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = collector_id);

CREATE POLICY "Users can update their own donations" ON public.donations
  FOR UPDATE TO authenticated USING (auth.uid() = collector_id);

-- Profiles policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User favorites policies
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Admin-only policies for administrative tables
CREATE POLICY "Admins can manage sales periods" ON public.sales_periods
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage daily logs" ON public.daily_donation_log
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage daily summaries" ON public.daily_donation_summary
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage daily credits" ON public.daily_credits
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage current sales data" ON public.current_sales_data
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Primary indexes for queries
CREATE INDEX IF NOT EXISTS idx_donations_collector_id ON public.donations(collector_id);
CREATE INDEX IF NOT EXISTS idx_donations_store_id ON public.donations(store_id);
CREATE INDEX IF NOT EXISTS idx_donations_collected_at ON public.donations(collected_at);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at);

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_short_code ON public.profiles(short_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Bread prices indexes
CREATE INDEX IF NOT EXISTS idx_bread_prices_active ON public.bread_prices(bread_type, is_active);
CREATE INDEX IF NOT EXISTS idx_bread_prices_effective ON public.bread_prices(effective_from, effective_until);

-- Date-based indexes
CREATE INDEX IF NOT EXISTS idx_daily_donation_log_date ON public.daily_donation_log(log_date);
CREATE INDEX IF NOT EXISTS idx_daily_donation_summary_date ON public.daily_donation_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_daily_credits_date ON public.daily_credits(credit_date);

-- Sales periods indexes
CREATE INDEX IF NOT EXISTS idx_sales_periods_status ON public.sales_periods(status);
CREATE INDEX IF NOT EXISTS idx_sales_periods_dates ON public.sales_periods(start_date, end_date);

-- ==============================================
-- INITIAL DATA
-- ==============================================

-- Insert default bread prices
INSERT INTO public.bread_prices (bread_type, price_per_loaf, effective_from, is_active) VALUES
  ('white', 8.80, now(), true),
  ('brown', 7.75, now(), true)
ON CONFLICT (bread_type, effective_from) DO NOTHING;

-- Insert some default stores (you can add more as needed)
INSERT INTO public.stores (name, address) VALUES
  ('Spar City Centre', '123 Main Street, Cape Town'),
  ('Spar Wynberg', '456 Wynberg Main Road, Wynberg'),
  ('Spar Claremont', '789 Claremont Street, Claremont')
ON CONFLICT (name) DO NOTHING;

COMMIT;
