-- Migration: Replace Spar stores with Boxer and Pick n Pay stores
-- This adds a 'brand' column and replaces all store data.

-- Add brand column if it doesn't exist
ALTER TABLE stores ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'boxer';

-- Remove all existing Spar stores
DELETE FROM stores WHERE name LIKE 'Spar %';

-- Insert Boxer stores
INSERT INTO stores (id, name, city, province, suburb, brand) VALUES
  -- Western Cape
  ('boxer-bellville', 'Boxer Bellville', 'Cape Town', 'Western Cape', 'Bellville', 'boxer'),
  ('boxer-parow', 'Boxer Parow', 'Cape Town', 'Western Cape', 'Parow', 'boxer'),
  ('boxer-goodwood', 'Boxer Goodwood', 'Cape Town', 'Western Cape', 'Goodwood', 'boxer'),
  ('boxer-brackenfell', 'Boxer Brackenfell', 'Cape Town', 'Western Cape', 'Brackenfell', 'boxer'),
  ('boxer-khayelitsha', 'Boxer Khayelitsha', 'Cape Town', 'Western Cape', 'Khayelitsha', 'boxer'),
  ('boxer-mitchells-plain', 'Boxer Mitchells Plain', 'Cape Town', 'Western Cape', 'Mitchells Plain', 'boxer'),
  ('boxer-delft', 'Boxer Delft', 'Cape Town', 'Western Cape', 'Delft', 'boxer'),
  ('boxer-gugulethu', 'Boxer Gugulethu', 'Cape Town', 'Western Cape', 'Gugulethu', 'boxer'),
  ('boxer-george', 'Boxer George', 'George', 'Western Cape', 'George Central', 'boxer'),
  ('boxer-worcester', 'Boxer Worcester', 'Worcester', 'Western Cape', 'Worcester Central', 'boxer'),
  -- Gauteng
  ('boxer-soweto', 'Boxer Soweto', 'Johannesburg', 'Gauteng', 'Soweto', 'boxer'),
  ('boxer-alexandra', 'Boxer Alexandra', 'Johannesburg', 'Gauteng', 'Alexandra', 'boxer'),
  ('boxer-tembisa', 'Boxer Tembisa', 'Johannesburg', 'Gauteng', 'Tembisa', 'boxer'),
  ('boxer-germiston', 'Boxer Germiston', 'Germiston', 'Gauteng', 'Germiston Central', 'boxer'),
  ('boxer-benoni', 'Boxer Benoni', 'Benoni', 'Gauteng', 'Benoni Central', 'boxer'),
  ('boxer-boksburg', 'Boxer Boksburg', 'Boksburg', 'Gauteng', 'Boksburg Central', 'boxer'),
  ('boxer-springs', 'Boxer Springs', 'Springs', 'Gauteng', 'Springs Central', 'boxer'),
  ('boxer-pretoria-cbd', 'Boxer Pretoria CBD', 'Pretoria', 'Gauteng', 'Pretoria CBD', 'boxer'),
  ('boxer-mamelodi', 'Boxer Mamelodi', 'Pretoria', 'Gauteng', 'Mamelodi', 'boxer'),
  ('boxer-atteridgeville', 'Boxer Atteridgeville', 'Pretoria', 'Gauteng', 'Atteridgeville', 'boxer'),
  -- KwaZulu-Natal
  ('boxer-durban-cbd', 'Boxer Durban CBD', 'Durban', 'KwaZulu-Natal', 'Durban CBD', 'boxer'),
  ('boxer-pinetown', 'Boxer Pinetown', 'Pinetown', 'KwaZulu-Natal', 'Pinetown Central', 'boxer'),
  ('boxer-chatsworth', 'Boxer Chatsworth', 'Durban', 'KwaZulu-Natal', 'Chatsworth', 'boxer'),
  ('boxer-phoenix', 'Boxer Phoenix', 'Durban', 'KwaZulu-Natal', 'Phoenix', 'boxer'),
  ('boxer-umlazi', 'Boxer Umlazi', 'Durban', 'KwaZulu-Natal', 'Umlazi', 'boxer'),
  ('boxer-pietermaritzburg', 'Boxer Pietermaritzburg', 'Pietermaritzburg', 'KwaZulu-Natal', 'Pietermaritzburg Central', 'boxer'),
  ('boxer-richards-bay', 'Boxer Richards Bay', 'Richards Bay', 'KwaZulu-Natal', 'Richards Bay Central', 'boxer'),
  ('boxer-newcastle', 'Boxer Newcastle', 'Newcastle', 'KwaZulu-Natal', 'Newcastle Central', 'boxer'),
  ('boxer-ladysmith', 'Boxer Ladysmith', 'Ladysmith', 'KwaZulu-Natal', 'Ladysmith Central', 'boxer'),
  ('boxer-empangeni', 'Boxer Empangeni', 'Empangeni', 'KwaZulu-Natal', 'Empangeni Central', 'boxer'),
  -- Eastern Cape
  ('boxer-port-elizabeth', 'Boxer Port Elizabeth', 'Port Elizabeth', 'Eastern Cape', 'Port Elizabeth Central', 'boxer'),
  ('boxer-east-london', 'Boxer East London', 'East London', 'Eastern Cape', 'East London Central', 'boxer'),
  ('boxer-mthatha', 'Boxer Mthatha', 'Mthatha', 'Eastern Cape', 'Mthatha Central', 'boxer'),
  ('boxer-king-williams-town', 'Boxer King Williams Town', 'King Williams Town', 'Eastern Cape', 'King Williams Town Central', 'boxer'),
  ('boxer-uitenhage', 'Boxer Uitenhage', 'Uitenhage', 'Eastern Cape', 'Uitenhage Central', 'boxer'),
  -- Free State
  ('boxer-bloemfontein', 'Boxer Bloemfontein', 'Bloemfontein', 'Free State', 'Bloemfontein Central', 'boxer'),
  ('boxer-welkom', 'Boxer Welkom', 'Welkom', 'Free State', 'Welkom Central', 'boxer'),
  ('boxer-kroonstad', 'Boxer Kroonstad', 'Kroonstad', 'Free State', 'Kroonstad Central', 'boxer'),
  -- North West
  ('boxer-rustenburg', 'Boxer Rustenburg', 'Rustenburg', 'North West', 'Rustenburg Central', 'boxer'),
  ('boxer-potchefstroom', 'Boxer Potchefstroom', 'Potchefstroom', 'North West', 'Potchefstroom Central', 'boxer'),
  ('boxer-klerksdorp', 'Boxer Klerksdorp', 'Klerksdorp', 'North West', 'Klerksdorp Central', 'boxer'),
  -- Limpopo
  ('boxer-polokwane', 'Boxer Polokwane', 'Polokwane', 'Limpopo', 'Polokwane Central', 'boxer'),
  ('boxer-tzaneen', 'Boxer Tzaneen', 'Tzaneen', 'Limpopo', 'Tzaneen Central', 'boxer'),
  ('boxer-lephalale', 'Boxer Lephalale', 'Lephalale', 'Limpopo', 'Lephalale Central', 'boxer'),
  ('boxer-thohoyandou', 'Boxer Thohoyandou', 'Thohoyandou', 'Limpopo', 'Thohoyandou Central', 'boxer'),
  -- Mpumalanga
  ('boxer-nelspruit', 'Boxer Nelspruit', 'Nelspruit', 'Mpumalanga', 'Nelspruit Central', 'boxer'),
  ('boxer-witbank', 'Boxer Witbank', 'Witbank', 'Mpumalanga', 'Witbank Central', 'boxer'),
  ('boxer-middelburg', 'Boxer Middelburg', 'Middelburg', 'Mpumalanga', 'Middelburg Central', 'boxer'),
  -- Northern Cape
  ('boxer-kimberley', 'Boxer Kimberley', 'Kimberley', 'Northern Cape', 'Kimberley Central', 'boxer'),
  ('boxer-upington', 'Boxer Upington', 'Upington', 'Northern Cape', 'Upington Central', 'boxer')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand;

