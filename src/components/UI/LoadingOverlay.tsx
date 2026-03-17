import React, { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Loading..." }) => {
  const [showTimeout, setShowTimeout] = useState(false);
  
  console.log('⏳ LoadingOverlay rendering with message:', message);
  console.log('⏱️ LoadingOverlay render time:', new Date().toISOString());
  
  useEffect(() => {
    // Show timeout message after 8 seconds
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <div className="text-body-large text-center mb-4">{message}</div>
      {showTimeout && (
        <div className="text-center">
          <div className="text-caption text-white/80 mb-2">
            Taking longer than expected...
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-caption text-white underline hover:text-white/80"
          >
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;