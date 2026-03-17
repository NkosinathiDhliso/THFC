// THFCScan Offline Storage Manager using IndexedDB
export interface OfflineDonation {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
  functionKey?: string | undefined;
  retryCount: number;
  synced: boolean;
}

export interface OfflineStatus {
  isOnline: boolean;
  pendingDonations: number;
  lastSyncTime?: number | undefined;
}

class OfflineStorageManager {
  private dbName = 'THFCScanOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create offline donations store
        if (!db.objectStoreNames.contains('offlineDonations')) {
          const donationsStore = db.createObjectStore('offlineDonations', { keyPath: 'id' });
          donationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          donationsStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create app settings store
        if (!db.objectStoreNames.contains('appSettings')) {
          db.createObjectStore('appSettings', { keyPath: 'key' });
        }

        console.log('IndexedDB schema created/updated');
      };
    });
  }

  // Store a donation for offline sync
  async storeDonation(donationData: Record<string, unknown>, functionKey?: string): Promise<string> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const donationId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineDonation: OfflineDonation = {
      id: donationId,
      data: donationData,
      timestamp: Date.now(),
      functionKey: functionKey || undefined,
      retryCount: 0,
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineDonations'], 'readwrite');
      const store = transaction.objectStore('offlineDonations');
      
      const request = store.add(offlineDonation);
      
      request.onsuccess = () => {
        console.log('Donation stored offline:', donationId);
        resolve(donationId);
      };
      
      request.onerror = () => {
        console.error('Failed to store offline donation:', request.error);
        reject(request.error);
      };
    });
  }

  // Get all pending offline donations
  async getPendingDonations(): Promise<OfflineDonation[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineDonations'], 'readonly');
      const store = transaction.objectStore('offlineDonations');
      
      // Get all donations and filter by synced status
      const request = store.getAll();
      
      request.onsuccess = () => {
        const allDonations = request.result;
        const pendingDonations = allDonations
          .filter((donation: OfflineDonation) => !donation.synced)
          .sort((a, b) => a.timestamp - b.timestamp);
        resolve(pendingDonations);
      };

      request.onerror = () => {
        reject(new Error('Failed to get pending donations'));
      };
    });
  }

  // Mark a donation as synced
  async markDonationSynced(donationId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineDonations'], 'readwrite');
      const store = transaction.objectStore('offlineDonations');
      
      const getRequest = store.get(donationId);
      
      getRequest.onsuccess = () => {
        const donation = getRequest.result;
        if (donation) {
          donation.synced = true;
          donation.syncedAt = Date.now();
          
          const updateRequest = store.put(donation);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Donation not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Remove a synced donation
  async removeDonation(donationId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineDonations'], 'readwrite');
      const store = transaction.objectStore('offlineDonations');
      
      const request = store.delete(donationId);
      
      request.onsuccess = () => {
        console.log('Offline donation removed:', donationId);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to remove offline donation:', request.error);
        reject(request.error);
      };
    });
  }

  // Clean up old synced donations
  async cleanupSyncedDonations(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineDonations'], 'readwrite');
      const store = transaction.objectStore('offlineDonations');
      const index = store.index('synced');
      
      const request = index.openCursor(IDBKeyRange.only(true));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const donation = cursor.value as OfflineDonation;
          if (donation.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get offline status
  async getOfflineStatus(): Promise<OfflineStatus> {
    try {
      // Ensure database is initialized
      if (!this.db) {
        await this.init();
      }
      
      const pendingDonations = await this.getPendingDonations();
      const lastSyncTime = await this.getLastSyncTime();
      
      return {
        isOnline: navigator.onLine,
        pendingDonations: pendingDonations.length,
        lastSyncTime: lastSyncTime || undefined
      };
    } catch (error) {
      console.warn('Failed to get offline status, using defaults:', error);
      // Return safe defaults if database fails
      return {
        isOnline: navigator.onLine,
        pendingDonations: 0,
        lastSyncTime: undefined
      };
    }
  }

  // Store app settings
  async setSetting(key: string, value: unknown): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['appSettings'], 'readwrite');
      const store = transaction.objectStore('appSettings');
      
      const request = store.put({ key, value });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get app setting
  async getSetting(key: string): Promise<unknown> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['appSettings'], 'readonly');
      const store = transaction.objectStore('appSettings');
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get last sync time
  private async getLastSyncTime(): Promise<number | undefined> {
    try {
      const lastSyncTime = await this.getSetting('lastSyncTime');
      return typeof lastSyncTime === 'number' ? lastSyncTime : undefined;
    } catch {
      return undefined;
    }
  }

  // Update last sync time
  async updateLastSyncTime(): Promise<void> {
    await this.setSetting('lastSyncTime', Date.now());
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();

// Helper functions
export const initializeOfflineStorage = () => offlineStorage.init();
export const storeOfflineDonation = (data: Record<string, unknown>, functionKey?: string) => 
  offlineStorage.storeDonation(data, functionKey);
export const getPendingOfflineDonations = () => offlineStorage.getPendingDonations();
export const getOfflineStatus = () => offlineStorage.getOfflineStatus();
export const markDonationSynced = (id: string) => offlineStorage.markDonationSynced(id);
export const removeSyncedDonation = (id: string) => offlineStorage.removeDonation(id);
