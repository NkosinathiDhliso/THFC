// THFCScan Service Worker for Offline Support
const CACHE_NAME = 'thfcscan-v1.0.1';
const API_CACHE_NAME = 'thfcscan-api-v1.0.1';

// Core files to cache for offline use
const CORE_FILES = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/stores',
  '/api/user-profile'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  console.log('THFCScan SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('THFCScan SW: Caching core files');
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        console.log('THFCScan SW: Core files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('THFCScan SW: Cache installation failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('THFCScan SW: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('THFCScan SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('THFCScan SW: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests differently
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle navigation requests
  else if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
  }
  // Handle static resource requests
  else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests for supported schemes
    if (request.method === 'GET' && networkResponse.ok) {
      const url = new URL(request.url);
      // Only cache http and https requests to avoid unsupported scheme errors
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('THFCScan SW: Network failed, trying cache for:', url.pathname);
    
    // Fall back to cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline response for failed requests
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        offline: true,
        message: 'Please check your internet connection and try again.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fall back to cached index.html
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/');
    return cachedResponse || new Response('Offline - Please check your connection');
  }
}

// Handle static resource requests
async function handleStaticRequest(request) {
  // Only cache GET requests for static resources
  if (request.method !== 'GET') {
    try {
      return await fetch(request);
    } catch (error) {
      console.log('THFCScan SW: Failed to fetch non-GET request:', request.url);
      return new Response('Request failed', { status: 500 });
    }
  }
  
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses only for supported schemes
    if (networkResponse.ok && request.method === 'GET') {
      const url = new URL(request.url);
      // Only cache http and https requests to avoid unsupported scheme errors
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('THFCScan SW: Failed to fetch static resource:', request.url);
    return new Response('Resource unavailable offline', { status: 404 });
  }
}

// Handle background sync for offline donations
self.addEventListener('sync', (event) => {
  console.log('THFCScan SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'donation-sync') {
    event.waitUntil(syncOfflineDonations());
  }
});

// Sync offline donations when connection is restored
async function syncOfflineDonations() {
  try {
    // Get offline donations from IndexedDB
    const offlineDonations = await getOfflineDonations();
    
    if (offlineDonations.length === 0) {
      console.log('THFCScan SW: No offline donations to sync');
      return;
    }
    
    console.log(`THFCScan SW: Syncing ${offlineDonations.length} offline donations`);
    
    for (const donation of offlineDonations) {
      try {
        const response = await fetch('/api/process-donation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-functions-key': donation.functionKey || ''
          },
          body: JSON.stringify(donation.data)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineDonation(donation.id);
          console.log('THFCScan SW: Successfully synced donation:', donation.id);
        } else {
          console.error('THFCScan SW: Failed to sync donation:', donation.id, response.status);
        }
      } catch (error) {
        console.error('THFCScan SW: Error syncing donation:', donation.id, error);
      }
    }
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DONATIONS_SYNCED',
        count: offlineDonations.length
      });
    });
    
  } catch (error) {
    console.error('THFCScan SW: Sync process failed:', error);
  }
}

// Helper functions for IndexedDB operations (simplified)
async function getOfflineDonations() {
  // This would integrate with IndexedDB to get offline donations
  // For now, return empty array - will implement IndexedDB integration next
  return [];
}

async function removeOfflineDonation(donationId) {
  // This would remove the donation from IndexedDB
  console.log('Removing offline donation:', donationId);
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
