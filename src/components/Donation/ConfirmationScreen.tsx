import React from 'react';
import { CheckCircle, FileText, Eye } from 'lucide-react';
import { Donation } from '../../types';

interface ConfirmationScreenProps {
  donation: Donation;
  onStartNew: () => void;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ donation, onStartNew }) => {
  const [showPhotoModal, setShowPhotoModal] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Johannesburg'
    });
  };

  const getStoreName = () => {
    // Check for store object first, then manual entry, then fallback
    if (donation.store?.name) {
      return donation.store.name;
    }
    if (donation.store_name_manual) {
      return donation.store_name_manual;
    }
    return 'Unknown Store';
  };

  const getCollectorName = () => {
    // Check for collector object first, then fallback
    if (donation.collector?.full_name) {
      return donation.collector.full_name;
    }
    if (donation.collector?.email) {
      return donation.collector.email;
    }
    return 'Unknown Collector';
  };

  const getCollectorId = () => {
    if (donation.collector?.employee_id) {
      return donation.collector.employee_id;
    }
    return donation.collector_id?.slice(0, 8) || 'Unknown';
  };

  const hasPhoto = () => {
    return !!(donation.photo_url && donation.photo_url.trim());
  };

  const isPhotoUrl = () => {
    return hasPhoto() && (
      donation.photo_url.startsWith('http') || 
      donation.photo_url.startsWith('https')
    );
  };

  const isDataUrl = () => {
    return hasPhoto() && donation.photo_url.startsWith('data:image/');
  };

  return (
    <div className="confirmation-container">
      <div className="space-y-4">
        {/* Digital Signature Animation */}
        <div className="text-center">
          <div className="digital-signature-seal">
            <CheckCircle size={36} className="text-white" />
          </div>
          
          <div className="space-y-2">
            <p className="text-caption text-[var(--color-semantic-success)]">Record Certified & Secured</p>
            <h1 className="text-h1">Report Submitted</h1>
            <p className="text-body-large">Your certified record has been securely logged.</p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg border border-[var(--color-border-light-gray)] p-4 text-left space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={20} className="text-[var(--color-primary-brand)]" />
            <span className="text-h2">Donation Summary</span>
          </div>

          <div className="grid-cols-2 gap-3">
            <div>
              <span className="text-label block">Store Name</span>
              <span className="text-body-default">{getStoreName()}</span>
            </div>
            <div>
              <span className="text-label block">Record ID</span>
              <span className="text-body-default font-mono text-sm">{donation.id.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-label block">White Bread</span>
              <span className="text-body-default">{donation.white_bread_qty} loaves</span>
            </div>
            <div>
              <span className="text-label block">Brown Bread</span>
              <span className="text-body-default">{donation.brown_bread_qty} loaves</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border-light-gray)]">
            <span className="text-label block mb-2">Collector Information</span>
            <div className="grid-cols-2 gap-3">
              <div>
                <span className="text-caption block">Name</span>
                <span className="text-body-default">{getCollectorName()}</span>
              </div>
              <div>
                <span className="text-caption block">Employee ID</span>
                <span className="text-body-default">{getCollectorId()}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border-light-gray)]">
            <span className="text-label block mb-2">Official Timestamp</span>
            <span className="text-body-default">{formatDate(donation.collected_at)}</span>
          </div>

          {hasPhoto() && (
            <div className="pt-3 border-t border-[var(--color-border-light-gray)]">
              <span className="text-label block mb-2">Proof Photo</span>
              <div className="relative">
                {isDataUrl() || isPhotoUrl() ? (
                  <>
                    <img
                      src={donation.photo_url}
                      alt="Donation proof"
                      className="w-full h-24 object-cover rounded border cursor-pointer"
                      onClick={() => setShowPhotoModal(true)}
                      onError={(e) => {
                        console.error('Failed to load image:', donation.photo_url);
                        // Replace with placeholder instead of hiding
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTUgMTBNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NCAyMSAzIDE2Ljk3MDYgMyAxMkMzIDcuMDI5NCA3LjAyOTQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQgMjEgMTJaIiBzdHJva2U9IiM0QjVCNjMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
                        e.currentTarget.className = 'w-full h-24 object-contain rounded border cursor-pointer bg-gray-100 p-4';
                        e.currentTarget.title = 'Photo uploaded to cloud storage';
                      }}
                    />
                    <button
                      onClick={() => setShowPhotoModal(true)}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded"
                    >
                      <Eye size={16} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded border flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Photo attached to record</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasPhoto() && (
            <div className="pt-3 border-t border-[var(--color-border-light-gray)]">
              <span className="text-label block mb-2">Proof Photo</span>
              <div className="w-full h-24 bg-gray-100 rounded border flex items-center justify-center">
                <span className="text-gray-500 text-sm">No photo provided</span>
              </div>
            </div>
          )}
        </div>

        <div className="submit-button-container pt-4 sm:pt-6 pb-0">
          <button
            onClick={onStartNew}
            className="btn-primary w-full text-button"
          >
            Start New Report
          </button>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && hasPhoto() && (isDataUrl() || isPhotoUrl()) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <img
              src={donation.photo_url}
              alt="Donation proof - Full size"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error('Failed to load full-size image:', donation.photo_url);
                // Show placeholder instead of closing modal
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA3NUgxNTBWMTI1SDUwVjc1WiIgZmlsbD0iI0Q1RDdEQSIvPgo8Y2lyY2xlIGN4PSI3NSIgY3k9IjkwIiByPSI1IiBmaWxsPSIjOTlBM0FFIi8+CjxwYXRoIGQ9Ik04MCAyMDBMMTMwIDEyNUwxNTAgMTM1TDE2MCAyMDBIODBaIiBmaWxsPSIjQkJCRkM0Ii8+CjxwYXRoIGQ9Ik0xMDAgMTYwQzEwNy4xOCAxNjAgMTEzIDEwNy4xOCAxMTMgMTAwQzExMyA5Mi44MiAxMDcuMTggODcgMTAwIDg3QzkyLjgyIDg3IDg3IDkyLjgyIDg3IDEwMEM4NyAxMDcuMTggOTIuODIgMTYwIDEwMCAxNjBaIiBmaWxsPSIjNjg3MzgwIi8+CjxwYXRoIGQ9Ik0xMDAgMTYwQzEwNy4xOCAxNjAgMTEzIDEwNy4xOCAxMTMgMTAwQzExMyA5Mi44MiAxMDcuMTggODcgMTAwIDg3QzkyLjgyIDg3IDg3IDkyLjgyIDg3IDEwMEM4NyAxMDcuMTggOTIuODIgMTYwIDEwMCAxNjBaIiBzdHJva2U9IiM0QjVCNjMiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjg3MzgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QaG90byBVcGxvYWRlZDwvdGV4dD4KPHR5cGUgeD0iMTAwIiB5PSIxNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5QTNBRSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2xvdWQgU3RvcmFnZTwvdGV4dD4KPC9zdmc+';
                e.currentTarget.className = 'max-w-lg max-h-96 object-contain bg-gray-100 rounded-lg';
              }}
            />
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-lg"
            >
              <CheckCircle size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationScreen;