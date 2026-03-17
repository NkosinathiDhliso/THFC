import React, { useState, useEffect, useCallback, memo } from 'react';
import { Plus, Minus, Camera, MapPin, Package, CheckCircle, XCircle } from 'lucide-react';
import { Store, DonationFormData, User } from '../../types';
import { supabase } from '../../lib/supabase';
import CameraCapture from '../Camera/CameraCapture';
import ConfirmationModal from './ConfirmationModal';
import StoreSearch from '../UI/StoreSearch';

interface DonationFormProps {
  user: User;
  onSubmit: (formData: DonationFormData, photoFile: Blob | null, store: Store | null) => Promise<void>;
  onError: (message: string) => void;
  isSubmitting: boolean;
}

const DonationForm: React.FC<DonationFormProps> = memo(({ user, onSubmit, onError, isSubmitting }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [formData, setFormData] = useState<DonationFormData>({
    whiteBreadQty: 0,
    brownBreadQty: 0,
  });

  const [showCamera, setShowCamera] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [validation, setValidation] = useState({
    store: false,
    quantities: false,
    photo: false,
  });

  const loadStores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) {
        onError('Failed to load stores');
      } else {
        setStores(data || []);
      }
    } catch {
      onError('Failed to load stores');
    }
  }, [onError]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const validateForm = useCallback(() => {
    const storeValid = !!(formData.storeId || formData.storeNameManual?.trim());
    const quantitiesValid = formData.whiteBreadQty > 0 || formData.brownBreadQty > 0;
    const photoValid = !!capturedPhoto;

    setValidation({
      store: storeValid,
      quantities: quantitiesValid,
      photo: photoValid,
    });
  }, [formData, capturedPhoto]);

  useEffect(() => {
    validateForm();
  }, [validateForm]);

  const isFormValid = useCallback(() => {
    return validation.store && validation.quantities && validation.photo;
  }, [validation]);

  const handleQuantityChange = useCallback((type: 'white' | 'brown', delta: number) => {
    const field = type === 'white' ? 'whiteBreadQty' : 'brownBreadQty';
    setFormData(prev => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta),
    }));
  }, []);

  const handleQuantityInput = useCallback((type: 'white' | 'brown', value: string) => {
    const field = type === 'white' ? 'whiteBreadQty' : 'brownBreadQty';
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: Math.max(0, numValue),
    }));
  }, []);

  const handlePhotoCapture = useCallback((photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl);
    setShowCamera(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isFormValid()) return;
    setShowConfirmation(true);
  }, [isFormValid]);

  const handleConfirmSubmit = useCallback(() => {
    const submissionData: DonationFormData = {
      ...formData,
      ...(capturedPhoto && { photoUrl: capturedPhoto }),
    };
    onSubmit(submissionData, null, null);
    setShowConfirmation(false);
  }, [formData, capturedPhoto, onSubmit]);

  const getSelectedStoreName = useCallback(() => {
    if (formData.storeNameManual) {
      return formData.storeNameManual;
    }
    if (formData.storeId) {
      const store = stores.find(s => s.id === formData.storeId);
      return store?.name || '';
    }
    return '';
  }, [formData, stores]);

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="donation-form-content scrollable-content space-y-4 sm:space-y-6 px-3 sm:px-4">
      <div className="text-center mb-4 sm:mb-6 pt-2 sm:pt-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
          New Donation Report
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Report your bread donations to help track our impact
        </p>
      </div>

      {/* Store Selection */}
      <div className="space-y-2 sm:space-y-3">
        <label className="text-sm sm:text-base font-medium text-gray-700 flex items-center gap-2">
          <MapPin size={16} className="flex-shrink-0" />
          <span>Store Location</span>
          {validation.store && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
          {formData.storeId !== undefined && !validation.store && (
            <XCircle size={16} className="text-red-600 flex-shrink-0" />
          )}
        </label>
        
        <StoreSearch
          user={user}
          value={formData.storeId || ''}
          onChange={(storeId, storeName) => {
            setFormData(prev => {
              const updated: DonationFormData = {
                ...prev,
                ...(storeId ? { storeId } : {}),
                ...(storeId ? {} : storeName ? { storeNameManual: storeName } : {})
              };
              // Remove fields that shouldn't be present
              if (storeId) {
                delete updated.storeNameManual;
              } else {
                delete updated.storeId;
              }
              return updated;
            });
          }}
          disabled={isSubmitting}
        />

        {(formData.storeId === undefined && formData.storeNameManual !== undefined) && (
          <input
            type="text"
            placeholder="Enter store name"
            value={formData.storeNameManual || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, storeNameManual: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        )}
        
        <p className="text-xs sm:text-sm text-gray-600">Select the store location or enter manually</p>
      </div>

      {/* Quantity Inputs */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Package size={16} className="flex-shrink-0" />
          <span className="text-sm sm:text-base font-medium text-gray-700">Bread Quantities</span>
          {validation.quantities && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
          {(formData.whiteBreadQty > 0 || formData.brownBreadQty > 0) && !validation.quantities && (
            <XCircle size={16} className="text-red-600 flex-shrink-0" />
          )}
        </div>



        {/* Bread Quantity Inputs - Side by Side Layout */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* White Bread Input */}
          <div className="space-y-2">
            <label className="text-sm sm:text-base font-medium text-gray-700">White Bread (loaves)</label>
            <div className="quantity-input-container">
              <button
                type="button"
                className="quantity-button"
                onClick={() => handleQuantityChange('white', -1)}
                disabled={formData.whiteBreadQty <= 0}
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                min="0"
                value={formData.whiteBreadQty || ''}
                onChange={(e) => handleQuantityInput('white', e.target.value)}
                className="flex-1 text-center px-2 py-3 border-0 bg-transparent text-lg sm:text-xl font-bold text-gray-900 focus:outline-none focus:ring-0 min-w-0"
                inputMode="numeric"
                placeholder="0"
              />
              <button
                type="button"
                className="quantity-button"
                onClick={() => handleQuantityChange('white', 1)}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Brown Bread Input */}
          <div className="space-y-2">
            <label className="text-sm sm:text-base font-medium text-gray-700">Brown Bread (loaves)</label>
            <div className="quantity-input-container">
              <button
                type="button"
                className="quantity-button"
                onClick={() => handleQuantityChange('brown', -1)}
                disabled={formData.brownBreadQty <= 0}
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                min="0"
                value={formData.brownBreadQty || ''}
                onChange={(e) => handleQuantityInput('brown', e.target.value)}
                className="flex-1 text-center px-2 py-3 border-0 bg-transparent text-lg sm:text-xl font-bold text-gray-900 focus:outline-none focus:ring-0 min-w-0"
                inputMode="numeric"
                placeholder="0"
              />
              <button
                type="button"
                className="quantity-button"
                onClick={() => handleQuantityChange('brown', 1)}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-600">Enter the total number of individual loaves</p>
      </div>

      {/* Proof of Donation */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-medium text-gray-700">Proof of Donation</h2>
          {validation.photo && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
        </div>

        <div className="relative w-full h-40 sm:h-48 md:h-56 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
          {capturedPhoto ? (
            <>
              <img
                src={capturedPhoto}
                alt="Donation proof"
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Retake Photo Button Overlay */}
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="absolute top-2 right-2 flex items-center gap-1 px-3 py-2 bg-black/70 hover:bg-black/80 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors touch-target"
              >
                <Camera size={14} />
                <span>Retake</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="h-full w-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors touch-target"
            >
              <Camera size={32} className="mb-2 opacity-50" />
              <p className="text-sm sm:text-base font-medium">Take Photo of Donation</p>
              <p className="text-xs text-gray-400 mt-1">Tap to open camera</p>
            </button>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="submit-button-container pt-4 sm:pt-6 pb-0">
                  <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="w-full px-4 py-3 sm:py-4 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors touch-target text-sm sm:text-base"
            style={{ 
              backgroundColor: isFormValid() && !isSubmitting ? '#FA5D00' : undefined
            }}
            onMouseEnter={(e) => {
              if (isFormValid() && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#e54d00';
              }
            }}
            onMouseLeave={(e) => {
              if (isFormValid() && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#FA5D00';
              }
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Certify & Submit Report'}
          </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          data={{
            storeName: getSelectedStoreName(),
            whiteBreadQty: formData.whiteBreadQty,
            brownBreadQty: formData.brownBreadQty,
            photoUrl: capturedPhoto,
          }}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirmation(false)}
        />
        )}
    </div>
  );
});

export default DonationForm;