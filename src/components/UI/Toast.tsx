import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X, AlertTriangle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`toast ${type}`}>
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle size={20} />
        ) : type === 'error' ? (
          <XCircle size={20} />
        ) : type === 'warning' ? (
          <AlertTriangle size={20} />
        ) : (
          <Info size={20} />
        )}
        <span className="text-body-default flex-1">{message}</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;