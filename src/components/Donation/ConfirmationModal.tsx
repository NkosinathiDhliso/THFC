import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../UI/Modal';

interface ConfirmationData {
  storeName: string;
  whiteBreadQty: number;
  brownBreadQty: number;
  whiteBreadMonetaryValue?: number | undefined;
  photoUrl: string | null;
}

interface ConfirmationModalProps {
  data: ConfirmationData;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ data, onConfirm, onCancel }) => {
  return (
    <Modal onClose={onCancel}>
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-[var(--color-semantic-warning)] rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={32} className="text-white" />
        </div>

        <div>
          <h2 className="text-h2 mb-4">Confirm Your Report</h2>
          <p className="text-body-default mb-6">
            You are about to create a permanent and legally binding record for this donation. 
            Do you certify that all information and the provided photograph are accurate?
          </p>
        </div>

        {/* Summary */}
        <div className="bg-[var(--color-background-off-white)] rounded-lg p-4 text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-label">Store:</span>
            <span className="text-body-default">{data.storeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-label">White Bread:</span>
            <span className="text-body-default">{data.whiteBreadQty} loaves</span>
          </div>

          <div className="flex justify-between">
            <span className="text-label">Brown Bread:</span>
            <span className="text-body-default">{data.brownBreadQty} loaves</span>
          </div>

          {data.photoUrl && (
            <div className="space-y-2">
              <span className="text-label">Proof Photo:</span>
              <img
                src={data.photoUrl}
                alt="Donation proof"
                className="w-full h-32 object-cover rounded border"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 text-button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary flex-1 text-button"
          >
            Yes, I Certify
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;