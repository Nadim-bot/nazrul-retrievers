import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Move,
  Loader2,
  Crop as CropIcon,
  Maximize2
} from 'lucide-react';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirm: (croppedBase64: string) => Promise<void> | void;
  title?: string;
  subtitle?: string;
  cropShape?: 'circle' | 'square' | 'rect';
  aspectRatio?: number; // width / height
  outputWidth?: number;
  outputHeight?: number;
  isSaving?: boolean;
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
  title = 'Adjust Profile Photo',
  subtitle = 'Drag to reposition and use the slider to zoom',
  cropShape = 'circle',
  aspectRatio = 1,
  outputWidth = 600,
  outputHeight = 600,
  isSaving = false
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset parameters when new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
      setIsProcessing(false);

      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imageRef.current = img;
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      };
    }
  }, [isOpen, imageSrc]);

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      });
    }
  };

  // Handle Drag Move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp]);

  // Handle Zoom change
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(1, Math.min(3.5, newZoom));
    setZoom(Number(clamped.toFixed(2)));
  };

  // Handle Rotate 90 deg clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to initial
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Crop & generate final image canvas
  const handleCropAndSave = async () => {
    if (!imageRef.current || !containerRef.current) return;

    try {
      setIsProcessing(true);

      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to initialize canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Container viewport dimensions (the crop box)
      const viewportSize = 280; // visual size in px

      // Draw background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // Transformation matrix mapping from viewport coordinate system to target output canvas
      const scaleToOutput = outputWidth / viewportSize;

      ctx.save();
      // Move to center of canvas
      ctx.translate(outputWidth / 2, outputHeight / 2);

      // Apply User Offset (scaled to output size)
      ctx.translate(offset.x * scaleToOutput, offset.y * scaleToOutput);

      // Apply Rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply Zoom & Initial Fit Scale
      // Determine how image fits in viewport at 1x zoom
      let baseScale = 1;
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const naturalW = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const naturalH = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      // Cover scaling so the image fully fills the crop viewport at 1x
      const scaleW = viewportSize / naturalW;
      const scaleH = viewportSize / naturalH;
      baseScale = Math.max(scaleW, scaleH);

      const finalScale = baseScale * zoom * scaleToOutput;

      // Draw image centered
      ctx.drawImage(
        img,
        -img.naturalWidth / 2 * (isRotated90or270 ? finalScale : finalScale),
        -img.naturalHeight / 2 * (isRotated90or270 ? finalScale : finalScale),
        img.naturalWidth * finalScale,
        img.naturalHeight * finalScale
      );

      ctx.restore();

      // Export as high quality JPEG
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);

      await onConfirm(croppedBase64);
    } catch (err) {
      console.error('Error rendering cropped canvas:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-lg bg-[#0F172A] border border-brand-gold/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-modal-title"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0D1B2A] to-[#152335]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center border border-brand-gold/30">
                <CropIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 id="crop-modal-title" className="text-base font-serif font-bold text-white leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-white/60">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isProcessing}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Crop Viewport Area */}
          <div className="p-6 flex flex-col items-center justify-center bg-[#090E17] select-none">
            {/* Viewport Box */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={`relative w-[280px] h-[280px] overflow-hidden bg-black/90 shadow-2xl flex items-center justify-center touch-none ${
                cropShape === 'circle' ? 'rounded-full' : 'rounded-xl'
              } ${isDragging ? 'cursor-grabbing ring-2 ring-brand-gold' : 'cursor-grab ring-2 ring-brand-gold/60'}`}
              style={{ width: '280px', height: '280px' }}
            >
              {/* Inner draggable Image */}
              {imageSrc && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px)`
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Crop preview"
                    className="max-w-none transition-transform duration-75"
                    style={{
                      transform: `rotate(${rotation}deg) scale(${zoom})`,
                      transformOrigin: 'center center',
                      minWidth: '280px',
                      minHeight: '280px',
                      objectFit: 'cover'
                    }}
                    draggable={false}
                  />
                </div>
              )}

              {/* Viewport Guideline Overlays (Facebook/Instagram Style Grid) */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-35">
                <div className="h-1/3 border-b border-white/50 w-full" />
                <div className="h-1/3 border-b border-white/50 w-full" />
              </div>
              <div className="absolute inset-0 pointer-events-none flex justify-between opacity-35">
                <div className="w-1/3 border-r border-white/50 h-full" />
                <div className="w-1/3 border-r border-white/50 h-full" />
              </div>

              {/* Move Indicator badge while hovering */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white/80 text-[10px] font-semibold px-2.5 py-0.5 rounded-full pointer-events-none flex items-center gap-1 border border-white/10">
                <Move className="w-2.5 h-2.5 text-brand-gold" />
                <span>Drag to align</span>
              </div>
            </div>

            {/* Resolution indicator */}
            {imageLoaded && (
              <div className="mt-3 text-[11px] text-white/50 font-mono flex items-center gap-2">
                <span>Original: {imageSize.width} × {imageSize.height}px</span>
                <span>•</span>
                <span className="text-brand-gold font-bold">Output: {outputWidth} × {outputHeight}px HD</span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="px-6 py-4 bg-[#0F172A] border-t border-white/10 flex flex-col gap-3.5">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.15)}
                disabled={zoom <= 1}
                className="p-1.5 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                />
                <span className="text-xs font-mono font-bold text-brand-gold w-10 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.15)}
                disabled={zoom >= 3.5}
                className="p-1.5 rounded-lg bg-white/5 text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Adjustment Tool Buttons */}
            <div className="flex items-center justify-start pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/90 hover:text-white transition-colors flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 hover:text-white transition-colors flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer / Action Buttons */}
          <div className="px-6 py-4 bg-[#0B1320] border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isProcessing}
              className="px-4 py-2.5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/10 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCropAndSave}
              disabled={isSaving || isProcessing || !imageLoaded}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-[#E5C158] text-[#0D1B2A] font-extrabold text-xs uppercase tracking-wider shadow-lg hover:shadow-brand-gold/25 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving || isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0D1B2A]" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save & Apply Photo</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
