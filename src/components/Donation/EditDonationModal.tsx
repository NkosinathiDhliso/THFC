import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Donation } from '../../types';

interface EditDonationModalProps {
  donation: Donation;
  isOpen: boolean;
  onClose: () => void;
  onSave: (donationId: string, updates: Record<string, unknown>) => Promise<void>;
  onError: (message: string) => void;
  isLoading?: boolean;
}

const EditDonationModal: React.FC<EditDonationModalProps> = ({
  donation,
  isOpen,
  onClose,
  onSave,
  onError,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    brown_bread_qty: 0,
    white_bread_qty: 0,
    store_name_manual: '',
    store_address: '',
    collected_at: '',
    notes: ''
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when donation changes
  useEffect(() => {
    if (donation) {
      const collectedDate = donation.collected_at 
        ? new Date(donation.collected_at).toISOString().slice(0, 16)
        : '';

      setFormData({
        brown_bread_qty: donation.brown_bread_qty || 0,
        white_bread_qty: donation.white_bread_qty || 0,
        store_name_manual: donation.store_name_manual || '',
        store_address: donation.store_address || '',
        collected_at: collectedDate,
        notes: donation.notes || ''
      });
      setHasChanges(false);
    }
  }, [donation]);

  // Check for changes
  useEffect(() => {
    if (!donation) return;

    const originalData = {
      brown_bread_qty: donation.brown_bread_qty || 0,
      white_bread_qty: donation.white_bread_qty || 0,
      store_name_manual: donation.store_name_manual || '',
      store_address: donation.store_address || '',
      collected_at: donation.collected_at 
        ? new Date(donation.collected_at).toISOString().slice(0, 16)
        : '',
      notes: donation.notes || ''
    };

    const hasFormChanges = Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== originalData[key as keyof typeof originalData]
    );

    setHasChanges(hasFormChanges);
  }, [formData, donation]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      onError('No changes detected');
      return;
    }

    // Validate required fields
    if (formData.brown_bread_qty < 0 || formData.white_bread_qty < 0) {
      onError('Quantities cannot be negative');
      return;
    }

    // Prepare updates object with only changed fields
    const updates: Record<string, unknown> = {};
    const originalData = {
      brown_bread_qty: donation.brown_bread_qty || 0,
      white_bread_qty: donation.white_bread_qty || 0,
      store_name_manual: donation.store_name_manual || '',
      store_address: donation.store_address || '',
      collected_at: donation.collected_at 
        ? new Date(donation.collected_at).toISOString().slice(0, 16)
        : '',
      notes: donation.notes || ''
    };

    Object.keys(formData).forEach(key => {
      const currentValue = formData[key as keyof typeof formData];
      const originalValue = originalData[key as keyof typeof originalData];
      
      if (currentValue !== originalValue) {
        if (key === 'collected_at' && currentValue) {
          updates[key] = new Date(currentValue as string).toISOString();
        } else {
          updates[key] = currentValue;
        }
      }
    });

    try {
      await onSave(donation.id, updates);
      onClose();
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    if (hasChanges && !isLoading) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen || !donation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Donation</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Donation ID and Date Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Donation ID:</strong> {donation.id}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Submitted by:</strong> {donation.user_email || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Created:</strong> {donation.created_at ? new Date(donation.created_at).toLocaleString() : 'Unknown'}
            </p>
            {donation.edited_at && (
              <p className="text-sm text-gray-600">
                <strong>Last edited:</strong> {new Date(donation.edited_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Bread Quantities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brown_bread_qty" className="block text-sm font-medium text-gray-700 mb-2">
                Brown Bread Quantity
              </label>
              <input
                type="number"
                id="brown_bread_qty"
                value={formData.brown_bread_qty}
                onChange={(e) => handleInputChange('brown_bread_qty', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="white_bread_qty" className="block text-sm font-medium text-gray-700 mb-2">
                White Bread Quantity
              </label>
              <input
                type="number"
                id="white_bread_qty"
                value={formData.white_bread_qty}
                onChange={(e) => handleInputChange('white_bread_qty', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>



          {/* Store Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="store_name_manual" className="block text-sm font-medium text-gray-700 mb-2">
                Store Name
              </label>
              <input
                type="text"
                id="store_name_manual"
                value={formData.store_name_manual}
                onChange={(e) => handleInputChange('store_name_manual', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                placeholder="Store name"
              />
            </div>

            <div>
              <label htmlFor="store_address" className="block text-sm font-medium text-gray-700 mb-2">
                Store Address
              </label>
              <input
                type="text"
                id="store_address"
                value={formData.store_address}
                onChange={(e) => handleInputChange('store_address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                placeholder="Store address"
              />
            </div>
          </div>

          {/* Collection Date */}
          <div>
            <label htmlFor="collected_at" className="block text-sm font-medium text-gray-700 mb-2">
              Collection Date & Time
            </label>
            <input
              type="datetime-local"
              id="collected_at"
              value={formData.collected_at}
              onChange={(e) => handleInputChange('collected_at', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              placeholder="Additional notes about this donation..."
            />
          </div>

          {/* Warning if no changes */}
          {!hasChanges && (
            <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-3 rounded-md">
              <AlertCircle size={16} />
              <span className="text-sm">No changes detected</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDonationModal;
