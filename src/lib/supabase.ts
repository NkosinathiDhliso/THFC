import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase initialization:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl?.substring(0, 30) + '...',
  keyPrefix: supabaseAnonKey?.substring(0, 10) + '...'
});

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder') &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

if (!isSupabaseConfigured) {
  console.error('❌ Supabase not properly configured. Please check your environment variables.');
}

// Create a mock client for when Supabase is not configured
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithPassword: () => Promise.resolve({ 
      data: { user: null, session: null }, 
      error: { message: 'Supabase not configured' } 
    }),
    signUp: () => Promise.resolve({ 
      data: { user: null, session: null }, 
      error: { message: 'Supabase not configured' } 
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
      })
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
      })
    })
  })
});

export const supabase = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000)
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : (createMockClient() as unknown as ReturnType<typeof createClient<Database>>);

// Helper function to get current user
export const getCurrentUser = async () => {
  console.log('👤 Getting current user...');
  console.log('⏱️ getCurrentUser start time:', new Date().toISOString());
  
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured, returning null user');
    return { user: null, error: { message: 'Supabase not configured' } };
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('⏱️ getCurrentUser end time:', new Date().toISOString());
    console.log('👤 Current user result:', { userId: user?.id, error });
    return { user, error };
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    console.log('⏱️ getCurrentUser error time:', new Date().toISOString());
    return { user: null, error };
  }
};

// Helper function to sign out
export const signOut = async () => {
  console.log('👋 Signing out...');
  console.log('⏱️ signOut start time:', new Date().toISOString());
  
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured, skipping sign out');
    return { error: null };
  }
  
  const { error } = await supabase.auth.signOut();
  
  console.log('⏱️ signOut end time:', new Date().toISOString());
  
  if (error) {
    console.error('❌ Sign out error:', error);
  } else {
    console.log('✅ Sign out successful');
  }
  return { error };
};

// Export configuration status for use in components
export const isSupabaseReady = isSupabaseConfigured;