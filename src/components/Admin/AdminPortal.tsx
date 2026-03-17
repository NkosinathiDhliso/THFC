import React, { useState, useEffect } from 'react';
import { Shield, Save, AlertTriangle, RefreshCw, Download, Edit, Clock, Mail, Send } from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { adminSupabase } from '../../lib/adminSupabase';

const ADMIN_PASSWORD = 'THFCScan2024Admin';

interface AdminPortalProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ onError, onSuccess }) => {
  const {
    // Authentication state
    isAuthenticated,
    password,
    setAuthenticated,
    setPassword,
    
    // Loading states
    isLoading,
    isRefreshing,
    setLoading,
    
    // Data state
    userProfiles,
    donationStats,
    donations,
    salesQuantity,
    activeTab,
    isSalesLocked,
    showUnlockWarning,
    
    // Setters
    setSalesQuantity,
    setActiveTab,
    setSalesLocked,
    setShowUnlockWarning,
    
    // Actions
    loadUserProfiles,
    refreshUserShortCode,
    loadDonationStats,
    loadCurrentSalesData,
    loadDonations,
  } = useAdminStore();

  // Local state for daily summary trigger
  const [isTriggeringDailySummary, setIsTriggeringDailySummary] = useState(false);

  // Function to trigger daily summary
  const handleTriggerDailySummary = async () => {
    setIsTriggeringDailySummary(true);
    try {
      const awsApiUrl = import.meta.env.VITE_AWS_API_URL;
      if (!awsApiUrl) {
        throw new Error('AWS API URL not configured');
      }

      const response = await fetch(`${awsApiUrl}/trigger-daily-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        onSuccess('Daily summary email triggered successfully! Check your email in a few minutes.');
      } else {
        throw new Error(result.message || 'Failed to trigger daily summary');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to trigger daily summary';
      onError(errorMessage);
    } finally {
      setIsTriggeringDailySummary(false);
    }
  };

  // Initialize data when authenticated – ensure fresh PO amount and satisfy eslint deps
  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      await loadCurrentSalesData(); // must finish first so other stats use up-to-date PO amount
      await loadDonationStats();
      await loadUserProfiles();
      await loadDonations();
    })();
  }, [isAuthenticated, loadCurrentSalesData, loadDonationStats, loadUserProfiles, loadDonations]);

  const handleRefreshShortCode = async (userEmail: string) => {
    try {
      const newShortCode = await refreshUserShortCode(userEmail);
      if (newShortCode) {
        onSuccess(`Short code refreshed for ${userEmail}: ${newShortCode}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh short code';
      onError(errorMessage);
    }
  };

  const exportData = async () => {
    try {
      const { data: donations, error } = await adminSupabase
        .from('donations')
        .select(`
          id,
          brown_bread_qty,
          white_bread_qty,
          collected_at,
          store_name_manual,
          profiles!collector_id(email)
        `)
        .order('collected_at', { ascending: false });

      if (error) {
        console.error('Export error:', error);
        onError('Failed to export data');
        return;
      }

      if (!donations || donations.length === 0) {
        onError('No donation data to export');
        return;
      }

      // Create CSV content
      const headers = ['Date', 'Store Name', 'Brown Bread', 'White Bread', 'Total', 'Collector Email'];
      const csvContent = [
        headers.join(','),
        ...donations.map(donation => [
          donation.collected_at ? new Date(donation.collected_at).toLocaleDateString() : '',
          `"${donation.store_name_manual || 'Unknown'}"`,
          donation.brown_bread_qty,
          donation.white_bread_qty,
          donation.brown_bread_qty + donation.white_bread_qty,
          `"${(donation.profiles as { email?: string })?.email || 'Unknown'}"`
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `donations_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onSuccess('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      onError('Failed to export data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salesQuantity < 0) {
      onError('Sales amount must be a positive number');
      return;
    }

    // Check if data is locked and show warning
    if (isSalesLocked && !showUnlockWarning) {
      setShowUnlockWarning(true);
      return;
    }

    setLoading(true);

    try {
      console.log('💾 Attempting to save sales data:', salesQuantity);
      
      // Get current month/year for period creation
      const today = new Date();
      const currentMonth = today.toLocaleString('en-US', { month: 'long' });
      const currentYear = today.getFullYear();
      const periodName = `${currentMonth} ${currentYear}`;

      // Create new sales period for current month
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0] || '';
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0] || '';
      
      const insertData = {
        period_name: periodName,
        start_date: startDate,
        end_date: endDate,
        total_sales_amount: salesQuantity,
        target_deficit_percentage: 5.6,
        status: 'active' as const,
        notes: `Sales period created via admin portal`,
      };
      
      const result = await adminSupabase
        .from('sales_periods')
        .insert(insertData)
        .select()
        .single();

      if (result.error) {
        console.error('Sales update error:', result.error);
        onError('Failed to update sales data');
      } else {
        console.log('✅ Sales data saved successfully:', result.data);
        setSalesLocked(true);
        setShowUnlockWarning(false);
        
        // Sales data saved successfully

        // Re-calculate donation stats with the new PO amount
        await loadDonationStats();
        
        onSuccess(`Sales data updated successfully at ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`);
      }
    } catch (error) {
      console.error('Sales update catch error:', error);
      onError('Failed to update sales data');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      onError('Invalid admin password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--color-primary-brand)] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Shield size={28} className="text-white sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Admin Access</h1>
          <p className="text-sm sm:text-base text-gray-600">Enter admin password to continue</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="password" className="text-sm sm:text-base font-medium text-gray-700 block mb-2">
              Admin Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              placeholder="Enter admin password"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full px-4 py-3 sm:py-4 text-white font-semibold rounded-lg transition-colors touch-target text-sm sm:text-base"
            style={{ backgroundColor: '#2E8A6A' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#236B54'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E8A6A'}
          >
            Access Admin Portal
          </button>
        </form>

        {/* Back to Login Button */}
        <div className="mt-4 sm:mt-6 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:underline text-xs sm:text-sm touch-target"
          >
            ← Back to Login Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4">
      <div className="text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{ backgroundColor: '#2E8A6A' }}>
          <Shield size={28} className="text-white sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Admin Portal</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Select a tab to view sales data, donation statistics, or user management.
        </p>
        
        {/* Back to Login Button */}
        <div className="mt-3 sm:mt-4">
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:underline text-xs sm:text-sm touch-target"
          >
            ← Back to Login Form
          </button>
        </div>
      </div>

      {/* Tab Navigation - Mobile responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-5 sm:flex sm:justify-center gap-2 sm:gap-3">
        <button
          className={`px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-target ${
            activeTab === 'sales' 
              ? 'text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={{ 
            backgroundColor: activeTab === 'sales' ? '#2E8A6A' : undefined 
          }}
          onClick={() => setActiveTab('sales')}
        >
          Sales
        </button>
        <button
          className={`px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-target ${
            activeTab === 'stats' 
              ? 'text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={{ 
            backgroundColor: activeTab === 'stats' ? '#2E8A6A' : undefined 
          }}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
        <button
          className={`px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-target ${
            activeTab === 'donations' 
              ? 'text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={{ 
            backgroundColor: activeTab === 'donations' ? '#2E8A6A' : undefined 
          }}
          onClick={() => setActiveTab('donations')}
        >
          Donations
        </button>
        <button
          className={`px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-target ${
            activeTab === 'users' 
              ? 'text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={{ 
            backgroundColor: activeTab === 'users' ? '#2E8A6A' : undefined 
          }}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors touch-target ${
            activeTab === 'actions' 
              ? 'text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={{ 
            backgroundColor: activeTab === 'actions' ? '#2E8A6A' : undefined 
          }}
          onClick={() => setActiveTab('actions')}
        >
          Actions
        </button>
      </div>

      {activeTab === 'sales' && (
        <div>
          <div className="bg-[var(--color-background-off-white)] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-text-secondary-medium-gray)]">
              <Clock size={16} />
              <span className="text-caption">Sales Data</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label">Current Sales Amount:</span>
              <span className="text-body-default">R{salesQuantity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-label">Required Pickup:</span>
              <span className="text-body-default">
                R{(salesQuantity * 0.056).toFixed(2)} (5.6% of sales)
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="salesQuantity" className="text-label block mb-2">
                Total Sales Order Amount (R)
              </label>
              <input
                type="number"
                id="salesQuantity"
                value={salesQuantity || ''}
                onChange={(e) => setSalesQuantity(parseFloat(e.target.value) || 0)}
                className="input-field"
                placeholder="Enter Purchase Order amount in Rands"
                min="0"
                step="0.01"
                required
                disabled={isLoading}
              />
              <p className="text-caption mt-1">
                Required charity pickup: R{salesQuantity ? (salesQuantity * 0.056).toFixed(2) : '0.00'} (Sales × 5.6%)
                <br />
                Deficit converted to brown bread loaves (rounded up to full loaves)
              </p>
            </div>

            {isSalesLocked && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle size={16} />
                  <span className="text-sm font-medium">Sales Data Locked</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Sales data has already been set for today. Changes require confirmation.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full text-button"
            >
              <Save size={20} />
              {isLoading ? 'Updating...' : isSalesLocked ? 'Override Sales Data' : 'Update Sales Data'}
            </button>

            {showUnlockWarning && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle size={24} className="text-red-500" />
                    <h3 className="text-lg font-semibold">Override Sales Data?</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Sales data has already been set for today. 
                    Are you sure you want to override it with R{salesQuantity.toLocaleString()}?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUnlockWarning(false)}
                      className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Override Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Donation Statistics</h2>
            <button
              onClick={loadDonationStats}
              disabled={isRefreshing}
              className="btn-secondary text-sm"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {donationStats && (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white rounded-lg border p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Today's Donations</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Total donations:</span>
                    <span className="font-medium text-xs sm:text-sm">{donationStats.totalDonations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Total loaves:</span>
                    <span className="font-medium text-xs sm:text-sm">{donationStats.totalQuantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Pickup value:</span>
                    <span className="font-medium text-xs sm:text-sm">R{donationStats.totalPickupValue}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Weekly Trends</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Daily average:</span>
                    <span className="font-medium text-xs sm:text-sm">{donationStats.weeklyAverage} loaves</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Last week total:</span>
                    <span className="font-medium text-xs sm:text-sm">{donationStats.lastWeekTotal} loaves</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Purchase Order</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">PO Amount:</span>
                    <span className="font-medium text-xs sm:text-sm">R{donationStats.poAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Required pickup:</span>
                    <span className="font-medium text-xs sm:text-sm">R{donationStats.requiredPickupValue}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                  {donationStats.deficitValue > 0 ? 'Deficit Analysis' : 'Target Achieved'}
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Deficit value:</span>
                    <span className={`font-medium text-xs sm:text-sm ${donationStats.deficitValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      R{donationStats.deficitValue}
                    </span>
                  </div>
                  {donationStats.deficitValue > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-xs sm:text-sm text-gray-600">Brown bread needed:</span>
                        <span className="font-medium text-red-600 text-xs sm:text-sm">{donationStats.deficitBrownBreadLoaves} loaves</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs sm:text-sm text-gray-600">Deficit percentage:</span>
                        <span className="font-medium text-red-600 text-xs sm:text-sm">{donationStats.deficitPercentage.toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Credit Balance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Available credit:</span>
                    <span className={`font-medium text-xs sm:text-sm ${
                      donationStats.creditBalance > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      R{donationStats.creditBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-xs sm:text-sm text-gray-600">Tomorrow's credits:</span>
                    <span className="font-medium text-xs sm:text-sm text-blue-600">
                      R{donationStats.nextDayCreditBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Projection confidence: {donationStats.nextDayProjectionConfidence}
                  </div>
                  {donationStats.creditBalance > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Credit from previous over-donations
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'donations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Donations</h2>
            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="btn-secondary text-sm"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={loadDonations}
                disabled={isRefreshing}
                className="btn-secondary text-sm"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {donations.map((donation) => (
              <div key={donation.id} className="bg-white rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {donation.store?.name || donation.store_name_manual || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(donation.collected_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                    title="Edit donation"
                  >
                    <Edit size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Brown</div>
                    <div className="font-medium">{donation.brown_bread_qty}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">White</div>
                    <div className="font-medium">{donation.white_bread_qty}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="font-semibold text-gray-900">
                      {donation.brown_bread_qty + donation.white_bread_qty}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 truncate">
                  Collector: {donation.user_email}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Store
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brown Bread
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      White Bread
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collector
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(donation.collected_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {donation.store?.name || donation.store_name_manual || 'Unknown'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {donation.brown_bread_qty}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {donation.white_bread_qty}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {donation.brown_bread_qty + donation.white_bread_qty}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {donation.user_email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit donation"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">User Management</h2>
            <button
              onClick={() => loadUserProfiles()}
              disabled={isRefreshing}
              className="btn-secondary text-sm"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {userProfiles.map((user) => (
              <div key={user.id} className="bg-white rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleRefreshShortCode(user.email)}
                      disabled={isRefreshing}
                      className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 p-1"
                      title="Refresh short code"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Role</div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role || 'user'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Short Code</div>
                    <div className="text-xs font-mono text-gray-900 truncate">
                      {user.short_code || 'Not generated'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span><br/>
                    {user.short_code_created_at 
                      ? new Date(user.short_code_created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Last Used:</span><br/>
                    {user.short_code_last_used 
                      ? new Date(user.short_code_last_used).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Short Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userProfiles.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {user.short_code || 'Not generated'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.short_code_created_at 
                          ? new Date(user.short_code_created_at).toLocaleDateString()
                          : 'N/A'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.short_code_last_used 
                          ? new Date(user.short_code_last_used).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleRefreshShortCode(user.email)}
                          disabled={isRefreshing}
                          className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                          title="Refresh short code"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#2E8A6A' }}>
                <Mail size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Daily Summary Email</h2>
              <p className="text-gray-600 mb-6">
                Manually trigger the daily summary email with current donation data.
                This will send a comprehensive report to administrators.
              </p>
              
              <button
                onClick={handleTriggerDailySummary}
                disabled={isTriggeringDailySummary}
                className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#2E8A6A' }}
                onMouseEnter={(e) => !isTriggeringDailySummary && (e.currentTarget.style.backgroundColor = '#236B54')}
                onMouseLeave={(e) => !isTriggeringDailySummary && (e.currentTarget.style.backgroundColor = '#2E8A6A')}
              >
                {isTriggeringDailySummary ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send Daily Summary
                  </>
                )}
              </button>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>• Includes all donations from today</p>
                <p>• Generates photo archive (if available)</p>
                <p>• Calculates financial metrics and projections</p>
                <p>• Sends to configured admin email addresses</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;