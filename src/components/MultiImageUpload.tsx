import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Trash2, Shield, Star, ArrowLeft, ArrowRight, UploadCloud, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageMetadata } from '../types';
import { apiFetch } from '../utils/api';
import { uploadImageToStorage } from '../utils/imageUpload';

interface MultiImageUploadProps {
  images: ImageMetadata[];
  onChange: (images: ImageMetadata[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  userId?: string;
  maxImages?: number;
}

export default function MultiImageUpload({
  images,
  onChange,
  onShowToast,
  userId = 'anonymous',
  maxImages = 5
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress and resize image using HTML5 Canvas
  const compressImage = (file: File): Promise<{ base64: string; width: number; height: number; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Target a max boundary of 1200px
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          // Calculate approx size in bytes
          const approxSize = Math.round((base64.length - 814) / 1.37);
          resolve({ base64, width, height, size: approxSize });
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Upload compressed base64 or file using centralized upload utility
  const uploadSingleImage = async (base64: string): Promise<string> => {
    return await uploadImageToStorage(base64);
  };

  // Handle selected files
  const handleFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => 
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (validFiles.length === 0) {
      onShowToast('Please select valid image formats (JPEG, PNG, WEBP).', 'error');
      return;
    }

    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      onShowToast(`You can upload a maximum of ${maxImages} images.`, 'error');
      return;
    }

    const filesToUpload = validFiles.slice(0, availableSlots);
    if (validFiles.length > availableSlots) {
      onShowToast(`Only the first ${availableSlots} files were selected to respect the ${maxImages} image limit.`, 'info');
    }

    setIsUploading(true);
    const updatedImages = [...images];

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(`Compressing and uploading image ${i + 1} of ${filesToUpload.length}...`);

        // 1. Compress
        const compressed = await compressImage(file);

        // 2. Upload
        const url = await uploadSingleImage(compressed.base64);

        // 3. Create image record
        const newImg: ImageMetadata = {
          url,
          storagePath: url.startsWith('/server-uploads/') ? url : '',
          order: updatedImages.length + 1,
          isCover: updatedImages.length === 0, // Set first image as cover automatically
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          fileSize: compressed.size,
          width: compressed.width,
          height: compressed.height
        };

        updatedImages.push(newImg);
        onChange([...updatedImages]);
      }
      onShowToast('Images uploaded and processed successfully!', 'success');
    } catch (err: any) {
      console.error('Multi-image upload error:', err);
      onShowToast(`Failed to upload images: ${err.message || err}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const onDragLeave = () => {
    setIsDraggingOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Remove selected image
  const handleRemove = (index: number) => {
    const wasCover = images[index].isCover;
    let newImages = images.filter((_, i) => i !== index);

    // If we removed the cover, make the new first image cover
    if (wasCover && newImages.length > 0) {
      newImages[0].isCover = true;
    }

    // Recalculate order index
    newImages = newImages.map((img, i) => ({
      ...img,
      order: i + 1
    }));

    onChange(newImages);
    onShowToast('Image removed from listing.', 'info');
  };

  // Set selected image as cover
  const handleSetCover = (index: number) => {
    let newImages = images.map((img, i) => ({
      ...img,
      isCover: i === index
    }));

    // Move cover image to the front of the array (order = 1)
    const coverItem = newImages[index];
    newImages = newImages.filter((_, i) => i !== index);
    newImages.unshift(coverItem);

    // Reorder indices
    newImages = newImages.map((img, i) => ({
      ...img,
      order: i + 1
    }));

    onChange(newImages);
    onShowToast('Selected image designated as Cover Image.', 'success');
  };

  // Move image order left (up)
  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    
    // Swap items
    const temp = newImages[index];
    newImages[index] = newImages[index - 1];
    newImages[index - 1] = temp;

    // Recalculate order & isCover
    const updated = newImages.map((img, i) => ({
      ...img,
      order: i + 1,
      isCover: i === 0 // Automatic cover if swapped to index 0
    }));

    onChange(updated);
  };

  // Move image order right (down)
  const handleMoveRight = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];

    // Swap items
    const temp = newImages[index];
    newImages[index] = newImages[index + 1];
    newImages[index + 1] = temp;

    // Recalculate order & isCover
    const updated = newImages.map((img, i) => ({
      ...img,
      order: i + 1,
      isCover: i === 0
    }));

    onChange(updated);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-brand-gold" />
          <span>Listing Images ({images.length}/{maxImages}) <span className="text-rose-600 dark:text-rose-400 font-extrabold">*</span></span>
        </label>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
          Min 1, Max {maxImages} images
        </span>
      </div>

      {/* Drag and Drop Zone */}
      {images.length < maxImages && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center min-h-[140px] ${
            isDraggingOver
              ? 'border-brand-gold bg-brand-gold/10 dark:bg-brand-gold/5 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 hover:border-brand-gold/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            multiple
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">{uploadProgress}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <UploadCloud className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-brand-gold group-hover:scale-105 transition-transform" />
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                Drag & Drop or <span className="text-brand-gold group-hover:underline">Browse files</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                PNG, JPG, or WEBP up to 5MB (compressed automatically)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Images List / Reordering Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-1">
          <AnimatePresence initial={false}>
            {images.map((img, idx) => (
              <motion.div
                key={img.url + idx}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className={`relative group/item aspect-square rounded-xl overflow-hidden border bg-white dark:bg-brand-surface2 flex flex-col justify-between ${
                  img.isCover 
                    ? 'border-brand-gold ring-2 ring-brand-gold/20 shadow-md sm:col-span-2 sm:row-span-2' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Image */}
                <img
                  src={img.url}
                  alt={`Listing element ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  referrerPolicy="no-referrer"
                />

                {/* Overlays / Badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/30 opacity-80 group-hover/item:opacity-100 transition-opacity z-10" />

                {/* Cover Badge */}
                {img.isCover ? (
                  <span className="absolute top-2 left-2 z-20 bg-brand-gold text-[#0F172A] text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="w-2.5 h-2.5 fill-[#0F172A]" />
                    Cover Image
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetCover(idx)}
                    className="absolute top-2 left-2 z-20 bg-black/60 text-white hover:bg-brand-gold hover:text-[#0F172A] transition-colors text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full cursor-pointer"
                  >
                    Set Cover
                  </button>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                  title="Remove Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Dimension metadata overlay in grid bottom */}
                <div className="absolute bottom-2 left-2 z-20 flex flex-col font-mono text-[9px] text-white/90 leading-normal pointer-events-none">
                  <span>Image {idx + 1} ({img.width}x{img.height})</span>
                  <span>{Math.round(img.fileSize / 1024)} KB</span>
                </div>

                {/* Reordering arrows in bottom-right corner */}
                <div className="absolute bottom-2 right-2 z-20 flex gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMoveLeft(idx)}
                      className="p-1 rounded bg-black/60 text-white hover:bg-brand-gold hover:text-[#0F172A] transition-all active:scale-90 cursor-pointer"
                      title="Move backward"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  )}
                  {idx < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMoveRight(idx)}
                      className="p-1 rounded bg-black/60 text-white hover:bg-brand-gold hover:text-[#0F172A] transition-all active:scale-90 cursor-pointer"
                      title="Move forward"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
