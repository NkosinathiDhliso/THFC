-- Add all missing Spar stores to the database
INSERT INTO stores (id, name, address) VALUES 
  -- Western Cape stores that might be missing
  ('spar-stellenbosch', 'Spar Stellenbosch', 'Stellenbosch Central, Stellenbosch, Western Cape'),
  ('spar-paarl', 'Spar Paarl', 'Paarl Central, Paarl, Western Cape'),
  ('spar-somerset-west', 'Spar Somerset West', 'Somerset West, Western Cape'),
  ('spar-hermanus', 'Spar Hermanus', 'Hermanus, Western Cape'),
  ('spar-george', 'Spar George', 'George Central, George, Western Cape'),
  ('spar-knysna', 'Spar Knysna', 'Knysna Central, Knysna, Western Cape'),
  ('spar-claremont', 'Spar Claremont', 'Claremont, Cape Town, Western Cape'),
  ('spar-rondebosch', 'Spar Rondebosch', 'Rondebosch, Cape Town, Western Cape'),
  ('spar-newlands', 'Spar Newlands', 'Newlands, Cape Town, Western Cape'),
  ('spar-wynberg', 'Spar Wynberg', 'Wynberg, Cape Town, Western Cape'),
  ('spar-observatory', 'Spar Observatory', 'Observatory, Cape Town, Western Cape'),
  ('spar-woodstock', 'Spar Woodstock', 'Woodstock, Cape Town, Western Cape'),
  ('spar-sea-point', 'Spar Sea Point', 'Sea Point, Cape Town, Western Cape'),
  ('spar-camps-bay', 'Spar Camps Bay', 'Camps Bay, Cape Town, Western Cape'),
  ('spar-greenpoint', 'Spar Green Point', 'Green Point, Cape Town, Western Cape'),
  
  -- Eastern Cape stores
  ('spar-east-london', 'Spar East London', 'East London Central, East London, Eastern Cape'),
  ('spar-port-elizabeth', 'Spar Port Elizabeth', 'Port Elizabeth Central, Port Elizabeth, Eastern Cape'),
  ('spar-grahamstown', 'Spar Grahamstown', 'Grahamstown Central, Grahamstown, Eastern Cape'),
  
  -- Gauteng stores
  ('spar-sandton', 'Spar Sandton', 'Sandton, Johannesburg, Gauteng'),
  ('spar-rosebank', 'Spar Rosebank', 'Rosebank, Johannesburg, Gauteng'),
  ('spar-melville', 'Spar Melville', 'Melville, Johannesburg, Gauteng'),
  ('spar-randburg', 'Spar Randburg', 'Randburg, Johannesburg, Gauteng'),
  ('spar-fourways', 'Spar Fourways', 'Fourways, Johannesburg, Gauteng'),
  ('spar-centurion', 'Spar Centurion', 'Centurion Central, Centurion, Gauteng'),
  ('spar-pretoria-cbd', 'Spar Pretoria CBD', 'Pretoria CBD, Pretoria, Gauteng'),
  
  -- KwaZulu-Natal stores
  ('spar-durban-cbd', 'Spar Durban CBD', 'Durban CBD, Durban, KwaZulu-Natal'),
  ('spar-umhlanga', 'Spar Umhlanga', 'Umhlanga, Durban, KwaZulu-Natal'),
  ('spar-westville', 'Spar Westville', 'Westville, Durban, KwaZulu-Natal'),
  ('spar-pietermaritzburg', 'Spar Pietermaritzburg', 'Pietermaritzburg Central, Pietermaritzburg, KwaZulu-Natal')
ON CONFLICT (id) DO NOTHING;

-- Show the count of stores
SELECT COUNT(*) as total_stores FROM stores;
