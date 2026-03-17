import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Admin Supabase client - reuse the same client instance to avoid conflicts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create admin client with unique storage key to avoid conflicts
export const adminSupabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    storageKey: 'supabase.auth.admin', // Unique storage key
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  },
  global: {
    headers: {
      'x-client-info': 'admin-portal',
    },
  },
});

// Helper function to check if we have service role access
export const hasServiceRoleAccess = () => {
  return import.meta.env.VITE_SUPABASE_SERVICE_KEY ? true : false;
};
