import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Heart, Image as ImageIcon, Info, MapPin, Tag, Calendar, UserCheck, Send, PhoneCall, ChevronDown, ChevronRight, Search, X, Check, Camera, RefreshCw, ShieldCheck, Lock, Gift, Award, Sparkles, Loader2 } from 'lucide-react';
import { CATEGORIES, LOCATIONS, CATEGORY_STRUCTURE } from '../data';
import { Item, ImageMetadata } from '../types';
import { apiFetch } from '../utils/api';
import MultiImageUpload from './MultiImageUpload';
import { validateItemPost } from '../utils/validation';

export interface LocationItem {
  name: string;
  subgroup?: string;
}

export interface LocationGroup {
  id: string;
  name: string;
  icon: string;
  items: LocationItem[];
}

export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'Electronics': '📱',
  'Bags & Luggage': '🎒',
  'Documents & ID Cards': '📄',
  'Keys & Access Cards': '🔑',
  'Books & Stationery': '📚',
  'Clothing & Wearables': '🧥',
  'Accessories': '⌚',
  'Academic Items': '🎓',
  'Sports Equipment': '⚽',
  'Money & Valuables': '💵',
  'Vehicles & Transport': '🚲',
  'Personal Items': '🥤',
  'Other': '📦'
};

export const LOCATION_GROUPS: LocationGroup[] = [
  {
    id: 'academic',
    name: 'Academic Buildings',
    icon: '📚',
    items: [
      { name: 'Central Library' },
      { name: 'Old Science Building' },
      { name: 'New Science Building' },
      { name: 'Science Lab' },
      { name: 'Old Administration Building' },
      { name: 'New Administration Building' },
      { name: 'Old Kola Bhaban' },
      { name: 'New Kola Bhaban' },
      { name: 'BBA Building' },
      { name: 'Social Science Building' }
    ]
  },
  {
    id: 'halls',
    name: 'Student Halls',
    icon: '🏠',
    items: [
      { name: 'Agnibina Hall', subgroup: 'Boys Halls' },
      { name: 'Bidrohi Hall', subgroup: 'Boys Halls' },
      { name: 'Shiulimala Hall', subgroup: 'Girls Halls' },
      { name: 'Dhulonchapa Hall', subgroup: 'Girls Halls' }
    ]
  },
  {
    id: 'cafeterias',
    name: 'Cafeterias & Food Courts',
    icon: '🍽',
    items: [
      { name: 'Main Canteen' },
      { name: 'TSC' },
      { name: 'Chondrobindo Café' },
      { name: 'Singhara House' },
      { name: 'Chokrobak' }
    ]
  },
  {
    id: 'facilities',
    name: 'Campus Facilities',
    icon: '🕌',
    items: [
      { name: 'Central Mosque' },
      { name: 'Medical Center' },
      { name: 'Bottola' },
      { name: 'Bethar Dhan' }
    ]
  },
  {
    id: 'landmarks',
    name: 'Campus Landmarks',
    icon: '🗿',
    items: [
      { name: 'Nazrul Bhaskorjo' },
      { name: 'Joy Bangla Bhaskorjo' }
    ]
  },
  {
    id: 'gates',
    name: 'Campus Gates',
    icon: '🚪',
    items: [
      { name: '1st Gate' },
      { name: '2nd Gate' }
    ]
  },
  {
    id: 'outdoor',
    name: 'Outdoor Areas',
    icon: '🌳',
    items: [
      { name: 'Sports Ground' },
      { name: 'Parking Area' },
      { name: 'Block A' },
      { name: 'Block B' },
      { name: 'Block C' }
    ]
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📍',
    items: [
      { name: 'Other' }
    ]
  }
];

interface PostItemPageProps {
  initialType?: 'lost' | 'found';
  onPostSubmit: (item: Partial<Item>) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentUser?: {
    fullName: string;
    department?: string;
    avatar?: string;
    role?: string;
    email?: string;
    [key: string]: any;
  } | null;
}

