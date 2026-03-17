-- Fix stores table id column type to match application expectations
-- Change from UUID to TEXT to align with sparStores.ts string IDs

-- Step 1: Drop dependent views that reference stores table
DROP VIEW IF EXISTS donations_with_details;
DROP VIEW IF EXISTS stores_summary;

-- Step 2: Drop the foreign key constraint from donations table
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_store_id_fkey;

-- Step 3: Drop existing stores data to avoid type conversion issues
DELETE FROM stores;

-- Step 4: Change the stores table id column from UUID to TEXT
ALTER TABLE stores ALTER COLUMN id TYPE TEXT;
ALTER TABLE stores ALTER COLUMN id DROP DEFAULT;

-- Step 5: Change the donations table store_id column from UUID to TEXT
ALTER TABLE donations ALTER COLUMN store_id TYPE TEXT;

-- Re-add the foreign key constraint with the correct types
ALTER TABLE donations ADD CONSTRAINT donations_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES stores(id);

-- Insert the actual store data from sparStores.ts with string IDs
INSERT INTO stores (id, name, address) VALUES
  ('spar-cape-town-cbd', 'Spar Cape Town CBD', 'Cape Town CBD, Western Cape'),
  ('spar-bellville', 'Spar Bellville', 'Bellville, Cape Town, Western Cape'),
  ('spar-parow', 'Spar Parow', 'Parow, Cape Town, Western Cape'),
  ('spar-goodwood', 'Spar Goodwood', 'Goodwood, Cape Town, Western Cape'),
  ('spar-brackenfell', 'Spar Brackenfell', 'Brackenfell, Cape Town, Western Cape'),
  ('spar-durbanville', 'Spar Durbanville', 'Durbanville, Cape Town, Western Cape'),
  ('spar-stellenbosch', 'Spar Stellenbosch', 'Stellenbosch Central, Western Cape'),
  ('spar-paarl', 'Spar Paarl', 'Paarl Central, Western Cape'),
  ('spar-somerset-west', 'Spar Somerset West', 'Somerset West, Western Cape'),
  ('spar-strand', 'Spar Strand', 'Strand, Western Cape'),
  ('spar-hermanus', 'Spar Hermanus', 'Hermanus, Western Cape'),
  ('spar-george', 'Spar George', 'George Central, Western Cape'),
  ('spar-knysna', 'Spar Knysna', 'Knysna Central, Western Cape'),
  ('spar-plettenberg-bay', 'Spar Plettenberg Bay', 'Plettenberg Bay, Western Cape'),
  ('spar-mossel-bay', 'Spar Mossel Bay', 'Mossel Bay Central, Western Cape'),
  ('spar-sandton', 'Spar Sandton', 'Sandton, Johannesburg, Gauteng'),
  ('spar-rosebank', 'Spar Rosebank', 'Rosebank, Johannesburg, Gauteng'),
  ('spar-hyde-park', 'Spar Hyde Park', 'Hyde Park, Johannesburg, Gauteng'),
  ('spar-melville', 'Spar Melville', 'Melville, Johannesburg, Gauteng'),
  ('spar-centurion', 'Spar Centurion', 'Centurion Central, Gauteng'),
  ('spar-pretoria-cbd', 'Spar Pretoria CBD', 'Pretoria CBD, Gauteng'),
  ('spar-hatfield', 'Spar Hatfield', 'Hatfield, Pretoria, Gauteng'),
  ('spar-brooklyn', 'Spar Brooklyn', 'Brooklyn, Pretoria, Gauteng'),
  ('spar-menlyn', 'Spar Menlyn', 'Menlyn, Pretoria, Gauteng'),
  ('spar-eastgate', 'Spar Eastgate', 'Bedfordview, Johannesburg, Gauteng'),
  ('spar-benoni', 'Spar Benoni', 'Benoni Central, Gauteng'),
  ('spar-boksburg', 'Spar Boksburg', 'Boksburg Central, Gauteng'),
  ('spar-germiston', 'Spar Germiston', 'Germiston Central, Gauteng'),
  ('spar-soweto', 'Spar Soweto', 'Soweto, Johannesburg, Gauteng'),
  ('spar-alexandra', 'Spar Alexandra', 'Alexandra, Johannesburg, Gauteng'),
  ('spar-durban-cbd', 'Spar Durban CBD', 'Durban CBD, KwaZulu-Natal'),
  ('spar-umhlanga', 'Spar Umhlanga', 'Umhlanga, Durban, KwaZulu-Natal'),
  ('spar-westville', 'Spar Westville', 'Westville, Durban, KwaZulu-Natal'),
  ('spar-pinetown', 'Spar Pinetown', 'Pinetown Central, KwaZulu-Natal'),
  ('spar-chatsworth', 'Spar Chatsworth', 'Chatsworth, Durban, KwaZulu-Natal'),
  ('spar-phoenix', 'Spar Phoenix', 'Phoenix, Durban, KwaZulu-Natal'),
  ('spar-pietermaritzburg', 'Spar Pietermaritzburg', 'Pietermaritzburg Central, KwaZulu-Natal'),
  ('spar-port-elizabeth', 'Spar Port Elizabeth', 'Port Elizabeth Central, Eastern Cape'),
  ('spar-east-london', 'Spar East London', 'East London Central, Eastern Cape'),
  ('spar-grahamstown', 'Spar Grahamstown', 'Grahamstown Central, Eastern Cape'),
  ('spar-king-williams-town', 'Spar King Williams Town', 'King Williams Town Central, Eastern Cape'),
  ('spar-uitenhage', 'Spar Uitenhage', 'Uitenhage Central, Eastern Cape'),
  ('spar-bloemfontein', 'Spar Bloemfontein', 'Bloemfontein Central, Free State'),
  ('spar-welkom', 'Spar Welkom', 'Welkom Central, Free State'),
  ('spar-kroonstad', 'Spar Kroonstad', 'Kroonstad Central, Free State'),
  ('spar-polokwane', 'Spar Polokwane', 'Polokwane Central, Limpopo'),
  ('spar-tzaneen', 'Spar Tzaneen', 'Tzaneen Central, Limpopo'),
  ('spar-lephalale', 'Spar Lephalale', 'Lephalale Central, Limpopo'),
  ('spar-nelspruit', 'Spar Nelspruit', 'Nelspruit Central, Mpumalanga'),
  ('spar-witbank', 'Spar Witbank', 'Witbank Central, Mpumalanga'),
  ('spar-middelburg', 'Spar Middelburg', 'Middelburg Central, Mpumalanga'),
  ('spar-kimberley', 'Spar Kimberley', 'Kimberley Central, Northern Cape'),
  ('spar-upington', 'Spar Upington', 'Upington Central, Northern Cape')
