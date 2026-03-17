import { supabase } from '../lib/supabase';
import { DonationFormData, Donation } from '../types';
import { storeOfflineDonation } from '../lib/offlineStorage';
import { uploadPhotoToS3 } from './s3Service';

export const submitDonation = async (
  formData: DonationFormData,
  userId: string
): Promise<Donation> => {
  console.log('📤 submitDonation called with:', { formData, userId });
  console.log('⏱️ submitDonation start time:', new Date().toISOString());

  // Check if user is online
  const isOnline = navigator.onLine;
  console.log('🌐 Network status:', isOnline ? 'ONLINE' : 'OFFLINE');

  // If offline, store for later sync
  if (!isOnline) {
    console.log('📴 Device is offline - storing donation for later sync');
    
    // Create offline donation data
    const offlineDonationData = {
      store_id: formData.storeId || null,
      store_name_manual: formData.storeNameManual || null,
      white_bread_qty: formData.whiteBreadQty,
      brown_bread_qty: formData.brownBreadQty,
      photo_url: formData.photoUrl || '', // Store as data URL for offline
      collector_id: userId,
      collected_at: new Date().toISOString(),
      offline_submission: true
    };

    try {
      const offlineId = await storeOfflineDonation(
        offlineDonationData, 
        import.meta.env.VITE_AWS_API_KEY
      );
      
      console.log('✅ Donation stored offline with ID:', offlineId);
      
      // Return offline donation object for UI consistency
      const offlineDonation: Donation = {
        id: offlineId,
        store_id: formData.storeId || null,
        store_name_manual: formData.storeNameManual || null,
        white_bread_qty: formData.whiteBreadQty,
        brown_bread_qty: formData.brownBreadQty,
        photo_url: formData.photoUrl || '',
        collected_at: new Date().toISOString(),
        collector_id: userId,
        offline_pending: true
      };

      // Register for background sync when connection returns
      if ('serviceWorker' in navigator && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // Note: Background sync is not universally supported, so we'll handle this gracefully
          if ('sync' in registration) {
            await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('donation-sync');
            console.log('✅ Background sync registered for offline donation');
          } else {
            console.warn('⚠️ Background sync not supported by this browser');
          }
        } catch (error) {
          console.warn('⚠️ Failed to register background sync:', error);
        }
      }

      return offlineDonation;
    } catch (error) {
      console.error('❌ Failed to store offline donation:', error);
      throw new Error('Unable to save donation while offline. Please try again when connection is restored.');
    }
  }

  // Online submission (using S3 for photo storage)
  try {
    // 1. Process photo - upload to AWS S3
    console.log('📸 Processing photo...');
    let photoUrl = '';
    if (formData.photoUrl) {
      console.log('📸 Uploading photo to AWS S3...');
      
      // Add timeout to photo upload to prevent hanging
      const photoUploadPromise = uploadPhotoToS3(formData.photoUrl, userId);
      const photoTimeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Photo upload timeout - please try again')), 20000); // 20 second timeout
      });
      
      photoUrl = await Promise.race([photoUploadPromise, photoTimeoutPromise]);
      console.log('📸 Photo uploaded successfully to S3:', photoUrl);
    }

    // 2. Create donation record in Supabase
    console.log('💾 Preparing donation data...');
    const donationData = {
      store_id: formData.storeId || null,
      store_name_manual: formData.storeNameManual || null,
      white_bread_qty: formData.whiteBreadQty,
      brown_bread_qty: formData.brownBreadQty,
      photo_url: photoUrl,
      collector_id: userId,
      collected_at: new Date().toISOString(),
    };

    console.log('💾 Inserting donation data:', donationData);
    console.log('⏱️ Database insert start time:', new Date().toISOString());

    // Insert the donation record and fetch related data in one query with timeout
    const insertPromise = supabase
      .from('donations')
      .insert([donationData])
      .select(`
        *,
        store:stores(*),
        collector:profiles(*)
      `)
      .single();

    const insertTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database insert timeout - please try again')), 45000); // 45 second timeout for better reliability
    });

    const { data: donation, error: insertError } = await Promise.race([insertPromise, insertTimeoutPromise]) as { data: Donation; error: Error | null };

    console.log('⏱️ Database insert end time:', new Date().toISOString());

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      
      // If database insert fails, try offline storage as fallback
      console.log('🔄 Database insert failed - attempting offline storage as fallback');
      try {
        const offlineId = await storeOfflineDonation(
          donationData, 
          import.meta.env.VITE_AWS_API_KEY
        );
        
        console.log('✅ Donation stored offline as fallback with ID:', offlineId);
        
        // Return mock donation
        const fallbackDonation: Donation = {
          id: offlineId,
          store_id: formData.storeId || null,
          store_name_manual: formData.storeNameManual || null,
          white_bread_qty: formData.whiteBreadQty,
          brown_bread_qty: formData.brownBreadQty,
          photo_url: formData.photoUrl || '',
          collected_at: new Date().toISOString(),
          collector_id: userId,
          offline_pending: true
        };

        return fallbackDonation;
      } catch (offlineError) {
        console.error('❌ Both database and offline storage failed:', offlineError);
        throw new Error(`Failed to create donation record: ${insertError.message}`);
      }
    }

    console.log('✅ Donation inserted successfully with relations:', donation);

    // If the join query didn't work, fetch the related data separately
    let finalDonation: Donation = donation;

    // Ensure we have store data if store_id was provided
    if (formData.storeId && !donation.store) {
      try {
        console.log('🏪 Fetching store data separately for ID:', formData.storeId);
        
        // Try to fetch from database first, with fallback to stores
        let storeData = null;
        
        try {
          const result = await supabase
            .from('stores')
            .select('*')
            .eq('id', formData.storeId)
            .single();
          
          if (result.data && !result.error) {
            storeData = result.data;
            console.log('✅ Store data fetched from database:', storeData.name);
          }
        } catch {
          console.log('🔄 Database lookup failed (likely RLS), trying stores fallback...');
        }
        
        // If database lookup failed, try sparStores as fallback
        if (!storeData) {
          const { stores } = await import('../data/stores');
          const matchedStore = stores.find(s => s.id === formData.storeId);

          if (matchedStore) {
            storeData = {
              id: matchedStore.id,
              name: matchedStore.name,
              address: matchedStore.address || `${matchedStore.suburb}, ${matchedStore.city}, ${matchedStore.province}`,
              created_at: new Date().toISOString()
            };
            console.log('✅ Store data found in stores fallback:', storeData.name);
          }
        }
        
        if (storeData) {
          finalDonation = { ...finalDonation, store: storeData };
        } else {
          console.warn('⚠️ Store not found with ID:', formData.storeId);
        }
      } catch (storeError) {
        console.warn('⚠️ Could not fetch store data:', storeError);
      }
    }

    // Ensure we have collector data
    if (!donation.collector) {
      try {
        console.log('👤 Fetching collector data separately for ID:', userId);
        const { data: collectorData, error: collectorError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (collectorError) {
          console.warn('⚠️ Collector fetch error:', collectorError);
        } else if (collectorData) {
          finalDonation = { ...finalDonation, collector: collectorData };
          console.log('✅ Collector data fetched separately:', collectorData);
        }
      } catch (collectorError) {
        console.warn('⚠️ Could not fetch collector data:', collectorError);
      }
    }

    // Ensure photo URL is included
    if (photoUrl && !finalDonation.photo_url) {
      finalDonation.photo_url = photoUrl;
    }

    // Create a complete donation object for the Azure Function
    const completeEmailDonation: Record<string, unknown> = {
      id: finalDonation.id,
      store_id: finalDonation.store_id,
      store_name_manual: finalDonation.store_name_manual,
      white_bread_qty: finalDonation.white_bread_qty,
      brown_bread_qty: finalDonation.brown_bread_qty,
      photo_url: finalDonation.photo_url,
      collected_at: finalDonation.collected_at,
      collector_id: finalDonation.collector_id,
      // Ensure store and collector objects are properly included
      store: finalDonation.store ? {
        id: finalDonation.store.id,
        name: finalDonation.store.name,
        address: finalDonation.store.address
      } : null,
      collector: finalDonation.collector ? {
        id: finalDonation.collector.id,
        name: finalDonation.collector.name || 'Unknown',
        email: finalDonation.collector.email || 'No email'
      } : null
    };

    // Log the final donation object for debugging
    console.log('📦 Final donation object for email:', {
      id: completeEmailDonation.id,
      store: completeEmailDonation.store ? {
        id: (completeEmailDonation.store as { id: string; name: string }).id,
        name: (completeEmailDonation.store as { id: string; name: string }).name
      } : null,
      collector: completeEmailDonation.collector ? {
        id: (completeEmailDonation.collector as { id: string; full_name?: string; employee_id?: string }).id,
        full_name: (completeEmailDonation.collector as { id: string; full_name?: string; employee_id?: string }).full_name,
        employee_id: (completeEmailDonation.collector as { id: string; full_name?: string; employee_id?: string }).employee_id
      } : null,
      photo_url: completeEmailDonation.photo_url ? 'Present' : 'Missing',
      store_name_manual: completeEmailDonation.store_name_manual,
      white_bread_qty: completeEmailDonation.white_bread_qty,
      brown_bread_qty: completeEmailDonation.brown_bread_qty,
    });

    // 3. Trigger AWS Lambda for email notification (truly non-blocking)
    tryCallAWSLambda(completeEmailDonation).catch(error => {
      console.error('❌ AWS Lambda failed asynchronously:', error);
    });

    console.log('🎉 Donation submission completed successfully');
    console.log('⏱️ submitDonation end time:', new Date().toISOString());
    return finalDonation;
  } catch (error) {
    console.error('💥 Error submitting donation:', error);
    console.log('⏱️ submitDonation error time:', new Date().toISOString());
    throw error;
  }
};

