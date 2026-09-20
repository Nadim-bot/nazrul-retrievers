import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string, caption?: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  onShowToast
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [caption, setCaption] = useState('');
  const [flashEffect, setFlashEffect] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileFallbackRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks helper
  const stopCameraStream = (activeStream?: MediaStream | null) => {
    const s = activeStream || stream;
    if (s) {
      s.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
    }
    setStream(null);
  };

  // Start camera stream
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setIsStartingCamera(true);
    setCameraError(null);
    stopCameraStream();

    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser environment.');
      }

      // Check available devices for flip button
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (e) {
        // Ignore enumerate devices error
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let errorMsg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another application.';
      }
      setCameraError(errorMsg);
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Lifecycle: open/close camera stream
  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setCaption('');
      startCamera(facingMode);
    } else {
      stopCameraStream();
      setCapturedPhoto(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  // Connect video element when stream is ready
  useEffect(() => {
    if (videoRef.current && stream && !capturedPhoto) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn('Play error:', e));
    }
  }, [stream, capturedPhoto]);

  // Take Snapshot
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Trigger visual flash
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If front camera, mirror image
      if (facingMode === 'user') {
        ctx.translate(videoWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      stopCameraStream();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  // Flip camera
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Confirm and Send
  const handleConfirmSend = () => {
    if (!capturedPhoto) return;
    onCapture(capturedPhoto, caption.trim() || undefined);
    onClose();
  };

  // Fallback file picker
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCapturedPhoto(result);
          stopCameraStream();
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Hidden Canvas & Fallback Input */}
        <canvas ref={canvasRef} className="hidden" />
        <input 
          type="file" 
          ref={fileFallbackRef} 
          accept="image/*" 
          capture="environment"
          onChange={handleFallbackFile} 
          className="hidden" 
        />

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Instant Camera</h3>
              <p className="text-[11px] text-slate-400">Capture photo &amp; send directly</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close Camera (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Preview Viewport */}
        <div className="relative flex-1 min-h-[320px] max-h-[460px] bg-black flex items-center justify-center overflow-hidden">
          {/* Flash Effect */}
          {flashEffect && (
            <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {capturedPhoto ? (
            /* Snapshot Preview */
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-2">
              <img 
                src={capturedPhoto} 
                alt="Captured Snapshot" 
                className="max-h-[380px] w-full object-contain rounded-2xl shadow-lg"
              />
              <div className="absolute top-4 left-4 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
                <Check className="w-3.5 h-3.5" /> Photo Captured
              </div>
            </div>
          ) : cameraError ? (
            /* Camera Error / Fallback State */
            <div className="p-6 text-center flex flex-col items-center max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Camera Not Accessible</h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {cameraError}
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Upload File
                </button>
              </div>
            </div>
          ) : isStartingCamera ? (
            /* Loading Camera */
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-xs font-medium">Starting camera preview...</span>
            </div>
          ) : (
            /* Live Camera Stream */
            <div className="relative w-full h-full flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Overlay Guides */}
              <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between text-white/40 text-[10px] font-mono">
                  <span>LIVE CAMERA</span>
                  <span>{facingMode === 'user' ? 'FRONT' : 'BACK'}</span>
                </div>
                <div className="text-center text-white/60 text-xs font-medium drop-shadow-md">
                  Frame your item or proof clearly
                </div>
              </div>

              {/* Flip Camera Control on top right */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-105"
                  title="Switch Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Controls / Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          {capturedPhoto ? (
            <>
              {/* Optional Caption Input */}
              <div className="relative">
                <input 
                  type="text" 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add an optional caption for this photo..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSend}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-950" /> Send Photo
                  </button>
                </div>
              </div>
            </>
          ) : !cameraError && (
            /* Shutter Capture Button */
            <div className="flex items-center justify-center py-1">
              <button
                type="button"
                onClick={handleSnapPhoto}
                className="w-16 h-16 rounded-full border-4 border-white bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/30 cursor-pointer group"
                title="Click to take photo"
              >
                <div className="w-7 h-7 rounded-full bg-slate-950 group-hover:scale-90 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
