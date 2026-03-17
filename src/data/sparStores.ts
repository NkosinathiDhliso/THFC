// Comprehensive list of Spar stores across South Africa
export interface SparStore {
  id: string;
  name: string;
  city: string;
  province: string;
  suburb: string;
  address?: string;
}

export const sparStores: SparStore[] = [
  // Western Cape
  { id: 'spar-rondebosch', name: 'Spar Rondebosch', city: 'Cape Town', province: 'Western Cape', suburb: 'Rondebosch' },
  { id: 'spar-claremont', name: 'Spar Claremont', city: 'Cape Town', province: 'Western Cape', suburb: 'Claremont' },
  { id: 'spar-constantia', name: 'Spar Constantia', city: 'Cape Town', province: 'Western Cape', suburb: 'Constantia' },
  { id: 'spar-newlands', name: 'Spar Newlands', city: 'Cape Town', province: 'Western Cape', suburb: 'Newlands' },
  { id: 'spar-wynberg', name: 'Spar Wynberg', city: 'Cape Town', province: 'Western Cape', suburb: 'Wynberg' },
  { id: 'spar-observatory', name: 'Spar Observatory', city: 'Cape Town', province: 'Western Cape', suburb: 'Observatory' },
  { id: 'spar-woodstock', name: 'Spar Woodstock', city: 'Cape Town', province: 'Western Cape', suburb: 'Woodstock' },
  { id: 'spar-sea-point', name: 'Spar Sea Point', city: 'Cape Town', province: 'Western Cape', suburb: 'Sea Point' },
  { id: 'spar-camps-bay', name: 'Spar Camps Bay', city: 'Cape Town', province: 'Western Cape', suburb: 'Camps Bay' },
  { id: 'spar-greenpoint', name: 'Spar Green Point', city: 'Cape Town', province: 'Western Cape', suburb: 'Green Point' },
  { id: 'spar-cape-town-cbd', name: 'Spar Cape Town CBD', city: 'Cape Town', province: 'Western Cape', suburb: 'Cape Town CBD' },
  { id: 'spar-bellville', name: 'Spar Bellville', city: 'Cape Town', province: 'Western Cape', suburb: 'Bellville' },
  { id: 'spar-parow', name: 'Spar Parow', city: 'Cape Town', province: 'Western Cape', suburb: 'Parow' },
  { id: 'spar-goodwood', name: 'Spar Goodwood', city: 'Cape Town', province: 'Western Cape', suburb: 'Goodwood' },
  { id: 'spar-brackenfell', name: 'Spar Brackenfell', city: 'Cape Town', province: 'Western Cape', suburb: 'Brackenfell' },
  { id: 'spar-durbanville', name: 'Spar Durbanville', city: 'Cape Town', province: 'Western Cape', suburb: 'Durbanville' },
  { id: 'spar-stellenbosch', name: 'Spar Stellenbosch', city: 'Stellenbosch', province: 'Western Cape', suburb: 'Stellenbosch Central' },
  { id: 'spar-paarl', name: 'Spar Paarl', city: 'Paarl', province: 'Western Cape', suburb: 'Paarl Central' },
  { id: 'spar-somerset-west', name: 'Spar Somerset West', city: 'Somerset West', province: 'Western Cape', suburb: 'Somerset West' },
  { id: 'spar-strand', name: 'Spar Strand', city: 'Strand', province: 'Western Cape', suburb: 'Strand' },
  { id: 'spar-hermanus', name: 'Spar Hermanus', city: 'Hermanus', province: 'Western Cape', suburb: 'Hermanus' },
  { id: 'spar-george', name: 'Spar George', city: 'George', province: 'Western Cape', suburb: 'George Central' },
  { id: 'spar-knysna', name: 'Spar Knysna', city: 'Knysna', province: 'Western Cape', suburb: 'Knysna Central' },
  { id: 'spar-plettenberg-bay', name: 'Spar Plettenberg Bay', city: 'Plettenberg Bay', province: 'Western Cape', suburb: 'Plettenberg Bay' },
  { id: 'spar-mossel-bay', name: 'Spar Mossel Bay', city: 'Mossel Bay', province: 'Western Cape', suburb: 'Mossel Bay Central' },

  // Gauteng
  { id: 'spar-sandton', name: 'Spar Sandton', city: 'Johannesburg', province: 'Gauteng', suburb: 'Sandton' },
  { id: 'spar-rosebank', name: 'Spar Rosebank', city: 'Johannesburg', province: 'Gauteng', suburb: 'Rosebank' },
  { id: 'spar-hyde-park', name: 'Spar Hyde Park', city: 'Johannesburg', province: 'Gauteng', suburb: 'Hyde Park' },
  { id: 'spar-melville', name: 'Spar Melville', city: 'Johannesburg', province: 'Gauteng', suburb: 'Melville' },
  { id: 'spar-parktown', name: 'Spar Parktown', city: 'Johannesburg', province: 'Gauteng', suburb: 'Parktown' },
  { id: 'spar-randburg', name: 'Spar Randburg', city: 'Johannesburg', province: 'Gauteng', suburb: 'Randburg' },
  { id: 'spar-fourways', name: 'Spar Fourways', city: 'Johannesburg', province: 'Gauteng', suburb: 'Fourways' },
  { id: 'spar-bryanston', name: 'Spar Bryanston', city: 'Johannesburg', province: 'Gauteng', suburb: 'Bryanston' },
  { id: 'spar-johannesburg-cbd', name: 'Spar Johannesburg CBD', city: 'Johannesburg', province: 'Gauteng', suburb: 'Johannesburg CBD' },
  { id: 'spar-centurion', name: 'Spar Centurion', city: 'Centurion', province: 'Gauteng', suburb: 'Centurion Central' },
  { id: 'spar-pretoria-cbd', name: 'Spar Pretoria CBD', city: 'Pretoria', province: 'Gauteng', suburb: 'Pretoria CBD' },
  { id: 'spar-hatfield', name: 'Spar Hatfield', city: 'Pretoria', province: 'Gauteng', suburb: 'Hatfield' },
  { id: 'spar-brooklyn', name: 'Spar Brooklyn', city: 'Pretoria', province: 'Gauteng', suburb: 'Brooklyn' },
  { id: 'spar-menlyn', name: 'Spar Menlyn', city: 'Pretoria', province: 'Gauteng', suburb: 'Menlyn' },
  { id: 'spar-eastgate', name: 'Spar Eastgate', city: 'Johannesburg', province: 'Gauteng', suburb: 'Bedfordview' },
  { id: 'spar-benoni', name: 'Spar Benoni', city: 'Benoni', province: 'Gauteng', suburb: 'Benoni Central' },
  { id: 'spar-boksburg', name: 'Spar Boksburg', city: 'Boksburg', province: 'Gauteng', suburb: 'Boksburg Central' },
  { id: 'spar-germiston', name: 'Spar Germiston', city: 'Germiston', province: 'Gauteng', suburb: 'Germiston Central' },
  { id: 'spar-soweto', name: 'Spar Soweto', city: 'Johannesburg', province: 'Gauteng', suburb: 'Soweto' },
  { id: 'spar-alexandra', name: 'Spar Alexandra', city: 'Johannesburg', province: 'Gauteng', suburb: 'Alexandra' },

  // KwaZulu-Natal
  { id: 'spar-durban-cbd', name: 'Spar Durban CBD', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Durban CBD' },
  { id: 'spar-umhlanga', name: 'Spar Umhlanga', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Umhlanga' },
  { id: 'spar-westville', name: 'Spar Westville', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Westville' },
  { id: 'spar-pinetown', name: 'Spar Pinetown', city: 'Pinetown', province: 'KwaZulu-Natal', suburb: 'Pinetown Central' },
  { id: 'spar-chatsworth', name: 'Spar Chatsworth', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Chatsworth' },
  { id: 'spar-phoenix', name: 'Spar Phoenix', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Phoenix' },
  { id: 'spar-pietermaritzburg', name: 'Spar Pietermaritzburg', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', suburb: 'Pietermaritzburg Central' },
  { id: 'spar-richards-bay', name: 'Spar Richards Bay', city: 'Richards Bay', province: 'KwaZulu-Natal', suburb: 'Richards Bay Central' },
  { id: 'spar-newcastle', name: 'Spar Newcastle', city: 'Newcastle', province: 'KwaZulu-Natal', suburb: 'Newcastle Central' },
  { id: 'spar-ladysmith', name: 'Spar Ladysmith', city: 'Ladysmith', province: 'KwaZulu-Natal', suburb: 'Ladysmith Central' },

  // Eastern Cape
  { id: 'spar-port-elizabeth', name: 'Spar Port Elizabeth', city: 'Port Elizabeth', province: 'Eastern Cape', suburb: 'Port Elizabeth Central' },
  { id: 'spar-east-london', name: 'Spar East London', city: 'East London', province: 'Eastern Cape', suburb: 'East London Central' },
  { id: 'spar-grahamstown', name: 'Spar Grahamstown', city: 'Grahamstown', province: 'Eastern Cape', suburb: 'Grahamstown Central' },
  { id: 'spar-king-williams-town', name: 'Spar King Williams Town', city: 'King Williams Town', province: 'Eastern Cape', suburb: 'King Williams Town Central' },
  { id: 'spar-uitenhage', name: 'Spar Uitenhage', city: 'Uitenhage', province: 'Eastern Cape', suburb: 'Uitenhage Central' },

  // Free State
  { id: 'spar-bloemfontein', name: 'Spar Bloemfontein', city: 'Bloemfontein', province: 'Free State', suburb: 'Bloemfontein Central' },
  { id: 'spar-welkom', name: 'Spar Welkom', city: 'Welkom', province: 'Free State', suburb: 'Welkom Central' },
  { id: 'spar-kroonstad', name: 'Spar Kroonstad', city: 'Kroonstad', province: 'Free State', suburb: 'Kroonstad Central' },

  // North West
  { id: 'spar-rustenburg', name: 'Spar Rustenburg', city: 'Rustenburg', province: 'North West', suburb: 'Rustenburg Central' },
  { id: 'spar-potchefstroom', name: 'Spar Potchefstroom', city: 'Potchefstroom', province: 'North West', suburb: 'Potchefstroom Central' },
  { id: 'spar-klerksdorp', name: 'Spar Klerksdorp', city: 'Klerksdorp', province: 'North West', suburb: 'Klerksdorp Central' },

  // Limpopo
  { id: 'spar-polokwane', name: 'Spar Polokwane', city: 'Polokwane', province: 'Limpopo', suburb: 'Polokwane Central' },
  { id: 'spar-tzaneen', name: 'Spar Tzaneen', city: 'Tzaneen', province: 'Limpopo', suburb: 'Tzaneen Central' },
  { id: 'spar-lephalale', name: 'Spar Lephalale', city: 'Lephalale', province: 'Limpopo', suburb: 'Lephalale Central' },

  // Mpumalanga
  { id: 'spar-nelspruit', name: 'Spar Nelspruit', city: 'Nelspruit', province: 'Mpumalanga', suburb: 'Nelspruit Central' },
  { id: 'spar-witbank', name: 'Spar Witbank', city: 'Witbank', province: 'Mpumalanga', suburb: 'Witbank Central' },
  { id: 'spar-middelburg', name: 'Spar Middelburg', city: 'Middelburg', province: 'Mpumalanga', suburb: 'Middelburg Central' },

  // Northern Cape
  { id: 'spar-kimberley', name: 'Spar Kimberley', city: 'Kimberley', province: 'Northern Cape', suburb: 'Kimberley Central' },
  { id: 'spar-upington', name: 'Spar Upington', city: 'Upington', province: 'Northern Cape', suburb: 'Upington Central' },
];

// Helper function to search stores
export const searchSparStores = (query: string): SparStore[] => {
  if (!query.trim()) return sparStores;
  
  const searchTerm = query.toLowerCase().trim();
  
  return sparStores.filter(store => 
    store.name.toLowerCase().includes(searchTerm) ||
    store.city.toLowerCase().includes(searchTerm) ||
    store.province.toLowerCase().includes(searchTerm) ||
    store.suburb.toLowerCase().includes(searchTerm)
  );
};