// Note: Photo upload now handled by S3Service
// Old Supabase storage function removed - using AWS S3 instead

// Improved AWS Lambda call with better error handling and timeout
const tryCallAWSLambda = async (donation: Record<string, unknown>): Promise<void> => {
  console.log('🚀 Attempting to call AWS Lambda for donation:', donation.id);
  console.log('📧 Sending donation data to AWS Lambda:', {
    id: donation.id,
    hasStore: !!donation.store,
    storeName: (donation.store as { name?: string })?.name || donation.store_name_manual || 'Not specified',
    hasCollector: !!donation.collector,
            collectorName: (donation.collector as { full_name?: string; name?: string })?.full_name || (donation.collector as { full_name?: string; name?: string })?.name || 'Not specified',
    collectorId: (donation.collector as { employee_id?: string })?.employee_id || 'Not specified',
    hasPhotoUrl: !!donation.photo_url,
    photoUrlType: donation.photo_url && typeof donation.photo_url === 'string' ? (
      donation.photo_url.startsWith('http') ? 'URL' : 
      donation.photo_url.startsWith('data:') ? 'DataURL' : 'Unknown'
    ) : 'None'
  });

  const awsApiUrl = import.meta.env.VITE_AWS_API_URL;
  const awsApiKey = import.meta.env.VITE_AWS_API_KEY;

  // Check if AWS API is configured - if not, just return without error
  if (!awsApiUrl || !awsApiKey) {
    console.log('ℹ️ AWS Lambda not configured - skipping email notification (this is normal for development)');
    return;
  }

  try {

    console.log('🚀 Calling AWS Lambda at:', awsApiUrl);
    console.log('⏱️ AWS Lambda call start time:', new Date().toISOString());

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('AWS Lambda call timeout (10 seconds)'));
      }, 10000); // 10 second timeout
    });

    // Import ApiClient dynamically to use it with proper configuration
    const { ApiClient } = await import('./apiClient');
    const awsClient = new ApiClient(awsApiUrl);
    
    // Use the client with enhanced mobile support
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    
    // Add API key if provided
    if (awsApiKey) {
      headers['x-api-key'] = awsApiKey;
    }
    
    const callPromise = awsClient.post('/process-donation', donation, headers);

    // Race between API call and timeout
    const response = await Promise.race([callPromise, timeoutPromise]);

    if (response.success) {
      console.log('✅ AWS Lambda response:', response.data);
      console.log('⏱️ AWS Lambda call end time:', new Date().toISOString());
    } else {
      throw new Error(response.error || 'AWS Lambda call failed');
    }

  } catch (error) {
    console.error('❌ AWS Lambda call failed (non-critical):', error);
    console.log('⏱️ AWS Lambda call error time:', new Date().toISOString());
    
    // Enhanced error logging for debugging
    console.log('🔍 Debug info:', {
      awsApiUrl,
      hasKey: !!awsApiKey,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : 'No stack trace'
    });
    
    // Log specific error types for debugging
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('🌐 Network error: Unable to reach AWS Lambda. This could be due to:');
      console.error('   - CORS configuration issues');
      console.error('   - AWS Lambda not deployed or not running');
      console.error('   - Network connectivity issues');
      console.error('   - Incorrect AWS API URL or key');
    } else if (error instanceof Error && error.message.includes('timeout')) {
      console.error('⏰ Timeout error: AWS Lambda took too long to respond');
    } else if (error instanceof Error && error.message.includes('404')) {
      console.error('🔍 404 Error: AWS Lambda endpoint not found');
      console.error('   - Check if the Lambda is properly deployed');
      console.error('   - Verify the API Gateway configuration');
      console.error('   - Ensure the AWS Lambda function is running');
    } else if (error instanceof Error && error.message.includes('400')) {
      console.error('📝 400 Error: Bad Request - check data format');
      console.error('   - Donation data might be missing required fields');
      console.error('   - Check the AWS Lambda validation logic');
    } else if (error instanceof Error && error.message.includes('mobile')) {
      console.error('📱 Mobile-specific error detected');
    } else {
      console.error('❓ Unknown error type:', error);
    }
    
    // Don't throw the error - this is non-critical and shouldn't break donation submission
    console.log('📝 Donation was saved successfully despite AWS Lambda error');
  }
};