export default function PostItemPage({
  initialType = 'lost',
  onPostSubmit,
  onShowToast,
  currentUser
}: PostItemPageProps) {
  const [type, setType] = useState<'lost' | 'found'>(initialType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [locationCategory, setLocationCategory] = useState('');
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isTransitioningCategory, setIsTransitioningCategory] = useState(false);
  const [specificSpot, setSpecificSpot] = useState('');
  const [description, setDescription] = useState('');
  const [contactPreference, setContactPreference] = useState('Via Nazrul Retrievers Chat (recommended)');
  const [rewardOffered, setRewardOffered] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload states and references
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [isCapturedViaCamera, setIsCapturedViaCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera Capture states and references
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onShowToast('Camera access is not supported in this browser.', 'error');
        return;
      }

      setIsCameraActive(true);

      setTimeout(async () => {
        try {
          const constraints: MediaStreamConstraints = {
            video: selectedCameraId 
              ? { deviceId: { exact: selectedCameraId } } 
              : { facingMode: 'environment' }
          };

          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (firstErr: any) {
            console.warn('⚠️ Preferred camera constraints failed, trying basic video fallback:', firstErr);
            // Fallback to basic video constraint if environment/exact device fails
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
          
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
          setCameraDevices(videoInputDevices);

          if (videoInputDevices.length > 0 && !selectedCameraId) {
            setSelectedCameraId(videoInputDevices[0].deviceId);
          }
        } catch (innerErr: any) {
          console.error('Error binding camera stream:', innerErr);
          setIsCameraActive(false);
          onShowToast('Could not access device camera. Please check permissions.', 'error');
        }
      }, 100);

    } catch (err: any) {
      console.error('Error starting camera:', err);
      setIsCameraActive(false);
      onShowToast('Could not initialize camera.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const switchCamera = async () => {
    if (cameraDevices.length <= 1) return;
    
    const currentIndex = cameraDevices.findIndex(device => device.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    const nextDevice = cameraDevices[nextIndex];

    setSelectedCameraId(nextDevice.deviceId);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { deviceId: { exact: nextDevice.deviceId } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error switching camera:', err);
      onShowToast('Failed to switch camera.', 'error');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    context.drawImage(video, 0, 0, width, height);

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setIsCapturedViaCamera(true);

      const blobBin = atob(dataUrl.split(',')[1]);
      const array = [];
      for (let i = 0; i < blobBin.length; i++) {
        array.push(blobBin.charCodeAt(i));
      }
      const fileBlob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });

      onShowToast('Uploading camera capture...', 'info');
      apiFetch('/auth/upload-imgbb', {
        method: 'POST',
        bodyData: { image: dataUrl }
      }).then(res => {
        if (res && res.url) {
          const newImg: ImageMetadata = {
            url: res.url,
            storagePath: res.url.startsWith('/server-uploads/') ? res.url : '',
            order: images.length + 1,
            isCover: images.length === 0,
            uploadedBy: currentUser?.fullName || 'anonymous',
            uploadedAt: new Date().toISOString(),
            fileSize: fileBlob.size,
            width: width,
            height: height
          };
          setImages(prev => [...prev, newImg]);
          onShowToast('Camera capture added to listing images!', 'success');
        }
      }).catch(err => {
        console.error('Camera upload failed:', err);
        onShowToast('Failed to upload captured photo.', 'error');
      });

      stopCamera();
    } catch (err) {
      console.error('Failed to capture photo:', err);
      onShowToast('Failed to capture photo from video feed.', 'error');
    }
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset selected location when parent category selection changes to prevent stale data state
  useEffect(() => {
    setLocation('');
    if (locationCategory) {
      setIsLoadingLocations(true);
      const timer = setTimeout(() => {
        setIsLoadingLocations(false);
      }, 400); // 400ms loading duration for premium perceived performance
      return () => clearTimeout(timer);
    } else {
      setIsLoadingLocations(false);
    }
  }, [locationCategory]);

  const filteredGroups = LOCATION_GROUPS.filter(group => {
    if (!locationCategory) return true;
    return group.id === locationCategory || group.name === locationCategory;
  }).map(group => {
    const isGroupMatch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchingItems = group.items.filter(item => 
      isGroupMatch ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subgroup && item.subgroup.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return {
      ...group,
      items: matchingItems
    };
  }).filter(group => group.items.length > 0);

  const isGroupExpanded = (groupId: string) => {
    if (searchTerm) return true;
    if (locationCategory) return true;
    return expandedGroup === groupId;
  };

  const toggleGroup = (groupId: string) => {
    setIsTransitioningCategory(true);
    setExpandedGroup(prev => prev === groupId ? null : groupId);
    setTimeout(() => {
      setIsTransitioningCategory(false);
    }, 150);
  };

  // Flat list of visible selectable items for keyboard navigation
  const visibleItemNames = filteredGroups.flatMap(group => {
    if (isGroupExpanded(group.id)) {
      return group.items.map(item => item.name);
    }
    return [];
  });

  useEffect(() => {
    setKeyboardIndex(-1);
  }, [searchTerm, expandedGroup, locationCategory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setDropdownOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKeyboardIndex(prev => {
        const next = prev + 1;
        return next >= visibleItemNames.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKeyboardIndex(prev => {
        const next = prev - 1;
        return next < 0 ? visibleItemNames.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (keyboardIndex >= 0 && keyboardIndex < visibleItemNames.length) {
        setLocation(visibleItemNames[keyboardIndex]);
        setDropdownOpen(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateItemPost({
      title,
      location,
      category,
      subcategory,
      type,
      description,
      specificSpot
    });

    if (validationError) {
      onShowToast(validationError, 'error');
      return;
    }

    if (images.length === 0) {
      onShowToast('At least one listing image is required to submit.', 'error');
      return;
    }

    setIsSubmitting(true);

    const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'moderator' || currentUser?.role === 'coordinator' || String(currentUser?.email || '').toLowerCase().trim() === 'nazrulretrievers@gmail.com';

    const nowIso = new Date().toISOString();
    const newPost: Partial<Item> = {
      emoji: CATEGORY_EMOJI_MAP[category] || '📦',
      title,
      location,
      specificSpot,
      date: nowIso,
      createdAt: nowIso,
      type,
      category,
      subcategory,
      description,
      status: isStaff ? 'active' : 'pending',
      approvalStatus: isStaff ? 'approved' : 'pending',
      views: 1,
      images: images,
      coverImage: images[0].url,
      image: images[0].url,
      capturedViaCamera: isCapturedViaCamera,
      capturedImage: isCapturedViaCamera ? images[0].url : undefined,
      postedBy: {
        name: currentUser?.fullName || 'Anonymous User',
        department: currentUser?.department || 'General',
        verified: isStaff ? true : !!currentUser,
        initials: currentUser?.fullName
          ? currentUser.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 3)
          : 'AU'
      },
      rewardOffered: type === 'lost' && rewardOffered && rewardAmount.trim() ? rewardAmount.trim() : '',
      rewardAmount: type === 'lost' && rewardOffered && rewardAmount.trim() ? rewardAmount.trim() : undefined
    };

    try {
      await onPostSubmit(newPost);
    } catch (submitErr) {
      console.error('Error submitting post:', submitErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B111E] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Lost & Found Portal</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              Report an Item
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
              Submit verified campus lost or found belongings to notify the entire JKKNIU community.
            </p>
          </div>

          {(currentUser?.role === 'admin' || currentUser?.role === 'moderator' || currentUser?.role === 'coordinator' || String(currentUser?.email || '').toLowerCase().trim() === 'nazrulretrievers@gmail.com') && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-900 dark:text-emerald-200 shadow-xs">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>⚡ Staff Priority: Your post is published live immediately!</span>
            </div>
          )}
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          
          {/* Main Form Column */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 min-[420px]:p-6 sm:p-8 shadow-sm flex flex-col gap-6 sm:gap-7">
            
            {/* 1. Type Selection (I Lost / I Found) */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>1. Report Type</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-[#162232] border border-slate-200 dark:border-slate-700/80 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setType('lost')}
                  className={`py-3.5 px-6 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 ${
                    type === 'lost' 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 scale-[1.01]' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 stroke-[2.5px]" />
                  <span>I Lost Something</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setType('found')}
                  className={`py-3.5 px-6 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 ${
                    type === 'found' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 scale-[1.01]' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <Heart className="w-4 h-4 stroke-[2.5px]" />
                  <span>I Found Something</span>
                </button>
              </div>
            </div>

            {/* 2. Photo Upload Zone */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>2. Item Photos & Camera Capture</span>
              </h3>

              <MultiImageUpload
                images={images}
                onChange={setImages}
                onShowToast={onShowToast}
                userId={(currentUser as any)?.id || (currentUser as any)?.uid || 'anonymous'}
                maxImages={5}
              />

              {isCameraActive ? (
                <div className="relative border-2 border-amber-500 bg-black rounded-2xl overflow-hidden shadow-xl max-w-md mx-auto aspect-video sm:aspect-square flex flex-col justify-between mt-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    {cameraDevices.length > 1 ? (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="p-2 bg-black/70 hover:bg-black text-amber-400 rounded-full transition-all cursor-pointer shadow-md"
                        title="Switch Camera"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    ) : <div />}
                    
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-2 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-all cursor-pointer shadow-md"
                      title="Close Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center z-10">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-14 h-14 bg-white hover:bg-slate-100 active:scale-95 border-4 border-amber-500 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-2xl"
                      title="Capture Photo"
                    >
                      <div className="w-5 h-5 bg-amber-500 rounded-full" />
                    </button>
                  </div>
                </div>
              ) : (
                images.length < 5 && (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-2 active:scale-98"
                    >
                      <Camera className="w-4 h-4 text-amber-400" />
                      Take Photo with Device Camera
                    </button>
                  </div>
                )
              )}
            </div>

            {/* 3. Item Details */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 pb-3 border-b border-slate-200 dark:border-slate-800 mb-5 flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>3. Item Information</span>
              </h3>

              <div className="flex flex-col gap-5">
                {/* Title */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                    Item Title <span className="text-rose-600">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Black Nike Backpack with laptop compartment"
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 font-bold transition-all"
                  />
                </div>

                {/* Category, Subcategory & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                      Category <span className="text-rose-600">*</span>
                    </label>
                    <select 
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setSubcategory('');
                      }}
                      required
                      className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 cursor-pointer font-bold transition-all"
                    >
                      <option value="">Select Category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                      Subcategory <span className="text-rose-600">*</span>
                    </label>
                    <select 
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      required
                      disabled={!category}
                      className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 cursor-pointer font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Subcategory</option>
                      {category && CATEGORY_STRUCTURE.find(c => c.name === category)?.subcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                      Date {type === 'lost' ? 'Lost' : 'Found'} <span className="text-rose-600">*</span>
                    </label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 font-bold transition-all"
                    />
                  </div>
                </div>

                {/* Location & Spot */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                      Location Category
                    </label>
                    <select 
                      value={locationCategory}
                      onChange={(e) => {
                        setLocationCategory(e.target.value);
                        setLocation('');
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 cursor-pointer font-bold transition-all"
                    >
                      <option value="">All Locations</option>
                      {LOCATION_GROUPS.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative md:col-span-1" ref={dropdownRef} onKeyDown={handleKeyDown}>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                      Campus Area / Building <span className="text-rose-600">*</span>
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm outline-none focus:border-amber-500 hover:border-amber-500/60 focus:ring-4 focus:ring-amber-500/10 font-bold flex items-center justify-between text-left cursor-pointer transition-all"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className={`truncate ${location ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>
                          {location || 'Select Campus Area / Location'}
                        </span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180 text-amber-500' : ''}`} />
                    </button>

                    <input 
                      type="text" 
                      value={location} 
                      onChange={() => {}} 
                      required 
                      className="absolute opacity-0 pointer-events-none h-0 w-0" 
                    />

                    {dropdownOpen && (
                      <div className="absolute left-0 right-0 mt-2 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-[#111A2E] shadow-2xl overflow-hidden z-50 transition-all duration-200">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                          <div className="relative flex items-center bg-white dark:bg-[#162232] border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-3 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all shadow-2xs">
                            <Search className="w-4 h-4 text-amber-500 absolute left-3.5 shrink-0" />
                            <input
                              type="text"
                              placeholder="Search campus area..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-slate-950 dark:text-white text-xs py-2.5 pl-10 pr-9 font-bold placeholder-slate-400"
                              autoFocus
                            />
                            {searchTerm && (
                              <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="relative max-h-[290px] overflow-y-auto custom-scrollbar p-2.5 space-y-1.5 bg-white dark:bg-[#111A2E]">
                          {isLoadingLocations ? (
                            <div className="space-y-3 p-3">
                              <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-3.5 w-3.5 text-amber-500" />
                                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tracking-wider uppercase">Loading locations...</span>
                              </div>
                            </div>
                          ) : filteredGroups.length === 0 ? (
                            <div className="py-8 px-4 text-center">
                              <MapPin className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
                                No locations match "{searchTerm}"
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Try searching another keyword or choose "Other"
                              </p>
                            </div>
                          ) : (
                            filteredGroups.map(group => {
                              const expanded = isGroupExpanded(group.id);
                              return (
                                <div key={group.id} className="space-y-1 rounded-xl">
                                  <button
                                    type="button"
                                    onClick={() => toggleGroup(group.id)}
                                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left font-bold text-xs tracking-wide transition-all cursor-pointer border ${
                                      expanded 
                                        ? 'text-slate-950 dark:text-white bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 shadow-2xs' 
                                        : 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-amber-50/50 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                        {group.icon}
                                      </span>
                                      <span className="font-extrabold truncate text-xs">{group.name}</span>
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                        {group.items.length}
                                      </span>
                                      {!searchTerm && (
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                          expanded ? 'rotate-180 text-amber-500' : 'text-slate-400'
                                        }`} />
                                      )}
                                    </div>
                                  </button>

                                  <div 
                                    className={`pl-2 pr-1 space-y-1 transition-all duration-200 ease-in-out overflow-hidden ${
                                      expanded 
                                        ? 'max-h-[800px] opacity-100 py-1' 
                                        : 'max-h-0 opacity-0 py-0 pointer-events-none'
                                    }`}
                                  >
                                    {group.id === 'halls' ? (
                                      <div className="space-y-2 py-1">
                                        {group.items.some(i => i.subgroup === 'Boys Halls') && (
                                          <div className="space-y-1">
                                            <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                              <span>Boys Halls</span>
                                            </div>
                                            <div className="space-y-1">
                                              {group.items.filter(i => i.subgroup === 'Boys Halls').map(item => {
                                                const isSelected = location === item.name;
                                                return (
                                                  <button
                                                    key={item.name}
                                                    type="button"
                                                    onClick={() => {
                                                      setLocation(item.name);
                                                      setDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                                      isSelected
                                                        ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-xs'
                                                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                                                    }`}
                                                  >
                                                    <span className="flex items-center gap-2">
                                                      <span className={`text-[10px] ${isSelected ? 'text-slate-950' : 'text-amber-500'}`}>●</span>
                                                      <span>{item.name}</span>
                                                    </span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3px]" />}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {group.items.some(i => i.subgroup === 'Girls Halls') && (
                                          <div className="space-y-1 pt-1">
                                            <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                              <span>Girls Halls</span>
                                            </div>
                                            <div className="space-y-1">
                                              {group.items.filter(i => i.subgroup === 'Girls Halls').map(item => {
                                                const isSelected = location === item.name;
                                                return (
                                                  <button
                                                    key={item.name}
                                                    type="button"
                                                    onClick={() => {
                                                      setLocation(item.name);
                                                      setDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                                      isSelected
                                                        ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-xs'
                                                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                                                    }`}
                                                  >
                                                    <span className="flex items-center gap-2">
                                                      <span className={`text-[10px] ${isSelected ? 'text-slate-950' : 'text-rose-500'}`}>●</span>
                                                      <span>{item.name}</span>
                                                    </span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3px]" />}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        {group.items.map(item => {
                                          const isSelected = location === item.name;
                                          return (
                                            <button
                                              key={item.name}
                                              type="button"
                                              onClick={() => {
                                                setLocation(item.name);
                                                setDropdownOpen(false);
                                              }}
                                              className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                                isSelected
                                                  ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-xs'
                                                  : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                                              }`}
                                            >
                                              <span className="flex items-center gap-2">
                                                <span className={`text-[10px] ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>•</span>
                                                <span>{item.name}</span>
                                              </span>
                                              {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3px]" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                      Specific Spot (optional)
                    </label>
                    <input 
                      type="text" 
                      value={specificSpot}
                      onChange={(e) => setSpecificSpot(e.target.value)}
                      placeholder="e.g. Near 2nd floor study table"
                      className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 font-bold transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                    Public Description <span className="text-rose-600">*</span>
                  </label>
                  <textarea 
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe color, brand, stickers, cover, or general identifiers to assist identification."
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 font-bold resize-y transition-all"
                  />
                </div>

                {/* Optional Reward Offered Section for Lost items */}
                {type === 'lost' && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          <Gift className="w-5 h-5 stroke-[2.2px]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm sm:text-base font-black text-slate-950 dark:text-white">
                              Offer Reward / Appreciation Token?
                            </h4>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              Optional
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mt-1 leading-relaxed max-w-xl">
                            Pledge an appreciation token (cash reward, cafeteria treat, or gift) to motivate finders.
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1" title="Toggle reward option">
                        <input 
                          type="checkbox" 
                          checked={rewardOffered}
                          onChange={(e) => {
                            setRewardOffered(e.target.checked);
                            if (!e.target.checked) setRewardAmount('');
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                      </label>
                    </div>

                    {rewardOffered && (
                      <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/60 space-y-3 animate-in fade-in duration-150">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                            Reward Amount or Appreciation Note
                          </label>
                          <input 
                            type="text" 
                            value={rewardAmount}
                            onChange={(e) => setRewardAmount(e.target.value)}
                            placeholder="e.g. Tk. 500 cash reward, Treat at Chondrobindo Café"
                            className="w-full px-4 py-3 bg-white dark:bg-[#162232] border-2 border-amber-400 dark:border-amber-600 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 font-bold shadow-xs transition-all"
                          />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">Quick ideas:</span>
                          {['Tk. 200 Reward', 'Tk. 500 Cash Reward', 'Tk. 1000 Reward', 'Treat at TSC Canteen', 'Token of Gratitude'].map(chip => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setRewardAmount(chip)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                rewardAmount === chip
                                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                  : 'bg-white dark:bg-slate-800 hover:bg-amber-100 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact preference */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                    Contact Preference
                  </label>
                  <select 
                    value={contactPreference}
                    onChange={(e) => setContactPreference(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 cursor-pointer font-bold transition-all"
                  >
                    <option>Via Nazrul Retrievers Chat (recommended)</option>
                    <option>Phone Call Directly</option>
                    <option>WhatsApp Messaging</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => onShowToast('Draft post saved successfully!', 'success')}
                className="w-full sm:w-auto px-5 py-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Post...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{currentUser?.role === 'admin' || currentUser?.role === 'moderator' ? 'Publish Live (Auto-Approved)' : 'Submit Report'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Sidebar: Guidelines & Fast Recovery Tips */}
          <div className="space-y-5 lg:sticky lg:top-24">
            
            {/* Live Preview Card */}
            <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Feed Preview</span>
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                  type === 'lost' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                }`}>
                  {type === 'lost' ? 'Lost Item' : 'Found Item'}
                </span>
              </div>

              {/* Simulated Card that mirrors public feed card */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#162232] border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs space-y-3 p-3.5">
                {/* Image Cover Preview */}
                <div className="relative w-full h-36 bg-slate-200/80 dark:bg-[#0B111E] rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700/60">
                  {images && images.length > 0 && images[0]?.url ? (
                    <>
                      <img 
                        src={images[0].url} 
                        alt={title || 'Item preview'} 
                        className="w-full h-full object-cover" 
                      />
                      {images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          <span>{images.length} photos</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-3 text-slate-400 dark:text-slate-500">
                      <span className="text-3xl mb-1">{CATEGORY_EMOJI_MAP[category] || '📦'}</span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Cover photo preview</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">Upload photos to display here</span>
                    </div>
                  )}

                  {/* Category Pill Overlaid */}
                  <div className="absolute top-2 left-2 bg-white/90 dark:bg-[#111A2E]/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-900 dark:text-white flex items-center gap-1.5 shadow-2xs">
                    <span>{CATEGORY_EMOJI_MAP[category] || '📦'}</span>
                    <span className="truncate max-w-[130px]">{category || 'General Item'}</span>
                  </div>
                </div>

                {/* Card details */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-black text-slate-950 dark:text-white line-clamp-1 leading-snug">
                      {title ? title : <span className="text-slate-400 dark:text-slate-500 italic font-normal">Item title will appear here...</span>}
                    </h5>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {location ? location : 'Campus Location'}
                      </span>
                      {specificSpot && (
                        <span className="text-slate-400 dark:text-slate-500 truncate">({specificSpot})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>{date ? date : 'Reported Today'}</span>
                    </div>
                  </div>

                  {/* Reward badge if active */}
                  {type === 'lost' && rewardOffered && rewardAmount && (
                    <div className="text-[11px] font-black text-amber-950 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 animate-in fade-in">
                      <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="truncate">Reward: {rewardAmount}</span>
                    </div>
                  )}

                  {/* Poster details */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                      By: {currentUser?.fullName || 'Verified Student'}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Public Listing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Guidelines Card */}
            <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Fast Recovery Tips</span>
              </h4>

              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                  <span><strong>Clear Images:</strong> Upload well-lit photos showing unique identifiers, brand logos, or stickers.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                  <span><strong>Accurate Spot:</strong> Specify floor number, classroom desk, cafeteria table, or building entrance.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                  <span><strong>Safe Handover:</strong> Hand over valuable items in public campus spaces (Library, TSC, Proctor Office).</span>
                </div>
              </div>
            </div>

            {/* Campus Helpline & Official Office Notice */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🏛️</span>
                <span className="font-black text-amber-950 dark:text-amber-200">
                  Need Physical Assistance?
                </span>
              </div>
              <p className="text-[11px] text-amber-900 dark:text-amber-300 font-medium leading-relaxed">
                You can deposit high-value found items (wallets, phones, certificates) directly at the JKKNIU Proctorial Office (Admin Building, Ground Floor).
              </p>
              <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-amber-950 dark:text-amber-200">
                <span>Helpline:</span>
                <a href="tel:01410073315" className="underline hover:text-amber-700 dark:hover:text-amber-100 transition-colors">01410073315</a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
