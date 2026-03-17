// Service Worker Registration and Management
let registrationInProgress = false;

export const registerServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported by this browser');
    return;
  }

  if (registrationInProgress) {
    console.log('Service Worker registration already in progress, skipping...');
    return;
  }

  registrationInProgress = true;

  try {
    console.log('Registering Service Worker...');
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('New Service Worker version found');
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New version available - refresh to update');
            // Optionally show update notification to user
            showUpdateNotification();
          }
        });
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Message from Service Worker:', event.data);
      
      if (event.data.type === 'DONATIONS_SYNCED') {
        console.log(`${event.data.count} donations synced successfully`);
        // Dispatch custom event for app to listen to
        window.dispatchEvent(new CustomEvent('donations-synced', {
          detail: { count: event.data.count }
        }));
      }
    });

  } catch (error) {
    console.error('Service Worker registration failed:', error);
  } finally {
    registrationInProgress = false;
  }
};

const showUpdateNotification = () => {
  // Simple update notification - could be enhanced with a proper UI component
  if (confirm('A new version is available. Would you like to update?')) {
    window.location.reload();
  }
};

export const unregisterServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('Service Worker unregistered');
      }
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
    }
  }
};
