import React, { useState } from 'react';
import { TrendingUp, Package, Users, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';

interface RealTimeStatsProps {
  userId?: string;
  className?: string;
}

const RealTimeStats: React.FC<RealTimeStatsProps> = ({ userId, className = '' }) => {
  const { stats, isConnected, error, refreshStats, getUserStats } = useRealTimeUpdates(userId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Visual feedback
    refreshStats();
    setIsRefreshing(false);
  };

  const formatTime = (date: Date) => {
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch {
      return 'Unknown';
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className={`text-lg sm:text-2xl font-bold ${color} truncate`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')} flex-shrink-0 ml-2`}>
          <div className="w-4 h-4 sm:w-5 sm:h-5">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* Header with Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center space-x-2 min-w-0 flex-wrap">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Daily Statistics</h2>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
            Today • SAST
          </span>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {isConnected ? (
              <Wifi size={14} className="text-green-500" />
            ) : (
              <WifiOff size={14} className="text-red-500" />
            )}
            <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'} hidden sm:inline`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 touch-target self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Donations"
          value={stats.totalDonations.toLocaleString()}
          icon={<TrendingUp size={20} />}
          color="text-blue-600"
          subtitle={`Updated ${formatTime(stats.lastUpdated)}`}
        />
        
        <StatCard
          title="Total Bread Collected"
          value={`${stats.totalBreadQty.toLocaleString()} loaves`}
          icon={<Package size={20} />}
          color="text-orange-600"
        />
        
        <StatCard
          title="Active Contributors"
          value={new Set(stats.recentDonations.map(d => d.collector_id)).size}
          icon={<Users size={20} />}
          color="text-green-600"
          subtitle="In last 10 donations"
        />
      </div>

      {/* User-Specific Stats */}
      {getUserStats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2 sm:mb-3">Your Contributions</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs text-blue-600">Your Donations</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900">{getUserStats.donations}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Bread Collected</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900">{getUserStats.breadQty} loaves</p>
            </div>
          </div>
          {getUserStats.lastDonation && (
            <p className="text-xs text-blue-600 mt-2">
              Last donation: {formatTime(new Date(getUserStats.lastDonation.created_at || getUserStats.lastDonation.collected_at || ''))}
            </p>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
            <Clock size={16} />
            <span>Recent Activity</span>
          </h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {stats.recentDonations.length === 0 ? (
            <div className="p-3 sm:p-4 text-center text-gray-500">
              <p className="text-sm">No recent donations to display</p>
            </div>
          ) : (
            stats.recentDonations.slice(0, 5).map((donation) => (
              <div key={donation.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {donation.collector?.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {donation.store?.name || donation.store_name_manual || 'Store not specified'} • 
                      {(donation.brown_bread_qty || 0) + (donation.white_bread_qty || 0)} loaves
                    </p>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {formatTime(new Date(donation.created_at || donation.collected_at || ''))}
                    </p>
                    {donation.offline_pending && (
                      <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full mt-1">
                        Syncing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeStats;
