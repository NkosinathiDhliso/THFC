-- Add all Spar stores from sparStores.ts to the database
-- This script inserts all stores, skipping any that already exist

INSERT INTO stores (id, name, address) VALUES
-- Western Cape
('spar-rondebosch', 'Spar Rondebosch', 'Rondebosch, Cape Town, Western Cape'),
('spar-claremont', 'Spar Claremont', 'Claremont, Cape Town, Western Cape'),
('spar-constantia', 'Spar Constantia', 'Constantia, Cape Town, Western Cape'),
('spar-newlands', 'Spar Newlands', 'Newlands, Cape Town, Western Cape'),
('spar-wynberg', 'Spar Wynberg', 'Wynberg, Cape Town, Western Cape'),
('spar-observatory', 'Spar Observatory', 'Observatory, Cape Town, Western Cape'),
('spar-woodstock', 'Spar Woodstock', 'Woodstock, Cape Town, Western Cape'),
('spar-sea-point', 'Spar Sea Point', 'Sea Point, Cape Town, Western Cape'),
('spar-camps-bay', 'Spar Camps Bay', 'Camps Bay, Cape Town, Western Cape'),
('spar-greenpoint', 'Spar Green Point', 'Green Point, Cape Town, Western Cape'),
('spar-cape-town-cbd', 'Spar Cape Town CBD', 'Cape Town CBD, Cape Town, Western Cape'),
('spar-bellville', 'Spar Bellville', 'Bellville, Cape Town, Western Cape'),
('spar-parow', 'Spar Parow', 'Parow, Cape Town, Western Cape'),
('spar-goodwood', 'Spar Goodwood', 'Goodwood, Cape Town, Western Cape'),
('spar-brackenfell', 'Spar Brackenfell', 'Brackenfell, Cape Town, Western Cape'),
('spar-durbanville', 'Spar Durbanville', 'Durbanville, Cape Town, Western Cape'),
('spar-stellenbosch', 'Spar Stellenbosch', 'Stellenbosch Central, Stellenbosch, Western Cape'),
('spar-paarl', 'Spar Paarl', 'Paarl Central, Paarl, Western Cape'),
('spar-somerset-west', 'Spar Somerset West', 'Somerset West, Western Cape'),
('spar-strand', 'Spar Strand', 'Strand, Western Cape'),
('spar-hermanus', 'Spar Hermanus', 'Hermanus, Western Cape'),
('spar-george', 'Spar George', 'George Central, George, Western Cape'),
('spar-knysna', 'Spar Knysna', 'Knysna Central, Knysna, Western Cape'),
('spar-plettenberg-bay', 'Spar Plettenberg Bay', 'Plettenberg Bay, Western Cape'),
('spar-mossel-bay', 'Spar Mossel Bay', 'Mossel Bay Central, Mossel Bay, Western Cape'),

-- Gauteng
('spar-sandton', 'Spar Sandton', 'Sandton, Johannesburg, Gauteng'),
('spar-rosebank', 'Spar Rosebank', 'Rosebank, Johannesburg, Gauteng'),
('spar-hyde-park', 'Spar Hyde Park', 'Hyde Park, Johannesburg, Gauteng'),
('spar-melville', 'Spar Melville', 'Melville, Johannesburg, Gauteng'),
('spar-parktown', 'Spar Parktown', 'Parktown, Johannesburg, Gauteng'),
('spar-randburg', 'Spar Randburg', 'Randburg, Johannesburg, Gauteng'),
('spar-fourways', 'Spar Fourways', 'Fourways, Johannesburg, Gauteng'),
('spar-bryanston', 'Spar Bryanston', 'Bryanston, Johannesburg, Gauteng'),
('spar-johannesburg-cbd', 'Spar Johannesburg CBD', 'Johannesburg CBD, Johannesburg, Gauteng'),
('spar-centurion', 'Spar Centurion', 'Centurion Central, Centurion, Gauteng'),
('spar-pretoria-cbd', 'Spar Pretoria CBD', 'Pretoria CBD, Pretoria, Gauteng'),
('spar-hatfield', 'Spar Hatfield', 'Hatfield, Pretoria, Gauteng'),
('spar-menlyn', 'Spar Menlyn', 'Menlyn, Pretoria, Gauteng'),
('spar-brooklyn', 'Spar Brooklyn', 'Brooklyn, Pretoria, Gauteng'),
('spar-germiston', 'Spar Germiston', 'Germiston Central, Germiston, Gauteng'),
('spar-benoni', 'Spar Benoni', 'Benoni Central, Benoni, Gauteng'),
('spar-boksburg', 'Spar Boksburg', 'Boksburg Central, Boksburg, Gauteng'),
('spar-kempton-park', 'Spar Kempton Park', 'Kempton Park Central, Kempton Park, Gauteng'),
('spar-edenvale', 'Spar Edenvale', 'Edenvale Central, Edenvale, Gauteng'),
('spar-alberton', 'Spar Alberton', 'Alberton Central, Alberton, Gauteng'),

