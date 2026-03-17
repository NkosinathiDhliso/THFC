export interface User {
  id: string;
  email: string;
  employee_id?: string;
  full_name?: string;
  short_code?: string;
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  created_at?: string | null;
}

export interface Donation {
  id: string;
  store_id: string | null;
  store_name_manual: string | null;
  white_bread_qty: number;
  brown_bread_qty: number;
  white_bread_monetary_value?: number | null;
  calculated_brown_bread_qty?: number | null;
  deficit_percentage_applied?: number | null;
  calculation_notes?: string | null;
  photo_url: string;
  collected_at: string;
  created_at?: string | null;
  collector_id: string;
  offline_pending?: boolean;
  
  // Related entities (optional for compatibility)
  store?: Store | null;
  collector?: {
    id?: string;
    email?: string;
    name?: string;
  };
}

// Removed ZohoSalesData interface - no longer needed

export interface DonationFormData {
  storeId?: string;
  storeNameManual?: string;
  whiteBreadQty: number;
  brownBreadQty: number;
  photoFile?: File;
  photoUrl?: string;
}

export interface CameraState {
  isOpen: boolean;
  stream?: MediaStream;
  photoDataUrl?: string;
  isReviewing: boolean;
}

export interface BreadPrice {
  id: string;
  bread_type: 'white' | 'brown';
  price_per_loaf: number;
  effective_from: string;
  effective_until?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DonationValueCalculation {
  whiteBreadValue: number;
  deficitPercentage: number;
  brownBreadEquivalent: number;
  whiteBreadPrice: number;
  brownBreadPrice: number;
}

// New enhanced sales period interface
export interface SalesPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  total_sales_amount: number;
  target_deficit_percentage: number;
  required_donation_value: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}