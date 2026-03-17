import React, { useState, useEffect } from 'react';
import { WifiOff, Upload, Clock, CheckCircle } from 'lucide-react';
import { getOfflineStatus, type OfflineStatus } from '../../lib/offlineStorage';

interface OfflineStatusBarProps {
  onSyncClick?: () => void;
}

const OfflineStatusBar: React.FC<OfflineStatusBarProps> = ({ onSyncClick }) => {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    pendingDonations: 0
  });
  const [isVisible, setIsVisible] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');

  useEffect(() => {
    // Update status
    const updateStatus = async () => {
      try {
        const offlineStatus = await getOfflineStatus();
        setStatus(offlineStatus);
        
        // Format last sync time
        if (offlineStatus.lastSyncTime) {
          const syncTime = new Date(offlineStatus.lastSyncTime);
          setLastSync(syncTime.toLocaleTimeString());
        }
        
        // Show bar if offline or have pending donations
        setIsVisible(!offlineStatus.isOnline || offlineStatus.pendingDonations > 0);
      } catch (error) {
        console.error('Failed to get offline status:', error);
      }
    };

    // Initial check
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      updateStatus();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic status update
    const interval = setInterval(updateStatus, 10000); // Every 10 seconds

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'DONATIONS_SYNCED') {
        updateStatus();
        // Show success notification briefly
        setTimeout(updateStatus, 2000);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const getStatusColor = () => {
    if (!status.isOnline) return 'bg-red-500';
    if (status.pendingDonations > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!status.isOnline) {
      return `Offline${status.pendingDonations > 0 ? ` - ${status.pendingDonations} pending` : ''}`;
    }
    if (status.pendingDonations > 0) {
      return `${status.pendingDonations} donation${status.pendingDonations > 1 ? 's' : ''} pending sync`;
    }
    return 'Online - All donations synced';
  };

  const getStatusIcon = () => {
    if (!status.isOnline) return <WifiOff size={16} className="text-white" />;
    if (status.pendingDonations > 0) return <Upload size={16} className="text-white" />;
    return <CheckCircle size={16} className="text-white" />;
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${getStatusColor()} text-white px-4 py-2 shadow-md`}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {lastSync && (
            <div className="flex items-center space-x-1">
              <Clock size={12} />
              <span className="text-xs opacity-90">Last sync: {lastSync}</span>
            </div>
          )}
          
          {status.pendingDonations > 0 && status.isOnline && onSyncClick && (
            <button
              onClick={onSyncClick}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded text-xs font-medium transition-colors"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStatusBar;
