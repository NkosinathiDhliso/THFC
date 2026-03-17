import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  console.log('📸 CameraCapture component rendering');
  console.log('⏱️ CameraCapture render time:', new Date().toISOString());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const stopCamera = useCallback(() => {
    console.log('📸 Stopping camera...');
    console.log('⏱️ Stop camera time:', new Date().toISOString());
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('📸 Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsVideoReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    console.log('📸 Starting camera...');
    console.log('⏱️ Start camera time:', new Date().toISOString());
    
    try {
      console.log('📸 Requesting media stream...');
      
      // Request camera with optimized settings to prevent flickering
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          // Additional constraints to improve stability
          aspectRatio: { ideal: 16/9 },
          resizeMode: 'crop-and-scale'
        },
        audio: false // Explicitly disable audio to reduce overhead
      });
      
      console.log('📸 Media stream obtained:', mediaStream.id);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        console.log('📸 Setting video source...');
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready before showing it
        videoRef.current.onloadedmetadata = () => {
          console.log('📸 Video metadata loaded');
          setIsVideoReady(true);
        };
        
        // Handle video errors
        videoRef.current.onerror = (e) => {
          console.error('📸 Video error:', e);
          setError('Video playback error. Please try again.');
        };
      }
    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      console.log('⏱️ Camera error time:', new Date().toISOString());
      
      let errorMessage = 'Unable to access camera. Please check permissions.';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please ensure your device has a camera.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        }
      }
      
      setError(errorMessage);
    }
  }, []);

  useEffect(() => {
    console.log('📸 CameraCapture useEffect: starting camera');
    startCamera();
    
    return () => {
      console.log('📸 CameraCapture cleanup: stopping camera');
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    console.log('📸 Capturing photo...');
    console.log('⏱️ Photo capture start time:', new Date().toISOString());
    
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      console.log('❌ Video or canvas not ready for capture');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.log('❌ Canvas context not available');
      return;
    }

    // Get actual video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    console.log('📸 Video dimensions:', { videoWidth, videoHeight });
    
    if (videoWidth === 0 || videoHeight === 0) {
      console.log('❌ Invalid video dimensions');
      setError('Camera not ready. Please wait a moment and try again.');
      return;
    }

    // Optimize canvas size for smaller file while maintaining quality
    const maxWidth = 1280;
    const maxHeight = 720;
    
    let canvasWidth = videoWidth;
    let canvasHeight = videoHeight;
    
    // Calculate optimal dimensions maintaining aspect ratio
    if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
      const aspectRatio = canvasWidth / canvasHeight;
      
      if (canvasWidth > canvasHeight) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
      } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
      }
    }

    // Set canvas dimensions to optimized size
    canvas.width = Math.round(canvasWidth);
    canvas.height = Math.round(canvasHeight);

    console.log('📸 Canvas dimensions:', { width: canvas.width, height: canvas.height });

    // Apply image smoothing for better quality
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL with optimized JPEG quality
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Log file size for debugging
    const fileSizeKB = Math.round((photoDataUrl.length * 0.75) / 1024);
    console.log(`📸 Photo captured: ${canvas.width}x${canvas.height}, ~${fileSizeKB}KB`);
    console.log('⏱️ Photo capture end time:', new Date().toISOString());
    
    setCapturedPhoto(photoDataUrl);
    setIsReviewing(true);
    stopCamera();
  }, [stopCamera, isVideoReady]);

  const retakePhoto = useCallback(() => {
    console.log('📸 Retaking photo...');
    console.log('⏱️ Retake photo time:', new Date().toISOString());
    
    setCapturedPhoto(null);
    setIsReviewing(false);
    setIsVideoReady(false);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    console.log('📸 Confirming photo...');
    console.log('⏱️ Confirm photo time:', new Date().toISOString());
    
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  }, [capturedPhoto, onCapture, onClose]);

  const getCurrentTimestamp = useCallback(() => {
    return new Date().toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Africa/Johannesburg'
    });
  }, []);

  if (error) {
    console.log('❌ Showing camera error:', error);
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center p-6 max-w-md">
          <Camera size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-body-large mb-4">{error}</p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  console.log('📸 Rendering camera interface, reviewing:', isReviewing, 'videoReady:', isVideoReady);

  return (
    <div className="fixed inset-0 bg-black z-50">
      {!isReviewing ? (
        // Camera view
        <div className="relative h-full">
          {/* Video element with improved styling to prevent flickering */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isVideoReady ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              // Additional CSS to prevent flickering
              transform: 'translateZ(0)', // Force hardware acceleration
              backfaceVisibility: 'hidden',
              perspective: '1000px'
            }}
          />
          
          {/* Loading indicator while video is starting */}
          {!isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-white text-center">
                <div className="spinner mb-4"></div>
                <p className="text-body-default">Starting camera...</p>
              </div>
            </div>
          )}
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <button
              onClick={onClose}
              className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
            >
              <X size={24} />
            </button>
            <div className="text-white text-caption bg-black/50 px-3 py-1 rounded backdrop-blur-sm">
              {getCurrentTimestamp()}
            </div>
          </div>

          {/* Camera guidelines for better framing */}
          {isVideoReady && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full border-2 border-white/20 m-8 rounded-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 border-2 border-white/50 rounded-full"></div>
              </div>
            </div>
          )}

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={capturePhoto}
              disabled={!isVideoReady}
              className={`w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                isVideoReady 
                  ? 'hover:scale-105 active:scale-95 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <Camera size={32} className="text-gray-800" />
            </button>
          </div>

          {/* Quality indicator */}
          <div className="absolute bottom-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
            📸 HD Quality
          </div>
        </div>
      ) : (
        // Photo review
        <div className="relative h-full">
          <img
            src={capturedPhoto || ''}
            alt="Captured donation"
            className="w-full h-full object-cover"
          />
          
          <div className="absolute top-4 right-4 text-white text-caption bg-black/50 px-3 py-1 rounded backdrop-blur-sm">
            {getCurrentTimestamp()}
          </div>

          {/* Photo quality info */}
          <div className="absolute top-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
            ✅ Ready for Upload
          </div>

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button
              onClick={retakePhoto}
              className="btn-secondary bg-black/50 text-white border-white hover:bg-white hover:text-black transition-colors backdrop-blur-sm"
            >
              <RotateCcw size={20} />
              Retake
            </button>
            <button
              onClick={confirmPhoto}
              className="btn-primary shadow-lg"
            >
              <Check size={20} />
              Use This Photo
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;