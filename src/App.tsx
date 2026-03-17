import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseReady, signOut } from './lib/supabase';
import { User, Donation, DonationFormData } from './types';
import { useErrorHandler } from './hooks/useErrorHandler';
import { checkPerformanceBudget } from './utils/performance';

// Offline support
import { registerServiceWorker } from './lib/serviceWorker';
import { initializeOfflineStorage } from './lib/offlineStorage';
import OfflineStatusBar from './components/Offline/OfflineStatusBar';

// Essential components (keep eagerly loaded for immediate use)
import Toast from './components/UI/Toast';
import LoadingOverlay from './components/UI/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Import SignUpForm
import SignUpForm from './components/Auth/SignUpForm';

// Import Layout eagerly to fix loading issues
import Layout from './components/Layout/Layout';

// Lazy loaded components for code splitting and better performance
const AdminPortal = lazy(() => import('./components/Admin/AdminPortal'));
const StatsPage = lazy(() => import('./components/Stats/StatsPage'));
const LoginForm = lazy(() => import('./components/Auth/LoginForm'));
const ShortCodeLogin = lazy(() => import('./components/Auth/ShortCodeLogin'));
const ResetPasswordPage = lazy(() => import('./components/Auth/ResetPasswordPage'));
const DonationForm = lazy(() => import('./components/Donation/DonationForm'));
const ConfirmationScreen = lazy(() => import('./components/Donation/ConfirmationScreen'));

// Services
import { submitDonation } from './services/donationService';

interface AppState {
  user: User | null;
  loading: boolean;
  isSubmitting: boolean;
  lastSubmittedDonation: Donation | null;
  showSignUp: boolean;
  useShortCodeAuth: boolean;
  toast: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
}

// Global variables to track initialization state across all component instances
let globalOfflineInitialized = false;
let globalAuthInitialized = false;
let globalInstanceCount = 0;

