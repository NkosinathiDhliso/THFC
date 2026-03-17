import { create } from 'zustand'
import { adminSupabase } from '../lib/adminSupabase'

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string | null;
  short_code: string;
  short_code_created_at: string | null;
  short_code_last_used: string | null;
  is_active: boolean | null;
}

interface DonationStats {
  totalDonations: number;
  totalQuantity: number;
  totalPickupValue: number;
  weeklyAverage: number;
  lastWeekTotal: number;
  poAmount: number;
  requiredPickupValue: number;
  deficitValue: number;
  deficitBrownBreadLoaves: number;
  deficitPercentage: number;
  creditBalance: number;
  nextDayCreditBalance: number;
  nextDayProjectionConfidence: string;
}

// Removed ZohoSalesData interface - no longer needed

interface Donation {
  id: string;
  brown_bread_qty: number;
  white_bread_qty: number;
  collected_at: string;
  store_name_manual: string | null;
  collector_id: string;
  user_email?: string;
  user_name?: string;
  created_at: string | null;
  [key: string]: unknown; // Allow additional properties from database
}

interface AdminState {
  // Authentication
  isAuthenticated: boolean;
  password: string;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isEditingUser: boolean;
  
  // Data
  userProfiles: UserProfile[];
  donationStats: DonationStats | null;
  donations: Donation[];
  
  // Form states
  salesQuantity: number;
  activeTab: string;
  isSalesLocked: boolean;
  showUnlockWarning: boolean;
  
  // Modal states
  selectedUser: UserProfile | null;
  isEditUserModalOpen: boolean;
  
  // Actions
  setAuthenticated: (authenticated: boolean) => void;
  setPassword: (password: string) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setEditingUser: (editing: boolean) => void;
  setSalesQuantity: (quantity: number) => void;
  setActiveTab: (tab: string) => void;
  setSalesLocked: (locked: boolean) => void;
  setShowUnlockWarning: (show: boolean) => void;
  setSelectedUser: (user: UserProfile | null) => void;
  setEditUserModalOpen: (open: boolean) => void;
  // Removed setCurrentData - no longer needed
  
  // Data actions
  loadUserProfiles: (skipLoadingState?: boolean) => Promise<void>;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => void;
  refreshUserShortCode: (userEmail: string) => Promise<string | null>;
  loadDonationStats: () => Promise<void>;
  loadCurrentSalesData: () => Promise<void>;
  loadDonations: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  // Initial state
  isAuthenticated: false,
  password: '',
  isLoading: false,
  isRefreshing: false,
  isEditingUser: false,
  userProfiles: [],
  donationStats: null,
  // Removed currentData - no longer needed
  donations: [],
  salesQuantity: 0,
  activeTab: 'sales',
  isSalesLocked: false,
  showUnlockWarning: false,
  selectedUser: null,
  isEditUserModalOpen: false,
  
  // Basic setters
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setPassword: (password) => set({ password }),
  setLoading: (loading) => set({ isLoading: loading }),
  setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  setEditingUser: (editing) => set({ isEditingUser: editing }),
  setSalesQuantity: (quantity) => set({ salesQuantity: quantity }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSalesLocked: (locked) => set({ isSalesLocked: locked }),
  setShowUnlockWarning: (show) => set({ showUnlockWarning: show }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setEditUserModalOpen: (open) => set({ isEditUserModalOpen: open }),
  // Removed setCurrentData implementation - no longer needed
  
  // Data actions
  loadUserProfiles: async (skipLoadingState = false) => {
    if (!skipLoadingState) {
      set({ isRefreshing: true });
    }
    
    try {
      console.log('📋 Loading user profiles from profiles table...');
      
      const { data: profiles, error } = await adminSupabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load user profiles:', error);
        return;
      }

      // Transform the data to match the expected interface
      const transformedProfiles = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email || 'Unknown',
        name: profile.full_name || 'Unknown',
        role: profile.role || 'user',
        short_code: profile.short_code || '',
        short_code_created_at: profile.short_code_created_at,
        short_code_last_used: profile.short_code_last_used,
        is_active: profile.is_active ?? true
      })) || [];

