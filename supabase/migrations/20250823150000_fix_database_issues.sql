-- Fix database schema issues for THFCScan
-- This migration addresses the current runtime errors

BEGIN;

-- ============================================
-- 1. Ensure stores table has TEXT id (not UUID)
-- ============================================

-- First, check if we need to do anything
DO $$ 
DECLARE
    stores_id_type text;
BEGIN
    -- Get the current data type of stores.id
    SELECT data_type INTO stores_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'stores' 
    AND column_name = 'id' 
    AND table_schema = 'public';
    
    -- Only proceed if stores.id is currently UUID
    IF stores_id_type = 'uuid' THEN
        RAISE NOTICE 'Converting stores.id from UUID to TEXT';
        
        -- Step 1: Drop all dependent views
        DROP VIEW IF EXISTS donations_with_details CASCADE;
        DROP VIEW IF EXISTS donations_with_calculations CASCADE;
        DROP VIEW IF EXISTS stores_summary CASCADE;
        DROP VIEW IF EXISTS public.donations_with_details CASCADE;
        DROP VIEW IF EXISTS public.donations_with_calculations CASCADE;
        DROP VIEW IF EXISTS public.stores_summary CASCADE;
        
        -- Step 2: Drop foreign key constraints
        ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_store_id_fkey;
        ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_store_id_fkey;
        
        -- Step 3: Clear existing data to avoid conversion issues
        DELETE FROM donations WHERE store_id IS NOT NULL;
        DELETE FROM user_favorites WHERE store_id IS NOT NULL;
        DELETE FROM stores;
        
        -- Step 4: Change column types
        ALTER TABLE stores ALTER COLUMN id TYPE TEXT;
        ALTER TABLE stores ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE donations ALTER COLUMN store_id TYPE TEXT;
        
        -- Also fix user_favorites.store_id if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_favorites' 
                   AND column_name = 'store_id'
                   AND table_schema = 'public') THEN
            ALTER TABLE user_favorites ALTER COLUMN store_id TYPE TEXT;
        END IF;
        
        -- Step 5: Re-add foreign key constraints
        ALTER TABLE donations ADD CONSTRAINT donations_store_id_fkey 
            FOREIGN KEY (store_id) REFERENCES stores(id);
        ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_store_id_fkey 
            FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Successfully converted stores.id to TEXT';
    ELSE
        RAISE NOTICE 'stores.id is already TEXT, skipping conversion';
    END IF;
END $$;

-- ============================================
-- 2. Recreate views that may have been dropped
-- ============================================

-- Recreate donations_with_details view with TEXT store_id support
CREATE OR REPLACE VIEW donations_with_details AS
SELECT 
  d.*,
  s.name as store_name,
  s.address as store_address,
  p.full_name as collector_name,
  p.email as collector_email,
  p.role as collector_role,
  wp.price_per_loaf as white_bread_price_used,
  bp.price_per_loaf as brown_bread_price_used,
  -- Calculate total monetary value (with fallback if function doesn't exist)
  COALESCE(d.white_bread_monetary_value, d.white_bread_qty * 5.00) as total_white_bread_value,
  (d.brown_bread_qty * 5.50) as total_brown_bread_value,
  -- Calculate grand total (with fallback if function doesn't exist)
  COALESCE(d.white_bread_monetary_value, d.white_bread_qty * 5.00) + 
  (d.brown_bread_qty * 5.50) as total_donation_value
FROM donations d
LEFT JOIN stores s ON d.store_id = s.id
LEFT JOIN profiles p ON d.collector_id = p.id
LEFT JOIN bread_prices wp ON d.white_bread_price_id = wp.id
LEFT JOIN bread_prices bp ON d.brown_bread_price_id = bp.id;

-- Recreate stores_summary view with TEXT store_id support
CREATE OR REPLACE VIEW stores_summary AS
SELECT 
  s.id,
  s.name,
  s.address,
  COUNT(d.id) as total_donations,
  SUM(d.white_bread_qty) as total_white_bread,
  SUM(d.brown_bread_qty) as total_brown_bread,
  SUM(COALESCE(d.white_bread_monetary_value, d.white_bread_qty * 5.00) + 
      (d.brown_bread_qty * 5.50)) as total_value,
  MAX(d.collected_at) as last_donation_date
FROM stores s
LEFT JOIN donations d ON s.id = d.store_id
GROUP BY s.id, s.name, s.address
ORDER BY total_donations DESC, total_value DESC;

-- Grant permissions on recreated views
GRANT SELECT ON donations_with_details TO authenticated;
GRANT SELECT ON stores_summary TO authenticated;

-- ============================================
-- 3. Insert Spar stores data with TEXT IDs
-- ============================================

-- Insert stores from sparStores.ts
INSERT INTO stores (id, name, address) VALUES
  -- Just add the most commonly used stores for now, more can be added as needed
  ('spar-stellenbosch', 'Spar Stellenbosch', 'Stellenbosch, Western Cape'),
  ('spar-east-london', 'Spar East London', 'East London Central, East London, Eastern Cape'),
  ('spar-rondebosch', 'Spar Rondebosch', 'Rondebosch, Cape Town, Western Cape'),
  ('spar-claremont', 'Spar Claremont', 'Claremont, Cape Town, Western Cape'),
  ('spar-constantia', 'Spar Constantia', 'Constantia, Cape Town, Western Cape'),
  ('spar-newlands', 'Spar Newlands', 'Newlands, Cape Town, Western Cape'),
  ('spar-wynberg', 'Spar Wynberg', 'Wynberg, Cape Town, Western Cape'),
  ('spar-observatory', 'Spar Observatory', 'Observatory, Cape Town, Western Cape'),
  ('spar-woodstock', 'Spar Woodstock', 'Woodstock, Cape Town, Western Cape'),
  ('spar-sea-point', 'Spar Sea Point', 'Sea Point, Cape Town, Western Cape'),
  ('spar-camps-bay', 'Spar Camps Bay', 'Camps Bay, Cape Town, Western Cape'),
  ('spar-durban-cbd', 'Spar Durban CBD', 'Durban CBD, Durban, KwaZulu-Natal'),
  ('spar-johannesburg-cbd', 'Spar Johannesburg CBD', 'Johannesburg CBD, Johannesburg, Gauteng'),
  ('spar-pretoria-cbd', 'Spar Pretoria CBD', 'Pretoria CBD, Pretoria, Gauteng'),
  ('spar-port-elizabeth', 'Spar Port Elizabeth', 'Port Elizabeth Central, Port Elizabeth, Eastern Cape'),
  ('spar-bloemfontein', 'Spar Bloemfontein', 'Bloemfontein Central, Bloemfontein, Free State')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. Create storage bucket for donation photos
-- ============================================

-- Create the donation-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-photos', 'donation-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Set up storage policies
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Give users access to donation photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload donation photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to donation photos" ON storage.objects;

-- Create storage policies for donation photos
CREATE POLICY "Allow authenticated users to upload donation photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'donation-photos');

CREATE POLICY "Allow public access to donation photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'donation-photos');

CREATE POLICY "Allow users to update their own donation photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'donation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own donation photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'donation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 6. Ensure donations table has correct id column
-- ============================================

-- Make sure donations table has proper id column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'donations' 
                   AND column_name = 'id') THEN
        ALTER TABLE donations ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
END $$;

COMMIT;
