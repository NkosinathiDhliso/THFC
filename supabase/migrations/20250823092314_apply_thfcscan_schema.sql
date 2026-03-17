-- THFCScan Complete Database Schema
-- This migration creates all necessary tables for the THFCScan application

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

-- Create sales_periods table
CREATE TABLE IF NOT EXISTS public.sales_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
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

-- Enable Row Level Security
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

-- Create policies for stores table
CREATE POLICY "Anyone can read stores" ON public.stores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stores" ON public.stores
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create policies for donations table
CREATE POLICY "Users can read all donations" ON public.donations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own donations" ON public.donations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = collector_id);

CREATE POLICY "Users can update their own donations" ON public.donations
  FOR UPDATE TO authenticated USING (auth.uid() = collector_id);

-- Create policies for profiles table
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Create policies for user_favorites table
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create policies for bread_prices table
CREATE POLICY "Anyone can read bread prices" ON public.bread_prices
  FOR SELECT TO authenticated USING (true);

-- Create basic functions
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

-- Create function to generate short codes
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

-- Insert default bread prices
INSERT INTO public.bread_prices (bread_type, price_per_loaf, effective_from, is_active) VALUES
  ('white', 8.80, now(), true),
  ('brown', 7.75, now(), true)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_collector_id ON public.donations(collector_id);
CREATE INDEX IF NOT EXISTS idx_donations_store_id ON public.donations(store_id);
CREATE INDEX IF NOT EXISTS idx_donations_collected_at ON public.donations(collected_at);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_short_code ON public.profiles(short_code);
CREATE INDEX IF NOT EXISTS idx_bread_prices_active ON public.bread_prices(bread_type, is_active);

-- Create trigger to update profiles updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