ON CONFLICT (name) DO NOTHING;

-- Step 7: Recreate the views with correct TEXT type for store_id
-- Recreate donations_with_details view
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
  -- Calculate total monetary value
  COALESCE(d.white_bread_monetary_value, d.white_bread_qty * get_current_bread_price('white')) as total_white_bread_value,
  (d.brown_bread_qty * get_current_bread_price('brown')) as total_brown_bread_value,
  -- Calculate grand total
  COALESCE(d.white_bread_monetary_value, d.white_bread_qty * get_current_bread_price('white')) + 
  (d.brown_bread_qty * get_current_bread_price('brown')) as total_donation_value
FROM donations d
LEFT JOIN stores s ON d.store_id = s.id
LEFT JOIN profiles p ON d.collector_id = p.id
LEFT JOIN bread_prices wp ON d.white_bread_price_id = wp.id
LEFT JOIN bread_prices bp ON d.brown_bread_price_id = bp.id;

-- Recreate stores_summary view
CREATE OR REPLACE VIEW stores_summary AS
SELECT 
  s.id,
  s.name,
  s.address,
  COUNT(d.id) as total_donations,
  SUM(d.white_bread_qty) as total_white_bread,
  SUM(d.brown_bread_qty) as total_brown_bread,
  SUM(COALESCE(d.white_bread_monetary_value, d.white_bread_qty * get_current_bread_price('white')) + 
      (d.brown_bread_qty * get_current_bread_price('brown'))) as total_value,
  MAX(d.collected_at) as last_donation_date
FROM stores s
LEFT JOIN donations d ON s.id = d.store_id
GROUP BY s.id, s.name, s.address
ORDER BY total_donations DESC, total_value DESC;

-- Grant permissions on recreated views
GRANT SELECT ON donations_with_details TO authenticated;
GRANT SELECT ON stores_summary TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN stores.id IS 'Store identifier matching sparStores.ts string IDs';
COMMENT ON VIEW donations_with_details IS 'Comprehensive view of donations with all related store, collector, and pricing data';
COMMENT ON VIEW stores_summary IS 'Summary statistics for each store showing donation totals and values';