-- KwaZulu-Natal
('spar-durban-cbd', 'Spar Durban CBD', 'Durban CBD, Durban, KwaZulu-Natal'),
('spar-umhlanga', 'Spar Umhlanga', 'Umhlanga, Durban, KwaZulu-Natal'),
('spar-westville', 'Spar Westville', 'Westville, Durban, KwaZulu-Natal'),
('spar-pinetown', 'Spar Pinetown', 'Pinetown, Durban, KwaZulu-Natal'),
('spar-chatsworth', 'Spar Chatsworth', 'Chatsworth, Durban, KwaZulu-Natal'),
('spar-phoenix', 'Spar Phoenix', 'Phoenix, Durban, KwaZulu-Natal'),
('spar-pietermaritzburg', 'Spar Pietermaritzburg', 'Pietermaritzburg Central, Pietermaritzburg, KwaZulu-Natal'),
('spar-richards-bay', 'Spar Richards Bay', 'Richards Bay Central, Richards Bay, KwaZulu-Natal'),
('spar-empangeni', 'Spar Empangeni', 'Empangeni Central, Empangeni, KwaZulu-Natal'),
('spar-vryheid', 'Spar Vryheid', 'Vryheid Central, Vryheid, KwaZulu-Natal'),
('spar-dundee', 'Spar Dundee', 'Dundee Central, Dundee, KwaZulu-Natal'),
('spar-newcastle', 'Spar Newcastle', 'Newcastle Central, Newcastle, KwaZulu-Natal'),
('spar-ladysmith', 'Spar Ladysmith', 'Ladysmith Central, Ladysmith, KwaZulu-Natal'),

-- Eastern Cape
('spar-port-elizabeth', 'Spar Port Elizabeth', 'Port Elizabeth Central, Port Elizabeth, Eastern Cape'),
('spar-east-london', 'Spar East London', 'East London Central, East London, Eastern Cape'),
('spar-grahamstown', 'Spar Grahamstown', 'Grahamstown Central, Grahamstown, Eastern Cape'),
('spar-king-williams-town', 'Spar King Williams Town', 'King Williams Town Central, King Williams Town, Eastern Cape'),
('spar-uitenhage', 'Spar Uitenhage', 'Uitenhage Central, Uitenhage, Eastern Cape'),

-- Free State
('spar-bloemfontein', 'Spar Bloemfontein', 'Bloemfontein Central, Bloemfontein, Free State'),
('spar-welkom', 'Spar Welkom', 'Welkom Central, Welkom, Free State'),
('spar-kroonstad', 'Spar Kroonstad', 'Kroonstad Central, Kroonstad, Free State'),

-- North West
('spar-rustenburg', 'Spar Rustenburg', 'Rustenburg Central, Rustenburg, North West'),
('spar-potchefstroom', 'Spar Potchefstroom', 'Potchefstroom Central, Potchefstroom, North West'),
('spar-klerksdorp', 'Spar Klerksdorp', 'Klerksdorp Central, Klerksdorp, North West'),

-- Limpopo
('spar-polokwane', 'Spar Polokwane', 'Polokwane Central, Polokwane, Limpopo'),
('spar-tzaneen', 'Spar Tzaneen', 'Tzaneen Central, Tzaneen, Limpopo'),
('spar-lephalale', 'Spar Lephalale', 'Lephalale Central, Lephalale, Limpopo'),

-- Mpumalanga
('spar-nelspruit', 'Spar Nelspruit', 'Nelspruit Central, Nelspruit, Mpumalanga'),
('spar-witbank', 'Spar Witbank', 'Witbank Central, Witbank, Mpumalanga'),
('spar-middelburg', 'Spar Middelburg', 'Middelburg Central, Middelburg, Mpumalanga'),

-- Northern Cape
('spar-kimberley', 'Spar Kimberley', 'Kimberley Central, Kimberley, Northern Cape'),
('spar-upington', 'Spar Upington', 'Upington Central, Upington, Northern Cape'),
('spar-kuruman', 'Spar Kuruman', 'Kuruman Central, Kuruman, Northern Cape')

ON CONFLICT (id) DO NOTHING;