// Configuration Error Component
const ConfigurationError: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Configuration Required</h1>
      <p className="text-gray-600 mb-4">
        THFCScan needs to be connected to Supabase to function properly.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 text-left">
        <p className="text-sm text-gray-700 mb-2">To get started:</p>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Click "Connect to Supabase" in the top right</li>
          <li>Follow the setup instructions</li>
          <li>Refresh this page</li>
        </ol>
      </div>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    loading: true,
    isSubmitting: false,
    lastSubmittedDonation: null,
    showSignUp: false,
    useShortCodeAuth: false,
    toast: null,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { handleError } = useErrorHandler();
  const instanceId = useRef(Math.random().toString(36).substring(2, 8));
  const authInitializedRef = useRef(false);
  const offlineInitializedRef = useRef(false);

  // Increment global instance counter
  useEffect(() => {
    globalInstanceCount++;
    const currentInstanceId = instanceId.current;
    console.log(`🎯 App component mounting [${currentInstanceId}] - Instance #${globalInstanceCount}`);
    
    return () => {
      console.log(`🎯 App component unmounting [${currentInstanceId}]`);
    };
  }, []);

  // Check performance budget on app start
  useEffect(() => {
    if (!offlineInitializedRef.current) {
      checkPerformanceBudget();
    }
  }, []);

  // Initialize app state
  useEffect(() => {
    let mounted = true;
    
    const initOfflineSupport = async () => {
      // Use both global and local refs to prevent duplicate initialization
      if (globalOfflineInitialized || offlineInitializedRef.current) {
        console.log(`⚠️ Offline support already initialized, skipping [${instanceId.current}]`);
        return;
      }
      
      globalOfflineInitialized = true;
      offlineInitializedRef.current = true;
      
      try {
        console.log(`🔄 Initializing offline support... [${instanceId.current}]`);
        // Temporarily disable service worker in development to fix loading issues
        if (import.meta.env.MODE === 'production') {
          await registerServiceWorker();
        } else {
          console.log('⚠️ Service worker disabled in development mode');
        }
        await initializeOfflineStorage();
        if (mounted) {
          console.log(`✅ Offline support initialized [${instanceId.current}]`);
        }
      } catch (error) {
        if (mounted) {
          console.warn(`⚠️ Offline support initialization failed [${instanceId.current}]:`, error);
        }
        // Reset flags on failure so it can be retried
        globalOfflineInitialized = false;
        offlineInitializedRef.current = false;
      }
    };

    initOfflineSupport();

    // Listen for donations synced event
    const handleDonationsSynced = (event: CustomEvent) => {
      showSuccess(`${event.detail.count} offline donation${event.detail.count > 1 ? 's' : ''} synced successfully!`);
    };

    window.addEventListener('donations-synced', handleDonationsSynced as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('donations-synced', handleDonationsSynced as EventListener);
    };
  }, []);

  // Initialize auth check only once - this hook runs regardless of Supabase configuration
  useEffect(() => {
    console.log(`🚀 App starting - initializing auth [${instanceId.current}]`);
    
    // Check if Supabase is configured first
    if (!isSupabaseReady) {
      console.log(`⚠️ Supabase not configured, skipping auth initialization [${instanceId.current}]`);
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    let mounted = true;
    
    const initializeAuth = async () => {
      // Use both global and local refs to prevent duplicate initialization
      if (globalAuthInitialized || authInitializedRef.current) {
        console.log(`⚠️ Auth already initialized, skipping [${instanceId.current}]`);
        // Still need to check if we should show loading state
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
        return;
      }
      
      globalAuthInitialized = true;
      authInitializedRef.current = true;
      
      try {
        console.log(`🔍 Checking initial auth status... [${instanceId.current}]`);
        
        // IMPORTANT: Always start with loading state and no user
        // This prevents showing stale user data while session is being validated
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            user: null,  // Clear any stale user state immediately
            loading: true 
          }));
        }
        
        console.log(`📡 Getting current session... [${instanceId.current}]`);
        
        // Add timeout to session check
        let sessionResult;
        try {
          console.log(`🔍 Checking for existing session [${instanceId.current}]`);
          sessionResult = await supabase.auth.getSession();
        } catch (sessionError) {
          console.warn(`❌ Session check failed: ${sessionError} [${instanceId.current}]`);
          if (mounted) {
            setState(prev => ({ 
              ...prev, 
              user: null, 
              loading: false 
            }));
          }
          return;
        }
        
        const { data: { session }, error } = sessionResult as { data: { session: unknown }, error: unknown };
        
        if (error) {
          console.error('❌ Auth session error:', error);
          
          // Check if the error is related to invalid refresh token or invalid session
          if (error && typeof error === 'object' && 'message' in error && 
              typeof error.message === 'string' && 
              (error.message.includes('Refresh Token Not Found') || 
               error.message.includes('Session from session_id claim in JWT does not exist') ||
               error.message.includes('refresh_token_not_found') ||
               error.message.includes('invalid_grant'))) {
            console.log('🔄 Invalid/expired session detected, clearing session...');
            try {
              await supabase.auth.signOut();
              console.log('✅ Invalid session cleared successfully');
            } catch (signOutError) {
              console.error('❌ Failed to clear invalid session:', signOutError);
            }
          }
          
          if (mounted) {
            setState(prev => ({ 
              ...prev, 
              user: null, 
              loading: false 
            }));
          }
          return;
        }

        if (session && typeof session === 'object' && session !== null && 'user' in session && session.user) {
          console.log(`👤 Found existing session, validating and loading user profile [${instanceId.current}]`);
          
          // Double-check that the session is actually valid by making an authenticated request
          try {
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !currentUser) {
              console.warn(`⚠️ Session exists but user validation failed: ${userError?.message} [${instanceId.current}]`);
              
              // Before giving up, try to refresh the session
              console.log(`🔄 Attempting to refresh session... [${instanceId.current}]`);
              try {
                const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
                
                if (refreshError || !refreshedSession?.user) {
                  console.warn(`❌ Session refresh failed: ${refreshError?.message} [${instanceId.current}]`);
                  // Session is truly invalid, clear it
                  await supabase.auth.signOut();
                  if (mounted) {
                    setState(prev => ({ 
                      ...prev, 
                      user: null, 
                      loading: false 
                    }));
                  }
                  return;
                } else {
                  console.log(`✅ Session refreshed successfully [${instanceId.current}]`);
                  // Proceed with refreshed session
                  await loadUserProfile(refreshedSession.user.id);
                  return;
                }
              } catch (refreshAttemptError) {
                console.error(`❌ Session refresh attempt failed: ${refreshAttemptError} [${instanceId.current}]`);
                // Session is invalid, clear it
                await supabase.auth.signOut();
                if (mounted) {
                  setState(prev => ({ 
                    ...prev, 
                    user: null, 
                    loading: false 
                  }));
                }
                return;
              }
            }
            
            // Session is valid, proceed with loading profile
            await loadUserProfile(currentUser.id);
          } catch (validationError) {
            console.error(`❌ Session validation failed: ${validationError} [${instanceId.current}]`);
            await supabase.auth.signOut();
            if (mounted) {
              setState(prev => ({ 
                ...prev, 
                user: null, 
                loading: false 
              }));
            }
            return;
          }
        } else {
          console.log(`🚫 No existing session found [${instanceId.current}]`);
          
          // Check for short code session as fallback
          try {
            const shortCodeSession = localStorage.getItem('thfcscan_shortcode_session');
            if (shortCodeSession) {
              const sessionData = JSON.parse(shortCodeSession);
              const expiresAt = new Date(sessionData.expiresAt);
              
              if (expiresAt > new Date()) {
                console.log(`✅ Found valid short code session [${instanceId.current}]`);
                if (mounted) {
                  setState(prev => ({
                    ...prev,
                    user: sessionData.user,
                    loading: false,
                  }));
                }
                return;
              } else {
                console.log(`❌ Short code session expired, removing [${instanceId.current}]`);
                localStorage.removeItem('thfcscan_shortcode_session');
              }
            }
          } catch (shortCodeError) {
            console.warn(`⚠️ Error checking short code session: ${shortCodeError} [${instanceId.current}]`);
            localStorage.removeItem('thfcscan_shortcode_session');
          }
          
          if (mounted) {
            // Clear any stale user state - don't navigate, let the render logic handle showing login
            setState(prev => ({ 
              ...prev, 
              user: null, 
              loading: false 
            }));
          }
        }
      } catch (err) {
        console.error('💥 Auth initialization failed:', err);
        handleError(err, 'Auth initialization');
        if (mounted) {
          // On any auth initialization failure, clear user state
          setState(prev => ({ 
            ...prev, 
            user: null, 
            loading: false 
          }));
        }
      }
    };

    const loadUserProfile = async (userId: string, retryCount = 0) => {
      console.log(`👤 Loading user profile for: ${userId} [${instanceId.current}] (attempt ${retryCount + 1})`);
      console.log('⏱️ Profile load start time:', new Date().toISOString());
      
      // Add timeout protection to prevent hanging - reduced for faster failure
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile loading timeout')), 5000); // 5 second timeout for faster recovery
      });
      
      try {
        // Wrap the entire profile loading in a timeout
        await Promise.race([
          (async () => {
            // Get the authenticated user with simplified approach
            console.log('🔐 Getting auth user...');
            let authResult;
            let authUser;
            
            try {
              // First try getting current user
              authResult = await supabase.auth.getUser();
              
              // If that fails, try getting session
              if (!authResult.data.user) {
                console.log('🔄 No current user, trying session...');
                const sessionResult = await supabase.auth.getSession();
                if (sessionResult.data.session?.user) {
                  authResult = { data: { user: sessionResult.data.session.user } };
                } else {
                  throw new Error('No valid user or session found');
                }
              }
              
              authUser = authResult.data.user as { id: string; email?: string; user_metadata?: { full_name?: string; employee_id?: string } };
              console.log('🔐 Auth user data:', authUser?.id);
              
              if (!authUser) {
                throw new Error('No auth user found');
              }
            } catch (error) {
              console.error('❌ Auth user check failed:', error);
              // If we can't get auth user, something is seriously wrong - sign out
              try {
                await supabase.auth.signOut();
                console.log('🔄 Signed out due to auth user failure');
              } catch (signOutError) {
                console.error('❌ Failed to sign out:', signOutError);
              }
              
              if (mounted) {
                setState(prev => ({
                  ...prev,
                  user: null,
                  loading: false,
                }));
              }
              return;
            }

            // Create fallback user data from auth user immediately
            const fallbackUserData: User = {
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
              employee_id: authUser.user_metadata?.employee_id || `FF-${Date.now().toString().slice(-3)}`,
            };

            // Try to get existing profile with timeout
            console.log('🔍 Checking for existing profile...');
            let profile, profileError;
            
            try {
              const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
              
              const profileTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Profile query timeout')), 5000);
              });
              
              const result = await Promise.race([profilePromise, profileTimeout]) as { data: unknown; error: unknown };
              profile = result.data;
              profileError = result.error;
              console.log('📋 Profile query result:', { profile, error: profileError });
            } catch (error) {
              console.warn('⚠️ Profile fetch failed, using fallback user data', error);
              profile = null;
              profileError = error;
            }

            let finalProfile = profile;

            // If no profile exists, try to create one (with timeout)
            if (!profile && !profileError) {
              console.log('🔧 No profile found, attempting profile creation...');
              const newProfileData = {
                id: authUser.id,
                full_name: fallbackUserData.full_name,
                employee_id: fallbackUserData.employee_id,
                email: fallbackUserData.email,
              };

              try {
                const createPromise = supabase
                  .from('profiles')
                  .insert([newProfileData])
                  .select()
                  .single();
                
                const createTimeout = new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Profile creation timeout')), 5000);
                });
                
                const createResult = await Promise.race([createPromise, createTimeout]) as { data: unknown; error: unknown };

                if (createResult.error) {
                  console.error('❌ Failed to create profile:', createResult.error);
                  
                  // Check if it's a duplicate key error (profile already exists)
                  if ((createResult.error as any).code === '23505') {
                    console.log('ℹ️ Profile already exists (duplicate key), fetching existing profile...');
                    // Try to fetch the existing profile
                    try {
                      const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', authUser.id)
                        .single();
                      
                      if (existingProfile) {
                        console.log('✅ Found existing profile:', existingProfile);
                        finalProfile = existingProfile;
                      } else {
                        console.warn('⚠️ Could not fetch existing profile, using fallback');
                        finalProfile = null;
                      }
                    } catch (fetchError) {
                      console.warn('⚠️ Error fetching existing profile:', fetchError);
                      finalProfile = null;
                    }
                  } else {
                    finalProfile = null;
                  }
                } else {
                  console.log('✅ Profile created successfully:', createResult.data);
                  finalProfile = createResult.data;
                }
              } catch (error) {
                console.warn('⚠️ Profile creation failed, using fallback user data', error);
                finalProfile = null;
              }
            } else if (profileError) {
              console.error('❌ Error fetching profile, using fallback user data:', profileError);
              finalProfile = null;
            }
            
            // Always create user data - use profile if available, otherwise use fallback
            if (authUser && mounted) {
              const employeeId = (finalProfile as { employee_id?: string })?.employee_id || fallbackUserData.employee_id;
              const fullName = (finalProfile as { full_name?: string })?.full_name || fallbackUserData.full_name;
              const userData: User = {
                id: authUser.id,
                email: authUser.email || '',
                ...(fullName && { full_name: fullName }),
                ...(employeeId && { employee_id: employeeId }),
              };

              console.log('✅ User profile loaded successfully:', userData);
              console.log('⏱️ Profile load end time:', new Date().toISOString());
              setState(prev => ({
                ...prev,
                user: userData,
                loading: false,
              }));
            }
          })(),
          timeoutPromise
        ]);
      } catch (err) {
        console.error('💥 Failed to load user profile:', err);
        console.log('⏱️ Profile load error time:', new Date().toISOString());
        
        // Reduced retry logic to prevent loops
        if (retryCount < 1 && mounted) {
          console.log(`🔄 Retrying profile load (attempt ${retryCount + 2})...`);
          setTimeout(() => {
            if (mounted) {
              loadUserProfile(userId, retryCount + 1);
            }
          }, 2000); // Fixed 2 second delay
          return;
        }
        
        // After retries failed, try to create emergency user from session
        console.log('🚨 All profile loading attempts failed, creating emergency user from session...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            const emergencyUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              employee_id: session.user.user_metadata?.employee_id || `FF-${Date.now().toString().slice(-3)}`,
            };
            
            console.log('🆘 Created emergency user from session:', emergencyUser);
            setState(prev => ({
              ...prev,
              user: emergencyUser,
              loading: false,
              toast: {
                message: 'Profile loading failed, but you can still use the app. Some features may be limited.',
                type: 'warning'
              }
            }));
            return;
          }
        } catch (emergencyError) {
          console.error('❌ Emergency user creation failed:', emergencyError);
        }
        
        // Only clear user state if we absolutely cannot recover
        handleError(err, 'User profile loading');
        
        if (mounted) {
          console.log('🚨 Complete profile loading failure - signing out user');
          try {
            await supabase.auth.signOut();
            console.log('🔄 Signed out due to complete profile loading failure');
          } catch (signOutError) {
            console.error('❌ Failed to sign out:', signOutError);
          }
          
          setState(prev => ({
            ...prev,
            user: null,
            loading: false,
            toast: {
              message: 'Unable to load your profile. Please try logging in again.',
              type: 'error'
            }
          }));
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes only if Supabase is configured
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log(`🔄 Auth state change: ${event} ${session?.user?.id || 'undefined'} [${instanceId.current}]`);
          if (!mounted) return;
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log(`✅ User signed in, loading profile [${instanceId.current}]`);
            // Clear any existing error toast when successfully signing in
            setState(prev => ({ 
              ...prev, 
              toast: prev.toast?.type === 'error' ? null : prev.toast
            }));
            await loadUserProfile(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            console.log(`👋 User signed out [${instanceId.current}]`);
            setState(prev => ({ 
              ...prev, 
              user: null, 
              loading: false,
              // Preserve toast state to ensure error messages remain visible
              toast: prev.toast
            }));
            // Don't navigate immediately from auth state change - let render logic handle it
          } else if (event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              console.log(`🔄 Token refreshed for user: ${session.user.id} [${instanceId.current}]`);
              // Optionally reload user profile on token refresh
            } else {
              console.warn(`⚠️ Token refresh failed - no session or user [${instanceId.current}]`);
              // Token refresh failed, sign out the user
              try {
                await supabase.auth.signOut();
                console.log(`✅ Signed out due to failed token refresh [${instanceId.current}]`);
              } catch (signOutError) {
                console.error(`❌ Failed to sign out after token refresh failure: ${signOutError} [${instanceId.current}]`);
              }
            }
          } else if (event === 'USER_UPDATED' && session?.user) {
            console.log(`👤 User updated: ${session.user.id} [${instanceId.current}]`);
            // Reload user profile on user update
            await loadUserProfile(session.user.id);
          }
        } catch (authError) {
          console.error(`❌ Auth state change error: ${authError} [${instanceId.current}]`);
          
          // Handle specific auth API errors
          if (authError && typeof authError === 'object' && 'message' in authError && 
              typeof authError.message === 'string' && 
              (authError.message.includes('Invalid Refresh Token') || 
               authError.message.includes('Refresh Token Not Found') ||
               authError.message.includes('refresh_token_not_found') ||
               authError.message.includes('invalid_grant'))) {
            console.log(`🔄 Invalid refresh token detected in auth state change, signing out [${instanceId.current}]`);
            try {
              await supabase.auth.signOut();
              console.log(`✅ Signed out due to invalid refresh token [${instanceId.current}]`);
            } catch (signOutError) {
              console.error(`❌ Failed to sign out after auth error: ${signOutError} [${instanceId.current}]`);
            }
            
            // Clear user state
            if (mounted) {
              setState(prev => ({ 
                ...prev, 
                user: null, 
                loading: false
              }));
            }
          } else {
            // Handle other auth errors
            handleError(authError, 'Authentication state change');
          }
        }
      }
    );

    // Periodic session validation - check every 5 minutes
    const sessionValidator = setInterval(async () => {
      if (!mounted) return;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.warn(`⚠️ Periodic session check failed - session expired or invalid [${instanceId.current}]`);
          setState(prev => {
            // Only clear user state if user was previously authenticated
            if (prev.user) {
              console.log(`🚨 Detected expired session, clearing user state [${instanceId.current}]`);
              return { 
                ...prev, 
                user: null, 
                loading: false,
                // Preserve toast state to ensure error messages remain visible
                toast: prev.toast
              };
            }
            return prev;
          });
        } else {
          // Session is still valid
          console.log(`✅ Periodic session check passed [${instanceId.current}]`);
        }
      } catch (validationError) {
        console.warn(`⚠️ Periodic session validation error [${instanceId.current}]:`, validationError);
        // On validation error, clear user state if they were logged in
        setState(prev => {
          if (prev.user) {
            console.log(`🚨 Session validation error, clearing user state [${instanceId.current}]`);
            return { 
              ...prev, 
              user: null, 
              loading: false,
              // Preserve toast state to ensure error messages remain visible
              toast: prev.toast
            };
          }
          return prev;
        });
      }
          }, 5 * 60 * 1000); // Check every 5 minutes

    // Emergency timeout to prevent infinite loading - only if still loading
    const emergencyTimeout = setTimeout(() => {
      if (mounted) {
        setState(prev => {
          if (prev.loading) {
            console.warn(`🚨 Emergency timeout triggered - forcing app to load [${instanceId.current}]`);
            // Clear loading state but don't navigate - let render logic handle showing login
            // Preserve toast state to ensure error messages remain visible
            return { ...prev, loading: false, toast: prev.toast };
          }
          return prev;
        });
      }
    }, 15000); // 15 second emergency timeout (reduced from 20s)

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(sessionValidator);
      clearTimeout(emergencyTimeout);
    };
  }, [navigate, handleError]); // Added dependencies

  const handleLogin = (userData?: User) => {
    console.log('🔑 Login successful', userData);
    setState(prev => ({ 
      ...prev, 
      showSignUp: false,
      user: userData || prev.user // Store user data if provided, keep existing if not
    }));
    navigate('/');
  };

  const handleSignUp = () => {
    console.log('📝 Sign up successful');
    setState(prev => ({ ...prev, showSignUp: false }));
    showSuccess('Account created successfully! Please check your email to verify your account.');
  };

  const handleShowSignUp = () => {
    console.log('📝 Showing sign up form');
    setState(prev => ({ ...prev, showSignUp: true }));
  };

  const handleBackToLogin = () => {
    console.log('🔙 Back to login');
    setState(prev => ({ ...prev, showSignUp: false }));
  };

  const handleSignOut = async () => {
    console.log('👋 Signing out');
    
    // Clear short code session if it exists
    localStorage.removeItem('thfcscan_shortcode_session');
    
    // Only call supabase signOut if we have a regular auth user (not short code user)
    if (state.user && !state.user.short_code) {
      try {
        await signOut();
      } catch (error) {
        console.error('❌ Error during sign out:', error);
      }
    }
    
    setState(prev => ({
      ...prev,
      user: null,
      lastSubmittedDonation: null,
    }));
  };

  const handleDonationSubmit = async (formData: DonationFormData) => {
    if (!state.user) {
      console.error('❌ No user found for donation submission');
      return;
    }

    console.log('📤 Starting donation submission:', formData);
    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Quick profile check with timeout
      console.log('🔍 Quick profile check before donation submission');
      
      const profileCheckPromise = supabase
        .from('profiles')
        .select('id')
        .eq('id', state.user.id)
        .maybeSingle();

      const checkTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile check timeout')), 20000); // Increased timeout for better reliability
      });

      let profile, profileError;
      
      try {
        const result = await Promise.race([profileCheckPromise, checkTimeoutPromise]);
        profile = (result as { data: unknown; error: unknown }).data;
        profileError = (result as { data: unknown; error: unknown }).error;
      } catch {
        console.warn('⏰ Profile check timed out, attempting to create profile');
        profile = null;
        profileError = null;
      }

      if (profileError) {
        console.error('❌ Error checking profile:', profileError);
        // Continue anyway - the donation might still work
      }

      if (!profile) {
        console.log('🔧 Profile missing, attempting quick creation');
        
        try {
          // Add timeout to profile creation to prevent hanging
          const createProfilePromise = supabase
            .from('profiles')
            .insert([{
              id: state.user.id,
              full_name: state.user.full_name || null,
              employee_id: state.user.employee_id || null,
              email: state.user.email,
            }])
            .select()
            .single();

          const createTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile creation timeout')), 30000); // Increased timeout for better reliability
          });

          const createResult = await Promise.race([createProfilePromise, createTimeoutPromise]);

          if ((createResult as any).error) {
            // Check if it's a duplicate key error (profile already exists)
            if ((createResult as any).error.code === '23505') {
              console.log('ℹ️ Profile already exists (duplicate key), continuing...');
            } else {
              console.error('❌ Profile creation error:', (createResult as any).error);
            }
          } else {
            console.log('✅ Profile created successfully:', (createResult as any).data);
          }
        } catch (createError) {
          console.error('❌ Failed to create profile:', createError);
          // Continue anyway - the donation might still work since auth.users exists
          console.warn('⚠️ Continuing with donation submission despite profile creation failure');
        }
      }

      console.log('🚀 Calling submitDonation with user ID:', state.user.id);
      
      // Add timeout to donation submission to prevent hanging
      const donationSubmissionPromise = submitDonation(formData, state.user.id);
      const submissionTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Donation submission timeout - please try again')), 30000); // 30 second timeout
      });
      
      const donation = await Promise.race([donationSubmissionPromise, submissionTimeoutPromise]);
      console.log('✅ Donation submitted successfully:', donation);
      
      setState(prev => ({
        ...prev,
        lastSubmittedDonation: donation,
        isSubmitting: false,
        toast: {
          message: 'Donation report submitted successfully!',
          type: 'success',
        },
      }));

      navigate('/confirmation');
    } catch (error) {
      console.error('💥 Donation submission failed:', error);
      handleError(error, 'Donation submission');
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        toast: {
          message: error instanceof Error ? error.message : 'Failed to submit donation report',
          type: 'error',
        },
      }));
    }
  };

  const handleStartNewReport = () => {
    console.log('🆕 Starting new report');
    setState(prev => ({
      ...prev,
      lastSubmittedDonation: null,
    }));
    navigate('/');
  };

  const handleSyncOffline = async () => {
    try {
      console.log('🔄 Manual sync triggered');
      setState(prev => ({ ...prev, toast: { message: 'Syncing offline donations...', type: 'info' } }));
      
      // Get pending donations from offline storage
      const { getPendingOfflineDonations, markDonationSynced } = await import('./lib/offlineStorage');
      const pendingDonations = await getPendingOfflineDonations();
      
      console.log(`📤 Found ${pendingDonations.length} pending donations to sync`);
      console.log('📋 Pending donations:', pendingDonations);
      
      if (pendingDonations.length === 0) {
        setState(prev => ({ ...prev, toast: { message: 'No donations to sync', type: 'info' } }));
        return;
      }
      
      // Sync each donation using the donation service
      let successCount = 0;
      for (const offlineDonation of pendingDonations) {
        try {
          console.log('📤 Syncing donation:', offlineDonation.id);
          
          // Use direct Supabase insertion for offline sync
          const { supabase } = await import('./lib/supabase');
          
          const donationData = {
            store_id: offlineDonation.data.store_id as string,
            store_name_manual: offlineDonation.data.store_name_manual as string,
            white_bread_qty: offlineDonation.data.white_bread_qty as number,
            brown_bread_qty: offlineDonation.data.brown_bread_qty as number,
            photo_url: offlineDonation.data.photo_url as string,
            collector_id: state.user!.id,
            collected_at: offlineDonation.data.collected_at as string,
          };
          
          const { error } = await supabase
            .from('donations')
            .insert([donationData]);
          
          if (error) {
            throw error;
          }
          
          await markDonationSynced(offlineDonation.id);
          successCount++;
          console.log('✅ Donation synced successfully:', offlineDonation.id);
        } catch (error) {
          console.error('❌ Error syncing donation:', offlineDonation.id, error);
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        toast: { 
          message: `Synced ${successCount} of ${pendingDonations.length} donations`, 
          type: successCount === pendingDonations.length ? 'success' : 'warning' 
        } 
      }));
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      setState(prev => ({ ...prev, toast: { message: 'Sync failed. Please try again.', type: 'error' } }));
    }
  };

  const showError = (message: string) => {
    console.log('❌ Showing error:', message);
    setState(prev => ({
      ...prev,
      toast: { message, type: 'error' },
    }));
  };

  const showSuccess = (message: string) => {
    console.log('✅ Showing success:', message);
    setState(prev => ({
      ...prev,
      toast: { message, type: 'success' },
    }));
  };

  const hideToast = () => {
    setState(prev => ({ ...prev, toast: null }));
  };

  // Check if Supabase is configured - show error if not
  if (!isSupabaseReady) {
    console.log('⚠️ Supabase not configured, showing configuration error');
    return <ConfigurationError />;
  }

  // Show loading screen with timeout protection
  if (state.loading) {
    console.log('⏳ Showing loading screen');
    return <LoadingOverlay message="Loading THFCScan..." />;
  }

  // Show sign up form
  if (state.showSignUp && !state.user && !location.pathname.startsWith('/admin')) {
    console.log('📝 Showing sign up form');
    return (
      <div>
        <SignUpForm
          onSignUp={handleSignUp}
          onError={showError}
          onBackToLogin={handleBackToLogin}
        />
        
        {/* Toast Notifications for Sign Up Screen */}
        {state.toast && (
          <Toast
            message={state.toast.message}
            type={state.toast.type}
            onClose={hideToast}
          />
        )}
      </div>
    );
  }

  // Show login for unauthenticated users (except admin route)
  if (!state.user && !location.pathname.startsWith('/admin')) {
    console.log('🔑 Showing login form');
    return (
      <div>
        <Suspense fallback={<LoadingOverlay message="Loading Login..." />}>
          {state.useShortCodeAuth ? (
            <ShortCodeLogin
              onLogin={handleLogin}
              onError={showError}
              onShowFullLogin={() => setState(prev => ({ ...prev, useShortCodeAuth: false }))}
            />
          ) : (
            <LoginForm
              onLogin={handleLogin}
              onError={showError}
              onShowSignUp={handleShowSignUp}
              onSuccess={showSuccess}
            />
          )}
        </Suspense>
        
        {/* Auth Method Toggle */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setState(prev => ({ ...prev, useShortCodeAuth: !prev.useShortCodeAuth }))}
            className="px-4 py-2 bg-[var(--color-primary-brand)] text-white rounded-lg shadow-lg hover:opacity-90 transition-opacity text-sm"
          >
            {state.useShortCodeAuth ? 'Use Full Login' : 'Use Short Code'}
          </button>
        </div>
        
        {/* Toast Notifications for Login Screen */}
        {state.toast && (
          <Toast
            message={state.toast.message}
            type={state.toast.type}
            onClose={hideToast}
          />
        )}
      </div>
    );
  }

  const isAdminRoute = location.pathname.startsWith('/admin');
  console.log(isAdminRoute ? '👑 Showing admin portal' : '🏠 Showing main app with user:', state.user?.email || 'none');
  
  return (
    <div className="app-container">
      {/* Offline Status Bar */}
              <OfflineStatusBar onSyncClick={handleSyncOffline} />
      
      <Routes>
        {/* Main authenticated routes */}
        {state.user && (
          <>
            <Route 
              path="/" 
              element={
                <Layout user={state.user} onSignOut={handleSignOut}>
                  <Suspense fallback={<LoadingOverlay message="Loading Donation Form..." />}>
                    <DonationForm
                      user={state.user}
                      onSubmit={handleDonationSubmit}
                      onError={showError}
                      isSubmitting={state.isSubmitting}
                    />
                  </Suspense>
                </Layout>
              } 
            />
            <Route 
              path="/stats" 
              element={
                <Layout user={state.user} onSignOut={handleSignOut}>
                  <Suspense fallback={<LoadingOverlay message="Loading Statistics..." />}>
                    <StatsPage user={state.user} />
                  </Suspense>
                </Layout>
              } 
            />
            <Route 
              path="/confirmation" 
              element={
                <Layout user={state.user} onSignOut={handleSignOut}>
                  {state.lastSubmittedDonation ? (
                    <Suspense fallback={<LoadingOverlay message="Loading Confirmation..." />}>
                      <ConfirmationScreen
                        donation={state.lastSubmittedDonation}
                        onStartNew={handleStartNewReport}
                      />
                    </Suspense>
                  ) : (
                    <Navigate to="/" replace />
                  )}
                </Layout>
              } 
            />
          </>
        )}
        
        {/* Admin route - accessible without main auth */}
        <Route 
          path="/admin" 
          element={
            <div className="min-h-screen bg-[var(--color-background-off-white)] p-4">
              <Suspense fallback={<LoadingOverlay message="Loading Admin Portal..." />}>
                <AdminPortal
                  onError={showError}
                  onSuccess={showSuccess}
                />
              </Suspense>
            </div>
          } 
        />
        
        {/* Password reset route - accessible without main auth */}
        <Route 
          path="/reset-password" 
          element={
            <Suspense fallback={<LoadingOverlay message="Loading Password Reset..." />}>
              <ResetPasswordPage
                onError={showError}
                onSuccess={showSuccess}
              />
            </Suspense>
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Loading Overlay */}
      {state.isSubmitting && (
        <LoadingOverlay message="Securing Record..." />
      )}

      {/* Toast Notifications */}
      {state.toast && (
        <Toast
          message={state.toast.message}
          type={state.toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  console.log('🎯 App component mounting');
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
};

export default App;