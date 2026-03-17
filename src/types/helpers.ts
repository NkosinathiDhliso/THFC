import type { Database } from './supabase';

// Helper types for easier access to table types
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Donation = Database['public']['Tables']['donations']['Row'];
export type DonationInsert = Database['public']['Tables']['donations']['Insert'];
export type DonationUpdate = Database['public']['Tables']['donations']['Update'];

export type Store = Database['public']['Tables']['stores']['Row'];
export type StoreInsert = Database['public']['Tables']['stores']['Insert'];
export type StoreUpdate = Database['public']['Tables']['stores']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Helper for RPC function parameters and returns
export type RefreshUserShortCodeArgs = Database['public']['Functions']['refresh_user_short_code']['Args'];
export type RefreshUserShortCodeReturn = Database['public']['Functions']['refresh_user_short_code']['Returns'];

export type GenerateUniqueShortCodeReturn = Database['public']['Functions']['generate_unique_short_code']['Returns'];

// Helper for form data and state management
export interface DonationFormData {
  storeId?: string;
  storeNameManual?: string;
  whiteBreadCount: number;
  brownBreadCount: number;
  photoUrl?: string;
}

export interface DonationStats {
  totalDonations: number;
  totalQuantity: number;
  weeklyAverage: number;
  lastWeekTotal: number;
  deficit: number;
  deficitPercentage: number;
}

export interface SalesData {
  id: number;
  total_sales_order_quantity: number;
  last_updated_at: string;
  notes?: string;
}