-- Insert Pick n Pay stores
INSERT INTO stores (id, name, city, province, suburb, brand) VALUES
  -- Western Cape
  ('pnp-rondebosch', 'Pick n Pay Rondebosch', 'Cape Town', 'Western Cape', 'Rondebosch', 'pnp'),
  ('pnp-claremont', 'Pick n Pay Claremont', 'Cape Town', 'Western Cape', 'Claremont', 'pnp'),
  ('pnp-constantia', 'Pick n Pay Constantia', 'Cape Town', 'Western Cape', 'Constantia', 'pnp'),
  ('pnp-newlands', 'Pick n Pay Newlands', 'Cape Town', 'Western Cape', 'Newlands', 'pnp'),
  ('pnp-sea-point', 'Pick n Pay Sea Point', 'Cape Town', 'Western Cape', 'Sea Point', 'pnp'),
  ('pnp-greenpoint', 'Pick n Pay Green Point', 'Cape Town', 'Western Cape', 'Green Point', 'pnp'),
  ('pnp-cape-town-cbd', 'Pick n Pay Cape Town CBD', 'Cape Town', 'Western Cape', 'Cape Town CBD', 'pnp'),
  ('pnp-bellville', 'Pick n Pay Bellville', 'Cape Town', 'Western Cape', 'Bellville', 'pnp'),
  ('pnp-durbanville', 'Pick n Pay Durbanville', 'Cape Town', 'Western Cape', 'Durbanville', 'pnp'),
  ('pnp-stellenbosch', 'Pick n Pay Stellenbosch', 'Stellenbosch', 'Western Cape', 'Stellenbosch Central', 'pnp'),
  ('pnp-paarl', 'Pick n Pay Paarl', 'Paarl', 'Western Cape', 'Paarl Central', 'pnp'),
  ('pnp-somerset-west', 'Pick n Pay Somerset West', 'Somerset West', 'Western Cape', 'Somerset West', 'pnp'),
  ('pnp-george', 'Pick n Pay George', 'George', 'Western Cape', 'George Central', 'pnp'),
  ('pnp-knysna', 'Pick n Pay Knysna', 'Knysna', 'Western Cape', 'Knysna Central', 'pnp'),
  -- Gauteng
  ('pnp-sandton', 'Pick n Pay Sandton', 'Johannesburg', 'Gauteng', 'Sandton', 'pnp'),
  ('pnp-rosebank', 'Pick n Pay Rosebank', 'Johannesburg', 'Gauteng', 'Rosebank', 'pnp'),
  ('pnp-hyde-park', 'Pick n Pay Hyde Park', 'Johannesburg', 'Gauteng', 'Hyde Park', 'pnp'),
  ('pnp-fourways', 'Pick n Pay Fourways', 'Johannesburg', 'Gauteng', 'Fourways', 'pnp'),
  ('pnp-bryanston', 'Pick n Pay Bryanston', 'Johannesburg', 'Gauteng', 'Bryanston', 'pnp'),
  ('pnp-johannesburg-cbd', 'Pick n Pay Johannesburg CBD', 'Johannesburg', 'Gauteng', 'Johannesburg CBD', 'pnp'),
  ('pnp-centurion', 'Pick n Pay Centurion', 'Centurion', 'Gauteng', 'Centurion Central', 'pnp'),
  ('pnp-pretoria-cbd', 'Pick n Pay Pretoria CBD', 'Pretoria', 'Gauteng', 'Pretoria CBD', 'pnp'),
  ('pnp-hatfield', 'Pick n Pay Hatfield', 'Pretoria', 'Gauteng', 'Hatfield', 'pnp'),
  ('pnp-menlyn', 'Pick n Pay Menlyn', 'Pretoria', 'Gauteng', 'Menlyn', 'pnp'),
  ('pnp-eastgate', 'Pick n Pay Eastgate', 'Johannesburg', 'Gauteng', 'Bedfordview', 'pnp'),
  -- KwaZulu-Natal
  ('pnp-durban-cbd', 'Pick n Pay Durban CBD', 'Durban', 'KwaZulu-Natal', 'Durban CBD', 'pnp'),
  ('pnp-umhlanga', 'Pick n Pay Umhlanga', 'Durban', 'KwaZulu-Natal', 'Umhlanga', 'pnp'),
  ('pnp-westville', 'Pick n Pay Westville', 'Durban', 'KwaZulu-Natal', 'Westville', 'pnp'),
  ('pnp-pinetown', 'Pick n Pay Pinetown', 'Pinetown', 'KwaZulu-Natal', 'Pinetown Central', 'pnp'),
  ('pnp-pietermaritzburg', 'Pick n Pay Pietermaritzburg', 'Pietermaritzburg', 'KwaZulu-Natal', 'Pietermaritzburg Central', 'pnp'),
  ('pnp-richards-bay', 'Pick n Pay Richards Bay', 'Richards Bay', 'KwaZulu-Natal', 'Richards Bay Central', 'pnp'),
  -- Eastern Cape
  ('pnp-port-elizabeth', 'Pick n Pay Port Elizabeth', 'Port Elizabeth', 'Eastern Cape', 'Port Elizabeth Central', 'pnp'),
  ('pnp-east-london', 'Pick n Pay East London', 'East London', 'Eastern Cape', 'East London Central', 'pnp'),
  -- Free State
  ('pnp-bloemfontein', 'Pick n Pay Bloemfontein', 'Bloemfontein', 'Free State', 'Bloemfontein Central', 'pnp'),
  -- North West
  ('pnp-rustenburg', 'Pick n Pay Rustenburg', 'Rustenburg', 'North West', 'Rustenburg Central', 'pnp'),
  ('pnp-potchefstroom', 'Pick n Pay Potchefstroom', 'Potchefstroom', 'North West', 'Potchefstroom Central', 'pnp'),
  -- Limpopo
  ('pnp-polokwane', 'Pick n Pay Polokwane', 'Polokwane', 'Limpopo', 'Polokwane Central', 'pnp'),
  -- Mpumalanga
  ('pnp-nelspruit', 'Pick n Pay Nelspruit', 'Nelspruit', 'Mpumalanga', 'Nelspruit Central', 'pnp'),
  ('pnp-witbank', 'Pick n Pay Witbank', 'Witbank', 'Mpumalanga', 'Witbank Central', 'pnp'),
  -- Northern Cape
  ('pnp-kimberley', 'Pick n Pay Kimberley', 'Kimberley', 'Northern Cape', 'Kimberley Central', 'pnp')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand;