      set({ userProfiles: transformedProfiles });
      console.log('✅ User profiles loaded:', transformedProfiles.length);
      
    } catch (error) {
      console.error('Failed to load user profiles:', error);
    } finally {
      if (!skipLoadingState) {
        set({ isRefreshing: false });
      }
    }
  },
  
  updateUserProfile: (userId, updates) => {
    set((state) => ({
      userProfiles: state.userProfiles.map(profile =>
        profile.id === userId ? { ...profile, ...updates } : profile
      )
    }));
  },
  
  refreshUserShortCode: async (userEmail: string) => {
    set({ isRefreshing: true });
    
    try {
      console.log('🔄 Refreshing short code for:', userEmail);
      
      // Use the database function for consistent code generation
      const { data, error } = await adminSupabase.rpc('refresh_user_short_code', {
        user_email: userEmail
      });

      if (error) {
        console.error('Short code refresh error:', error);
        throw new Error(`Failed to refresh short code: ${error.message}`);
      }

      if (data) {
        console.log('✅ Short code refreshed successfully:', data);
        
        // Update the specific user in the state immediately for instant UI feedback
        set((state) => ({
          userProfiles: state.userProfiles.map(profile =>
            profile.email === userEmail
              ? {
                  ...profile,
                  short_code: data,
                  short_code_created_at: new Date().toISOString(),
                  short_code_last_used: null
                }
              : profile
          )
        }));
        
        console.log('💡 Updated user profile with new short code optimistically');
        return data;
      } else {
        throw new Error('Failed to refresh short code - no response received');
      }
    } catch (error) {
      console.error('Short code refresh catch error:', error);
      throw error;
    } finally {
      set({ isRefreshing: false });
    }
  },
  
  loadDonationStats: async () => {
    try {
      const today = new Date();
      const southAfricaTime = new Date(today.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
      
      // Calculate business day boundaries: 18:01 yesterday to 18:00 today (SAST)
      const businessDayEnd = new Date(southAfricaTime);
      businessDayEnd.setHours(18, 0, 0, 0);
      
      const businessDayStart = new Date(businessDayEnd);
      businessDayStart.setDate(businessDayStart.getDate() - 1);
      businessDayStart.setHours(18, 1, 0, 0);
      
      // Use UTC ISO strings for database queries
      const businessDayStartISO = businessDayStart.toISOString();
      const businessDayEndISO = businessDayEnd.toISOString();
      
      console.log('📅 Loading admin stats for business day:', businessDayStartISO, 'to', businessDayEndISO, '(SAST)');

      const { data: donations, error } = await adminSupabase
        .from('donations')
        .select('brown_bread_qty, white_bread_qty, collected_at')
        .gte('collected_at', businessDayStartISO)
        .lt('collected_at', businessDayEndISO);

      if (error) {
        console.error('Error loading donation stats:', error);
        return;
      }

      const totalDonations = donations?.length || 0;
      const totalQuantity = donations?.reduce((sum, d) => sum + d.brown_bread_qty + d.white_bread_qty, 0) || 0;
      
      // Calculate weekly stats (last 7 business days)
      const weekAgoBusinessDay = new Date(businessDayEnd);
      weekAgoBusinessDay.setDate(weekAgoBusinessDay.getDate() - 7);
      weekAgoBusinessDay.setHours(18, 1, 0, 0);
      const weekAgoBusinessDayISO = weekAgoBusinessDay.toISOString();

      const { data: weeklyDonations } = await adminSupabase
        .from('donations')
        .select('brown_bread_qty, white_bread_qty')
        .gte('collected_at', weekAgoBusinessDayISO)
        .lt('collected_at', businessDayEndISO);

      const weeklyTotal = weeklyDonations?.reduce((sum, d) => sum + d.brown_bread_qty + d.white_bread_qty, 0) || 0;
      const weeklyAverage = Math.round(weeklyTotal / 7);

      // Get last week's total (7 business days before current week)
      const twoWeeksAgoBusinessDay = new Date(weekAgoBusinessDay);
      twoWeeksAgoBusinessDay.setDate(twoWeeksAgoBusinessDay.getDate() - 7);
      twoWeeksAgoBusinessDay.setHours(18, 1, 0, 0);
      const twoWeeksAgoBusinessDayISO = twoWeeksAgoBusinessDay.toISOString();
      
      const lastWeekBusinessDayEnd = new Date(weekAgoBusinessDay);
      lastWeekBusinessDayEnd.setHours(18, 0, 0, 0);
      const lastWeekBusinessDayEndISO = lastWeekBusinessDayEnd.toISOString();

      const { data: lastWeekDonations } = await adminSupabase
        .from('donations')
        .select('brown_bread_qty, white_bread_qty')
        .gte('collected_at', twoWeeksAgoBusinessDayISO)
        .lt('collected_at', lastWeekBusinessDayEndISO);

      const lastWeekTotal = lastWeekDonations?.reduce((sum, d) => sum + d.brown_bread_qty + d.white_bread_qty, 0) || 0;

      // Get current PO amount from sales_periods table
      let poAmount = 0;
      try {
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];
        
        // Get active sales period that contains today's date
        const { data: salesPeriod } = await adminSupabase
          .from('sales_periods')
          .select('total_sales_amount')
          .eq('status', 'active')
          .lte('start_date', currentDate)
          .gte('end_date', currentDate)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        poAmount = salesPeriod?.total_sales_amount || 0;
        console.log('📊 Loaded PO amount from sales_periods:', poAmount);
      } catch (error) {
        console.error('Failed to load PO amount:', error);
        poAmount = 0;
        console.log('📊 Using default PO amount (fallback):', poAmount);
      }

      // Calculate pickup value and deficit with correct pricing
      const totalWhiteBreadValue = donations?.reduce((sum, d) => sum + (d.white_bread_qty * 8.80), 0) || 0;
      const totalBrownBreadValue = donations?.reduce((sum, d) => sum + (d.brown_bread_qty * 7.75), 0) || 0;
      const totalPickupValue = totalWhiteBreadValue + totalBrownBreadValue;
      const requiredPickupValue = Math.round(poAmount * 0.056); // Correct 5.6% calculation
      const deficitValue = Math.max(0, requiredPickupValue - totalPickupValue);
      const deficitBrownBreadLoaves = Math.ceil(deficitValue / 7.75); // Use brown bread price for deficit calculation
      const deficitPercentage = requiredPickupValue > 0 ? ((deficitValue / requiredPickupValue) * 100) : 0;

      // Get current credit balance
      const { data: creditData } = await adminSupabase
        .rpc('get_current_credit_balance');
      
      const creditBalance = creditData || 0;

      // Get next day credit projection
      const { data: nextDayData } = await adminSupabase
        .rpc('get_next_day_credit_projection_details');
      
      // The RPC function returns an array of rows, get the first one
      const nextDayProjection = Array.isArray(nextDayData) ? nextDayData[0] : nextDayData;
      const nextDayCreditBalance = nextDayProjection?.projected_credit || 0;
      const nextDayProjectionConfidence = nextDayProjection?.factors?.includes('low') ? 'low' : 'medium';

      const stats: DonationStats = {
        totalDonations,
        totalQuantity,
        totalPickupValue,
        weeklyAverage,
        lastWeekTotal,
        poAmount,
        requiredPickupValue,
        deficitValue,
        deficitBrownBreadLoaves,
        deficitPercentage,
        creditBalance,
        nextDayCreditBalance,
        nextDayProjectionConfidence
      };

      set({ donationStats: stats });
    } catch (error) {
      console.error('Failed to load donation stats:', error);
    }
  },
  
  loadCurrentSalesData: async () => {
    try {
      console.log('💾 Loading current sales data from sales_periods table...');
      
      // Get current month/year for period lookup
      const today = new Date();
      const currentMonth = today.toLocaleString('en-US', { month: 'long' });
      const currentYear = today.getFullYear();
      
      console.log('🔍 Looking for period:', `${currentMonth} ${currentYear}`);
      
      // Get today's date for range checking
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Try to get the active period that contains today's date first
      const { data: specificRecord, error: specificError } = await adminSupabase
        .from('sales_periods')
        .select('*')
        .eq('status', 'active')
        .lte('start_date', currentDate)
        .gte('end_date', currentDate)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log('🔍 Query result - specific record:', specificRecord);
      
      if (specificError && specificError.code !== 'PGRST116') {
        console.error('Error loading specific sales period:', specificError);
      }
      
      // Use the record we found, or try fallback if none found
      let finalRecord = specificRecord;
      
      // If no active period found, try the original month-based search as fallback
      if (!finalRecord) {
        console.log('🔄 No active period found, trying month-based search...');
        const { data: fallbackRecord } = await adminSupabase
          .from('sales_periods')
          .select('*')
          .ilike('period_name', `%${currentMonth}%${currentYear}%`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (fallbackRecord) {
          console.log('🔍 Fallback query found:', fallbackRecord);
          finalRecord = fallbackRecord;
        }
      }
      
      let salesData = null;
      
      if (finalRecord) {
        salesData = {
          id: finalRecord.id,
          total_sales_order_quantity: finalRecord.total_sales_amount || 0,
          last_updated_at: finalRecord.updated_at
        };
        console.log('📊 Loaded sales data from sales_periods:', salesData);
        
        // Set sales locked status based on whether data exists
        set({ isSalesLocked: true });
      } else {
        console.log('📊 No current sales period found, will create new one when saving');
        set({ isSalesLocked: false });
      }
      
      // Set the salesQuantity to the loaded value from sales_periods
      set({ 
        salesQuantity: salesData?.total_sales_order_quantity || 0
      });
      
    } catch (error) {
      console.error('Failed to load current sales data:', error);
    }
  },
  
  loadDonations: async () => {
    set({ isRefreshing: true });
    
    try {
      // First get donations with store relationship
      const { data: donationsData, error: donationsError } = await adminSupabase
        .from('donations')
        .select(`
          *,
          store:stores(
            id,
            name,
            address
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Load latest 50 donations

      if (donationsError) {
        console.error('Error loading donations:', donationsError);
        return;
      }

      // Get user profiles from profiles table
      const { data: profilesData } = await adminSupabase
        .from('profiles')
        .select('id, email, full_name');

      // Create a map of all user profiles
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, {
          email: profile.email || 'Unknown',
          name: profile.full_name || 'Unknown'
        });
      });

      // Transform the data to include user profile info
      const transformedDonations: Donation[] = donationsData?.map(donation => {
        const userProfile = profilesMap.get(donation.collector_id);
        return {
          ...donation,
          user_email: userProfile?.email || 'Unknown',
          user_name: userProfile?.name || 'Anonymous'
        };
      }) || [];

      set({ donations: transformedDonations });
    } catch (error) {
      console.error('Failed to load donations:', error);
    } finally {
      set({ isRefreshing: false });
    }
  }
}));