import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAppConfig } from './config';

let supabaseClient: SupabaseClient | null = null;
let adminSupabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client with anon key (for public operations)
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = await getAppConfig();
  
  supabaseClient = createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return supabaseClient;
}

/**
 * Get Supabase admin client with service role key (for admin operations)
 */
export async function getAdminSupabaseClient(): Promise<SupabaseClient> {
  if (adminSupabaseClient) {
    return adminSupabaseClient;
  }

  const config = await getAppConfig();
  
  adminSupabaseClient = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return adminSupabaseClient;
}

/**
 * Database types (copied from existing types)
 */
export interface Store {
  id: number;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  store_id: number;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  amount: number;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  processed_by?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface DailyDonationLog {
  id: string;
  date: string;
  store_id: number;
  total_amount: number;
  donation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Helper functions for common database operations
 */
export class SupabaseService {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(client: SupabaseClient, adminClient: SupabaseClient) {
    this.client = client;
    this.adminClient = adminClient;
  }

  /**
   * Get admin client for privileged operations
   */
  get admin(): SupabaseClient {
    return this.adminClient;
  }

  get publicClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Get all active stores
   */
  async getActiveStores(): Promise<Store[]> {
    const { data, error } = await this.client
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch stores: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get donations for a specific date range
   */
  async getDonationsForDateRange(startDate: string, endDate: string): Promise<Donation[]> {
    const { data, error } = await this.adminClient
      .from('donations')
      .select(`
        *,
        stores!inner(name, address)
      `)
      .gte('collected_at', startDate)
      .lte('collected_at', endDate)
      .order('collected_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch donations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new donation
   */
  async createDonation(donation: Omit<Donation, 'id' | 'created_at' | 'updated_at'>): Promise<Donation> {
    const { data, error } = await this.adminClient
      .from('donations')
      .insert(donation)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create donation: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a donation
   */
  async updateDonation(id: string, updates: Partial<Donation>): Promise<Donation> {
    const { data, error } = await this.adminClient
      .from('donations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update donation: ${error.message}`);
    }

    return data;
  }

  /**
   * Get daily donation summary for a specific date
   */
  async getDailySummary(date: string): Promise<{
    totalAmount: number;
    donationCount: number;
    storeBreakdown: Array<{ store_name: string; amount: number; count: number }>;
  }> {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data: donations, error } = await this.adminClient
      .from('donations')
      .select(`
        white_bread_monetary_value,
        white_bread_qty,
        brown_bread_qty,
        stores!inner(name)
      `)
      .gte('collected_at', startOfDay)
      .lte('collected_at', endOfDay);

    if (error) {
      throw new Error(`Failed to fetch daily summary: ${error.message}`);
    }

    // Calculate total monetary value (use white_bread_monetary_value if available, otherwise calculate from quantities)
    const totalAmount = donations?.reduce((sum, d) => {
      if (d.white_bread_monetary_value) {
        return sum + d.white_bread_monetary_value;
      }
      // Fallback calculation if monetary value not set
      const whiteValue = d.white_bread_qty * 8.80; // Default white bread price
      const brownValue = d.brown_bread_qty * 7.75; // Default brown bread price
      return sum + whiteValue + brownValue;
    }, 0) || 0;
    
    const donationCount = donations?.length || 0;

    // Group by store
    const storeMap = new Map<string, { amount: number; count: number }>();
    donations?.forEach(donation => {
      const storeName = (donation.stores as any).name;
      const existing = storeMap.get(storeName) || { amount: 0, count: 0 };
      
      let donationValue = 0;
      if (donation.white_bread_monetary_value) {
        donationValue = donation.white_bread_monetary_value;
      } else {
        // Fallback calculation
        const whiteValue = donation.white_bread_qty * 8.80;
        const brownValue = donation.brown_bread_qty * 7.75;
        donationValue = whiteValue + brownValue;
      }
      
      storeMap.set(storeName, {
        amount: existing.amount + donationValue,
        count: existing.count + 1
      });
    });

    const storeBreakdown = Array.from(storeMap.entries()).map(([store_name, data]) => ({
      store_name,
      amount: data.amount,
      count: data.count
    }));

    return {
      totalAmount,
      donationCount,
      storeBreakdown
    };
  }
}

/**
 * Get initialized Supabase service
 */
export async function getSupabaseService(): Promise<SupabaseService> {
  const client = await getSupabaseClient();
  const adminClient = await getAdminSupabaseClient();
  return new SupabaseService(client, adminClient);
}