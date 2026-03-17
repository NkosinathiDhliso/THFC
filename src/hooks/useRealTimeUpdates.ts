import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Donation } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeStats {
  totalDonations: number;
  totalBreadQty: number;
  recentDonations: Donation[];
  lastUpdated: Date;
}

export const useRealTimeUpdates = (userId?: string) => {
  const [stats, setStats] = useState<RealtimeStats>({
    totalDonations: 0,
    totalBreadQty: 0,
    recentDonations: [],
    lastUpdated: new Date()
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const lastRefreshDateRef = useRef<string | null>(null);

  // Load initial stats
  const loadInitialStats = async () => {
    console.log('📊 Loading daily donation stats...');
    
    try {
      // Calculate business day boundaries: 18:01 yesterday to 18:00 today (SAST)
      const now = new Date();
      const southAfricaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
      
      const businessDayEnd = new Date(southAfricaTime);
      businessDayEnd.setHours(18, 0, 0, 0);
      
      const businessDayStart = new Date(businessDayEnd);
      businessDayStart.setDate(businessDayStart.getDate() - 1);
      businessDayStart.setHours(18, 1, 0, 0);
      
      // Convert to ISO strings with SAST timezone offset (+02:00)
      const businessDayStartISO = businessDayStart.toISOString().replace('Z', '+02:00');
      const businessDayEndISO = businessDayEnd.toISOString().replace('Z', '+02:00');
      
      console.log(`📅 Loading stats for business day: ${businessDayStartISO} to ${businessDayEndISO} (SAST)`);
      
      // Get business day donations count
      const { count: totalDonations } = await supabase
        .from('donations')
        .select('*', { count: 'exact', head: true })
        .gte('collected_at', businessDayStartISO)
        .lt('collected_at', businessDayEndISO);

      // Get business day bread quantities only
      const { data: todayDonations } = await supabase
        .from('donations')
        .select('white_bread_qty, brown_bread_qty')
        .gte('collected_at', businessDayStartISO)
        .lt('collected_at', businessDayEndISO);

      const totalBreadQty = (todayDonations || []).reduce((sum, donation) => {
        return sum + (donation.white_bread_qty || 0) + (donation.brown_bread_qty || 0);
      }, 0);

      // Get business day recent donations (last 10 for display)
      // Note: We'll fetch donations without joins first, then get user data separately
      // This handles both profiles and user_profiles table users
      let donationsQuery = supabase
        .from('donations')
        .select(`
          id,
          store_id,
          store_name_manual,
          white_bread_qty,
          brown_bread_qty,
          photo_url,
          collected_at,
          created_at,
          collector_id,
          store:stores(id, name, address, created_at)
        `)
        .gte('collected_at', businessDayStartISO)
        .lt('collected_at', businessDayEndISO)
        .order('collected_at', { ascending: false })
        .limit(10);

      // Add user filter if userId is provided
      if (userId) {
        donationsQuery = donationsQuery.eq('collector_id', userId);
      }

      const { data: donations, error: donationsError } = await donationsQuery;

      if (donationsError) {
        console.error('❌ Error loading donations:', donationsError);
        throw donationsError;
      }

      // Get user data from profiles table
      const collectorIds = (donations || []).map(d => d.collector_id);
      
      // Fetch profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', collectorIds);

      if (profilesError) {
        console.warn('⚠️ Error fetching profiles:', profilesError);
      }

      // Create a user map
      const userMap = new Map();
      
      // Add profiles
      (profilesData || []).forEach(profile => {
        userMap.set(profile.id, {
          id: profile.id,
          email: profile.email || 'Unknown',
          name: profile.full_name || 'Unknown'
        });
      });

      // Transform the donations to match our interface
      const transformedDonations = (donations || []).map((donation) => {
        const user = userMap.get(donation.collector_id) || {
          id: donation.collector_id,
          email: 'Unknown',
          name: 'Anonymous'
        };

        // Try to get store data
        const storeData = donation.store_id ? {
          id: donation.store_id,
          name: donation.store?.name || 'Unknown Store',
          address: donation.store?.address || '',
          created_at: donation.store?.created_at || new Date().toISOString()
        } : null;

        return {
          id: donation.id,
          store_id: donation.store_id,
          store_name_manual: donation.store_name_manual,
          white_bread_qty: donation.white_bread_qty || 0,
          brown_bread_qty: donation.brown_bread_qty || 0,
          photo_url: donation.photo_url || '',
          collected_at: donation.collected_at || donation.created_at || '',
          created_at: donation.created_at,
          collector_id: donation.collector_id,
          collector: user,
          store: storeData
        };
      });

      // Note: User-specific filtering is already handled in the main query above

      setStats({
        totalDonations: totalDonations || 0,
        totalBreadQty,
        recentDonations: transformedDonations,
        lastUpdated: new Date()
      });

      // Store the current business day end time for reset detection
      lastRefreshDateRef.current = businessDayEndISO;

      console.log('✅ Business day stats loaded:', { totalDonations, totalBreadQty, recentDonations: transformedDonations.length, businessDayEnd: businessDayEndISO });
    } catch (error) {
      console.error('❌ Failed to load initial stats:', error);
      setError('Failed to load statistics');
    }
  };

  // Clean up subscription
  const cleanupSubscription = () => {
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up real-time subscription');
      const currentSub = subscriptionRef.current;
      subscriptionRef.current = null; // Clear reference first to prevent recursion
      
      try {
        supabase.removeChannel(currentSub);
      } catch (error) {
        console.error('Error cleaning up subscription:', error);
      }
    }
    setIsConnected(false);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    // Don't setup if already connected or page is not visible
    if (subscriptionRef.current || !isVisibleRef.current) {
      console.log('🔍 Skipping subscription setup - already connected or page not visible');
      return;
    }

    try {
      console.log('🔄 Setting up real-time subscription...');
      setError(null);
      
      const channel = supabase
        .channel('donations-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'donations'
          },
          (payload) => {
            console.log('📡 Real-time update received:', payload);
            handleRealtimeUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
            retryCountRef.current = 0; // Reset retry count on successful connection
            console.log('✅ Real-time subscription connected');
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            
            // Only attempt reconnection if page is visible and no subscription exists
            if (isVisibleRef.current && !reconnectTimeoutRef.current) {
              setError('Connection lost - attempting to reconnect...');
              
              // Clear the subscription reference since it's closed
              subscriptionRef.current = null;
              
              // Attempt reconnection after a delay
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                if (isVisibleRef.current && !subscriptionRef.current) {
                  console.log('🔄 Attempting to reconnect...');
                  setupRealtimeSubscription();
                }
              }, 3000);
            }
          } else if (status === 'CHANNEL_ERROR') {
            setError('Real-time connection error');
            setIsConnected(false);
            subscriptionRef.current = null; // Clear reference on error
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ Subscription timed out');
            setError('Connection timed out - will retry');
            setIsConnected(false);
            subscriptionRef.current = null; // Clear reference on timeout
            
            // Retry connection with exponential backoff if page is visible
            if (isVisibleRef.current && !reconnectTimeoutRef.current) {
              const retryDelay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30000);
              retryCountRef.current = Math.min(retryCountRef.current + 1, 5);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                if (isVisibleRef.current && !subscriptionRef.current) {
                  console.log(`🔄 Retrying connection after timeout... (attempt ${retryCountRef.current})`);
                  setupRealtimeSubscription();
                }
              }, retryDelay);
            }
          }
        });

      subscriptionRef.current = channel;

    } catch (error) {
      console.error('❌ Failed to setup real-time subscription:', error);
      setError('Failed to setup real-time updates');
      setIsConnected(false);
      subscriptionRef.current = null;
    }
  };

  // Handle real-time updates
  const handleRealtimeUpdate = async (payload: { 
    eventType: string; 
    new?: Record<string, unknown>; 
    old?: Record<string, unknown>; 
  }) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      switch (eventType) {
        case 'INSERT': {
          console.log('➕ New donation added:', newRecord);
          
          // Check if donation is from today (SAST timezone)
          const now = new Date();
          const sastOffset = 2 * 60 * 60 * 1000;
          const sastNow = new Date(now.getTime() + sastOffset);
          const today = sastNow.toISOString().split('T')[0];
          
          const donationDate = new Date(newRecord?.created_at as string);
          const donationDateStr = donationDate.toISOString().split('T')[0];
          
          // Only update stats if donation is from today
          if (donationDateStr === today) {
            // Transform to match Donation interface
            const transformedRecord = {
              id: newRecord?.id as string,
              store_id: newRecord?.store_id as string,
              store_name_manual: newRecord?.store_name_manual as string,
              white_bread_qty: (newRecord?.white_bread_qty as number) || 0,
              brown_bread_qty: (newRecord?.brown_bread_qty as number) || 0,
              photo_url: (newRecord?.photo_url as string) || '',
              collected_at: (newRecord?.collected_at as string) || (newRecord?.created_at as string) || '',
              created_at: newRecord?.created_at as string,
              collector_id: newRecord?.collector_id as string,
              collector: { id: newRecord?.collector_id as string, email: '', name: 'Anonymous' },
              store: null
            };

            setStats(prev => ({
              totalDonations: prev.totalDonations + 1,
              totalBreadQty: prev.totalBreadQty + 
                ((newRecord?.brown_bread_qty as number) || 0) + 
                ((newRecord?.white_bread_qty as number) || 0),
              recentDonations: [transformedRecord, ...prev.recentDonations.slice(0, 9)],
              lastUpdated: new Date()
            }));
          } else {
            console.log(`⏩ Donation from ${donationDateStr} ignored (not today: ${today})`);
          }
          break;
        }

        case 'UPDATE': {
          console.log('✏️ Donation updated:', newRecord);
          
          setStats(prev => {
            const oldQty = ((oldRecord?.brown_bread_qty as number) || 0) + ((oldRecord?.white_bread_qty as number) || 0);
            const newQty = ((newRecord?.brown_bread_qty as number) || 0) + ((newRecord?.white_bread_qty as number) || 0);
            const qtyDiff = newQty - oldQty;

            return {
              ...prev,
              totalBreadQty: prev.totalBreadQty + qtyDiff,
              recentDonations: prev.recentDonations.map(donation =>
                donation.id === (newRecord?.id as string) ? { ...donation, ...newRecord } : donation
              ),
              lastUpdated: new Date()
            };
          });
          break;
        }

        case 'DELETE': {
          console.log('🗑️ Donation deleted:', oldRecord);
          
          setStats(prev => ({
            totalDonations: Math.max(0, prev.totalDonations - 1),
            totalBreadQty: Math.max(0, prev.totalBreadQty - 
              (((oldRecord?.brown_bread_qty as number) || 0) + ((oldRecord?.white_bread_qty as number) || 0))
            ),
            recentDonations: prev.recentDonations.filter(donation => donation.id !== (oldRecord?.id as string)),
            lastUpdated: new Date()
          }));
          break;
        }

        default:
          console.log('❓ Unknown event type:', eventType);
      }
    } catch (error) {
      console.error('❌ Error handling real-time update:', error);
    }
  };

  // Handle visibility changes
  const handleVisibilityChange = () => {
    const isVisible = !document.hidden;
    isVisibleRef.current = isVisible;
    
    console.log('👁️ Page visibility changed:', isVisible ? 'visible' : 'hidden');
    
    if (isVisible) {
      // Page became visible - reconnect and refresh data
      if (!isConnected) {
        console.log('🔄 Page visible - reconnecting...');
        setupRealtimeSubscription();
      }
      // Refresh stats when page becomes visible
      loadInitialStats();
    } else {
      // Page became hidden - clean up to prevent background issues
      console.log('👁️ Page hidden - cleaning up subscription');
      cleanupSubscription();
    }
  };

  // Handle focus changes
  const handleFocus = () => {
    console.log('🎯 Window focused');
    if (!isConnected && isVisibleRef.current) {
      setupRealtimeSubscription();
    }
  };

  // Initialize on mount
  useEffect(() => {
    loadInitialStats();
    
    // Set up initial connection
    isVisibleRef.current = !document.hidden;
    if (isVisibleRef.current) {
      setupRealtimeSubscription();
    }

    // Add visibility change listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Set up business day reset timer (18:00 SAST)
    const setupBusinessDayTimer = () => {
      const now = new Date();
      const southAfricaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
      
      // Calculate milliseconds until next 18:00 SAST
      const next18 = new Date(southAfricaTime);
      next18.setHours(18, 0, 0, 0);
      
      // If it's already past 18:00 today, set for tomorrow
      if (southAfricaTime.getTime() >= next18.getTime()) {
        next18.setDate(next18.getDate() + 1);
      }
      
      const msUntil18 = next18.getTime() - southAfricaTime.getTime();
      
      console.log(`⏰ Setting up business day reset in ${Math.round(msUntil18 / 1000 / 60 / 60)} hours (at 18:00 SAST)`);
      
      return setTimeout(() => {
        console.log('🌅 Business day reset triggered at 18:00 SAST!');
        refreshStats();
        // Set up the next day's timer
        setupBusinessDayTimer();
      }, msUntil18);
    };

    const businessDayTimer = setupBusinessDayTimer();

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearTimeout(businessDayTimer);
      cleanupSubscription();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh stats manually
  const refreshStats = () => {
    console.log('🔄 Manually refreshing stats...');
    
    // Check if business day has changed (18:00 SAST reset)
    const now = new Date();
    const southAfricaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
    
    const businessDayEnd = new Date(southAfricaTime);
    businessDayEnd.setHours(18, 0, 0, 0);
    const currentBusinessDayEndISO = businessDayEnd.toISOString().replace('Z', '+02:00');
    
    if (lastRefreshDateRef.current && lastRefreshDateRef.current !== currentBusinessDayEndISO) {
      console.log('🌅 New business day detected! Resetting stats...');
    }
    
    loadInitialStats();
    
    // Force reconnection
    cleanupSubscription();
    setTimeout(() => {
      setupRealtimeSubscription();
    }, 1000);
  };

  // Get user-specific stats
  const getUserStats = () => {
    if (!userId) return null;
    
    const userDonations = stats.recentDonations.filter(
      donation => donation.collector_id === userId
    );
    
    const userBreadQty = userDonations.reduce((sum, donation) => 
      sum + (donation.brown_bread_qty || 0) + (donation.white_bread_qty || 0), 0
    );

    return {
      donations: userDonations.length,
      breadQty: userBreadQty,
      lastDonation: userDonations[0] || null
    };
  };

  return {
    stats,
    isConnected,
    error,
    refreshStats,
    getUserStats: getUserStats()
  };
};
