// Comprehensive list of Boxer and Pick n Pay stores across South Africa
export interface Store {
  id: string;
  name: string;
  city: string;
  province: string;
  suburb: string;
  address?: string;
  brand: 'boxer' | 'pnp';
}

export const stores: Store[] = [
  // === BOXER STORES ===

  // Western Cape
  { id: 'boxer-bellville', name: 'Boxer Bellville', city: 'Cape Town', province: 'Western Cape', suburb: 'Bellville', brand: 'boxer' },
  { id: 'boxer-parow', name: 'Boxer Parow', city: 'Cape Town', province: 'Western Cape', suburb: 'Parow', brand: 'boxer' },
  { id: 'boxer-goodwood', name: 'Boxer Goodwood', city: 'Cape Town', province: 'Western Cape', suburb: 'Goodwood', brand: 'boxer' },
  { id: 'boxer-brackenfell', name: 'Boxer Brackenfell', city: 'Cape Town', province: 'Western Cape', suburb: 'Brackenfell', brand: 'boxer' },
  { id: 'boxer-khayelitsha', name: 'Boxer Khayelitsha', city: 'Cape Town', province: 'Western Cape', suburb: 'Khayelitsha', brand: 'boxer' },
  { id: 'boxer-mitchells-plain', name: 'Boxer Mitchells Plain', city: 'Cape Town', province: 'Western Cape', suburb: 'Mitchells Plain', brand: 'boxer' },
  { id: 'boxer-delft', name: 'Boxer Delft', city: 'Cape Town', province: 'Western Cape', suburb: 'Delft', brand: 'boxer' },
  { id: 'boxer-gugulethu', name: 'Boxer Gugulethu', city: 'Cape Town', province: 'Western Cape', suburb: 'Gugulethu', brand: 'boxer' },
  { id: 'boxer-george', name: 'Boxer George', city: 'George', province: 'Western Cape', suburb: 'George Central', brand: 'boxer' },
  { id: 'boxer-worcester', name: 'Boxer Worcester', city: 'Worcester', province: 'Western Cape', suburb: 'Worcester Central', brand: 'boxer' },

  // Gauteng
  { id: 'boxer-soweto', name: 'Boxer Soweto', city: 'Johannesburg', province: 'Gauteng', suburb: 'Soweto', brand: 'boxer' },
  { id: 'boxer-alexandra', name: 'Boxer Alexandra', city: 'Johannesburg', province: 'Gauteng', suburb: 'Alexandra', brand: 'boxer' },
  { id: 'boxer-tembisa', name: 'Boxer Tembisa', city: 'Johannesburg', province: 'Gauteng', suburb: 'Tembisa', brand: 'boxer' },
  { id: 'boxer-germiston', name: 'Boxer Germiston', city: 'Germiston', province: 'Gauteng', suburb: 'Germiston Central', brand: 'boxer' },
  { id: 'boxer-benoni', name: 'Boxer Benoni', city: 'Benoni', province: 'Gauteng', suburb: 'Benoni Central', brand: 'boxer' },
  { id: 'boxer-boksburg', name: 'Boxer Boksburg', city: 'Boksburg', province: 'Gauteng', suburb: 'Boksburg Central', brand: 'boxer' },
  { id: 'boxer-springs', name: 'Boxer Springs', city: 'Springs', province: 'Gauteng', suburb: 'Springs Central', brand: 'boxer' },
  { id: 'boxer-pretoria-cbd', name: 'Boxer Pretoria CBD', city: 'Pretoria', province: 'Gauteng', suburb: 'Pretoria CBD', brand: 'boxer' },
  { id: 'boxer-mamelodi', name: 'Boxer Mamelodi', city: 'Pretoria', province: 'Gauteng', suburb: 'Mamelodi', brand: 'boxer' },
  { id: 'boxer-atteridgeville', name: 'Boxer Atteridgeville', city: 'Pretoria', province: 'Gauteng', suburb: 'Atteridgeville', brand: 'boxer' },

  // KwaZulu-Natal
  { id: 'boxer-durban-cbd', name: 'Boxer Durban CBD', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Durban CBD', brand: 'boxer' },
  { id: 'boxer-pinetown', name: 'Boxer Pinetown', city: 'Pinetown', province: 'KwaZulu-Natal', suburb: 'Pinetown Central', brand: 'boxer' },
  { id: 'boxer-chatsworth', name: 'Boxer Chatsworth', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Chatsworth', brand: 'boxer' },
  { id: 'boxer-phoenix', name: 'Boxer Phoenix', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Phoenix', brand: 'boxer' },
  { id: 'boxer-umlazi', name: 'Boxer Umlazi', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Umlazi', brand: 'boxer' },
  { id: 'boxer-pietermaritzburg', name: 'Boxer Pietermaritzburg', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', suburb: 'Pietermaritzburg Central', brand: 'boxer' },
  { id: 'boxer-richards-bay', name: 'Boxer Richards Bay', city: 'Richards Bay', province: 'KwaZulu-Natal', suburb: 'Richards Bay Central', brand: 'boxer' },
  { id: 'boxer-newcastle', name: 'Boxer Newcastle', city: 'Newcastle', province: 'KwaZulu-Natal', suburb: 'Newcastle Central', brand: 'boxer' },
  { id: 'boxer-ladysmith', name: 'Boxer Ladysmith', city: 'Ladysmith', province: 'KwaZulu-Natal', suburb: 'Ladysmith Central', brand: 'boxer' },
  { id: 'boxer-empangeni', name: 'Boxer Empangeni', city: 'Empangeni', province: 'KwaZulu-Natal', suburb: 'Empangeni Central', brand: 'boxer' },

  // Eastern Cape
  { id: 'boxer-port-elizabeth', name: 'Boxer Port Elizabeth', city: 'Port Elizabeth', province: 'Eastern Cape', suburb: 'Port Elizabeth Central', brand: 'boxer' },
  { id: 'boxer-east-london', name: 'Boxer East London', city: 'East London', province: 'Eastern Cape', suburb: 'East London Central', brand: 'boxer' },
  { id: 'boxer-mthatha', name: 'Boxer Mthatha', city: 'Mthatha', province: 'Eastern Cape', suburb: 'Mthatha Central', brand: 'boxer' },
  { id: 'boxer-king-williams-town', name: 'Boxer King Williams Town', city: 'King Williams Town', province: 'Eastern Cape', suburb: 'King Williams Town Central', brand: 'boxer' },
  { id: 'boxer-uitenhage', name: 'Boxer Uitenhage', city: 'Uitenhage', province: 'Eastern Cape', suburb: 'Uitenhage Central', brand: 'boxer' },

  // Free State
  { id: 'boxer-bloemfontein', name: 'Boxer Bloemfontein', city: 'Bloemfontein', province: 'Free State', suburb: 'Bloemfontein Central', brand: 'boxer' },
  { id: 'boxer-welkom', name: 'Boxer Welkom', city: 'Welkom', province: 'Free State', suburb: 'Welkom Central', brand: 'boxer' },
  { id: 'boxer-kroonstad', name: 'Boxer Kroonstad', city: 'Kroonstad', province: 'Free State', suburb: 'Kroonstad Central', brand: 'boxer' },

  // North West
  { id: 'boxer-rustenburg', name: 'Boxer Rustenburg', city: 'Rustenburg', province: 'North West', suburb: 'Rustenburg Central', brand: 'boxer' },
  { id: 'boxer-potchefstroom', name: 'Boxer Potchefstroom', city: 'Potchefstroom', province: 'North West', suburb: 'Potchefstroom Central', brand: 'boxer' },
  { id: 'boxer-klerksdorp', name: 'Boxer Klerksdorp', city: 'Klerksdorp', province: 'North West', suburb: 'Klerksdorp Central', brand: 'boxer' },

  // Limpopo
  { id: 'boxer-polokwane', name: 'Boxer Polokwane', city: 'Polokwane', province: 'Limpopo', suburb: 'Polokwane Central', brand: 'boxer' },
  { id: 'boxer-tzaneen', name: 'Boxer Tzaneen', city: 'Tzaneen', province: 'Limpopo', suburb: 'Tzaneen Central', brand: 'boxer' },
  { id: 'boxer-lephalale', name: 'Boxer Lephalale', city: 'Lephalale', province: 'Limpopo', suburb: 'Lephalale Central', brand: 'boxer' },
  { id: 'boxer-thohoyandou', name: 'Boxer Thohoyandou', city: 'Thohoyandou', province: 'Limpopo', suburb: 'Thohoyandou Central', brand: 'boxer' },

  // Mpumalanga
  { id: 'boxer-nelspruit', name: 'Boxer Nelspruit', city: 'Nelspruit', province: 'Mpumalanga', suburb: 'Nelspruit Central', brand: 'boxer' },
  { id: 'boxer-witbank', name: 'Boxer Witbank', city: 'Witbank', province: 'Mpumalanga', suburb: 'Witbank Central', brand: 'boxer' },
  { id: 'boxer-middelburg', name: 'Boxer Middelburg', city: 'Middelburg', province: 'Mpumalanga', suburb: 'Middelburg Central', brand: 'boxer' },

  // Northern Cape
  { id: 'boxer-kimberley', name: 'Boxer Kimberley', city: 'Kimberley', province: 'Northern Cape', suburb: 'Kimberley Central', brand: 'boxer' },
  { id: 'boxer-upington', name: 'Boxer Upington', city: 'Upington', province: 'Northern Cape', suburb: 'Upington Central', brand: 'boxer' },

  // === PICK N PAY STORES ===

  // Western Cape
  { id: 'pnp-rondebosch', name: 'Pick n Pay Rondebosch', city: 'Cape Town', province: 'Western Cape', suburb: 'Rondebosch', brand: 'pnp' },
  { id: 'pnp-claremont', name: 'Pick n Pay Claremont', city: 'Cape Town', province: 'Western Cape', suburb: 'Claremont', brand: 'pnp' },
  { id: 'pnp-constantia', name: 'Pick n Pay Constantia', city: 'Cape Town', province: 'Western Cape', suburb: 'Constantia', brand: 'pnp' },
  { id: 'pnp-newlands', name: 'Pick n Pay Newlands', city: 'Cape Town', province: 'Western Cape', suburb: 'Newlands', brand: 'pnp' },
  { id: 'pnp-sea-point', name: 'Pick n Pay Sea Point', city: 'Cape Town', province: 'Western Cape', suburb: 'Sea Point', brand: 'pnp' },
  { id: 'pnp-greenpoint', name: 'Pick n Pay Green Point', city: 'Cape Town', province: 'Western Cape', suburb: 'Green Point', brand: 'pnp' },
  { id: 'pnp-cape-town-cbd', name: 'Pick n Pay Cape Town CBD', city: 'Cape Town', province: 'Western Cape', suburb: 'Cape Town CBD', brand: 'pnp' },
  { id: 'pnp-bellville', name: 'Pick n Pay Bellville', city: 'Cape Town', province: 'Western Cape', suburb: 'Bellville', brand: 'pnp' },
  { id: 'pnp-durbanville', name: 'Pick n Pay Durbanville', city: 'Cape Town', province: 'Western Cape', suburb: 'Durbanville', brand: 'pnp' },
  { id: 'pnp-stellenbosch', name: 'Pick n Pay Stellenbosch', city: 'Stellenbosch', province: 'Western Cape', suburb: 'Stellenbosch Central', brand: 'pnp' },
  { id: 'pnp-paarl', name: 'Pick n Pay Paarl', city: 'Paarl', province: 'Western Cape', suburb: 'Paarl Central', brand: 'pnp' },
  { id: 'pnp-somerset-west', name: 'Pick n Pay Somerset West', city: 'Somerset West', province: 'Western Cape', suburb: 'Somerset West', brand: 'pnp' },
  { id: 'pnp-george', name: 'Pick n Pay George', city: 'George', province: 'Western Cape', suburb: 'George Central', brand: 'pnp' },
  { id: 'pnp-knysna', name: 'Pick n Pay Knysna', city: 'Knysna', province: 'Western Cape', suburb: 'Knysna Central', brand: 'pnp' },

  // Gauteng
  { id: 'pnp-sandton', name: 'Pick n Pay Sandton', city: 'Johannesburg', province: 'Gauteng', suburb: 'Sandton', brand: 'pnp' },
  { id: 'pnp-rosebank', name: 'Pick n Pay Rosebank', city: 'Johannesburg', province: 'Gauteng', suburb: 'Rosebank', brand: 'pnp' },
  { id: 'pnp-hyde-park', name: 'Pick n Pay Hyde Park', city: 'Johannesburg', province: 'Gauteng', suburb: 'Hyde Park', brand: 'pnp' },
  { id: 'pnp-fourways', name: 'Pick n Pay Fourways', city: 'Johannesburg', province: 'Gauteng', suburb: 'Fourways', brand: 'pnp' },
  { id: 'pnp-bryanston', name: 'Pick n Pay Bryanston', city: 'Johannesburg', province: 'Gauteng', suburb: 'Bryanston', brand: 'pnp' },
  { id: 'pnp-johannesburg-cbd', name: 'Pick n Pay Johannesburg CBD', city: 'Johannesburg', province: 'Gauteng', suburb: 'Johannesburg CBD', brand: 'pnp' },
  { id: 'pnp-centurion', name: 'Pick n Pay Centurion', city: 'Centurion', province: 'Gauteng', suburb: 'Centurion Central', brand: 'pnp' },
  { id: 'pnp-pretoria-cbd', name: 'Pick n Pay Pretoria CBD', city: 'Pretoria', province: 'Gauteng', suburb: 'Pretoria CBD', brand: 'pnp' },
  { id: 'pnp-hatfield', name: 'Pick n Pay Hatfield', city: 'Pretoria', province: 'Gauteng', suburb: 'Hatfield', brand: 'pnp' },
  { id: 'pnp-menlyn', name: 'Pick n Pay Menlyn', city: 'Pretoria', province: 'Gauteng', suburb: 'Menlyn', brand: 'pnp' },
  { id: 'pnp-eastgate', name: 'Pick n Pay Eastgate', city: 'Johannesburg', province: 'Gauteng', suburb: 'Bedfordview', brand: 'pnp' },

  // KwaZulu-Natal
  { id: 'pnp-durban-cbd', name: 'Pick n Pay Durban CBD', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Durban CBD', brand: 'pnp' },
  { id: 'pnp-umhlanga', name: 'Pick n Pay Umhlanga', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Umhlanga', brand: 'pnp' },
  { id: 'pnp-westville', name: 'Pick n Pay Westville', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Westville', brand: 'pnp' },
  { id: 'pnp-pinetown', name: 'Pick n Pay Pinetown', city: 'Pinetown', province: 'KwaZulu-Natal', suburb: 'Pinetown Central', brand: 'pnp' },
  { id: 'pnp-pietermaritzburg', name: 'Pick n Pay Pietermaritzburg', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', suburb: 'Pietermaritzburg Central', brand: 'pnp' },
  { id: 'pnp-richards-bay', name: 'Pick n Pay Richards Bay', city: 'Richards Bay', province: 'KwaZulu-Natal', suburb: 'Richards Bay Central', brand: 'pnp' },

  // Eastern Cape
  { id: 'pnp-port-elizabeth', name: 'Pick n Pay Port Elizabeth', city: 'Port Elizabeth', province: 'Eastern Cape', suburb: 'Port Elizabeth Central', brand: 'pnp' },
  { id: 'pnp-east-london', name: 'Pick n Pay East London', city: 'East London', province: 'Eastern Cape', suburb: 'East London Central', brand: 'pnp' },

  // Free State
  { id: 'pnp-bloemfontein', name: 'Pick n Pay Bloemfontein', city: 'Bloemfontein', province: 'Free State', suburb: 'Bloemfontein Central', brand: 'pnp' },

  // North West
  { id: 'pnp-rustenburg', name: 'Pick n Pay Rustenburg', city: 'Rustenburg', province: 'North West', suburb: 'Rustenburg Central', brand: 'pnp' },
  { id: 'pnp-potchefstroom', name: 'Pick n Pay Potchefstroom', city: 'Potchefstroom', province: 'North West', suburb: 'Potchefstroom Central', brand: 'pnp' },

  // Limpopo
  { id: 'pnp-polokwane', name: 'Pick n Pay Polokwane', city: 'Polokwane', province: 'Limpopo', suburb: 'Polokwane Central', brand: 'pnp' },

  // Mpumalanga
  { id: 'pnp-nelspruit', name: 'Pick n Pay Nelspruit', city: 'Nelspruit', province: 'Mpumalanga', suburb: 'Nelspruit Central', brand: 'pnp' },
  { id: 'pnp-witbank', name: 'Pick n Pay Witbank', city: 'Witbank', province: 'Mpumalanga', suburb: 'Witbank Central', brand: 'pnp' },

  // Northern Cape
  { id: 'pnp-kimberley', name: 'Pick n Pay Kimberley', city: 'Kimberley', province: 'Northern Cape', suburb: 'Kimberley Central', brand: 'pnp' },
];

// Helper function to search stores
export const searchStores = (query: string): Store[] => {
  if (!query.trim()) return stores;

  const searchTerm = query.toLowerCase().trim();

  return stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm) ||
    store.city.toLowerCase().includes(searchTerm) ||
    store.province.toLowerCase().includes(searchTerm) ||
    store.suburb.toLowerCase().includes(searchTerm) ||
    store.brand.toLowerCase().includes(searchTerm)
  );
};

// Backward-compatible exports
export type SparStore = Store;
export const sparStores = stores;
export const searchSparStores = searchStores;
