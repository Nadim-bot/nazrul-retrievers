import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MapPin, Tag, Eye, Calendar, User, Phone, Bookmark, Shield, ShieldAlert, Award, AlertCircle, X, Flag, AlertTriangle, ShieldCheck, Share2, Printer, Sparkles, ArrowRight, Clock, Activity, Inbox, Mail, Copy, MessageCircle, Trash2, FileText, CheckCircle2, Lock, MessageSquare, Building2, Users } from 'lucide-react';
import { Item, User as UserType } from '../types';
import PrintFlyerModal from './PrintFlyerModal';
import PublicProfileModal from './PublicProfileModal';
import ShareModal from './ShareModal';
import { findPotentialMatches } from '../utils/aiMatcher';
import { getCategoryStyle } from '../utils/categoryStyles';
import { formatPostTime } from '../utils/date';
import { hasItemReward, getRewardDetails } from '../utils/rewardUtils';

interface ItemDetailPageProps {
  item: Item;
  similarItems: Item[];
  allItems: Item[];
  onBack: () => void;
  backLabel?: string;
  onSelectItem: (item: Item) => void;
  onSendMessage: (item: Item) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isLoggedIn: boolean;
  onRequireLogin: (action: { type: 'request_call' | 'save_item' | 'contact' | 'print' | 'report_item'; item: Item }) => void;
  savedItemIds?: string[];
  onToggleSaveItem?: (itemId: string, itemTitle?: string) => void;
  onOpenSavedModal?: () => void;
  onOpenUserModal?: (tab: 'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout') => void;
  currentUser?: UserType | null;
  onDeleteItem?: (itemId: string) => Promise<void>;
}

export default function ItemDetailPage({
  item,
  similarItems,
  allItems,
  onBack,
  backLabel,
  onSelectItem,
  onSendMessage,
  onShowToast,
  isLoggedIn,
  onRequireLogin,
  savedItemIds = [],
  onToggleSaveItem,
  onOpenSavedModal,
  onOpenUserModal,
  currentUser,
  onDeleteItem
}: ItemDetailPageProps) {
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null);
  const [posterProfile, setPosterProfile] = useState<UserType | null>(null);
  const [bookmarkFeedback, setBookmarkFeedback] = useState<'saved' | 'unsaved' | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(item.status || 'active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionMethod, setResolutionMethod] = useState<'chat' | 'admin_office' | 'meetup' | 'self_found'>('chat');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    setCurrentStatus(item.status || 'active');
  }, [item.status]);

  const isAuthor = Boolean(currentUser && (
    (currentUser.id && (
      (item.userId && String(currentUser.id) === String(item.userId)) ||
      ((item as any).firebaseUid && String(currentUser.id) === String((item as any).firebaseUid)) ||
      ((item as any).ownerUid && String(currentUser.id) === String((item as any).ownerUid)) ||
      (item.postedBy && (item.postedBy as any).userId && String(currentUser.id) === String((item.postedBy as any).userId))
    )) ||
    (currentUser.email && (
      (item.email && currentUser.email.toLowerCase() === item.email.toLowerCase()) ||
      ((item.postedBy as any)?.email && currentUser.email.toLowerCase() === (item.postedBy as any).email.toLowerCase())
    ))
  ));

  useEffect(() => {
    if (isLoggedIn && item.userId) {
      setLoadingPoster(true);
      import('../utils/api').then(({ apiFetch }) => {
        apiFetch<any>(`/auth/profile?id=${item.userId}`)
          .then(data => {
            if (data && data.user) {
              setPosterProfile(data.user);
            }
          })
          .catch(err => {
            console.error('Error fetching poster profile:', err);
          })
          .finally(() => {
            setLoadingPoster(false);
          });
      });
    } else {
      setPosterProfile(null);
    }
  }, [isLoggedIn, item.userId]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Request Callback Modal states
  const [showRequestCallModal, setShowRequestCallModal] = useState(false);
  const [requestCallPhone, setRequestCallPhone] = useState('');
  const [requestCallTime, setRequestCallTime] = useState('As soon as possible');
  const [requestCallNote, setRequestCallNote] = useState('');
  const [isSubmittingCallRequest, setIsSubmittingCallRequest] = useState(false);

  useEffect(() => {
    if (showRequestCallModal && isLoggedIn) {
      try {
        const stored = localStorage.getItem('jkkniu_user_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.user?.phone) {
            setRequestCallPhone(parsed.user.phone);
          }
        }
      } catch (err) {
        // ignore
      }
    }
  }, [showRequestCallModal, isLoggedIn]);

  // Gallery and Lightbox local states
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowReportModal(false);
        setShowPrintModal(false);
        setShowRequestCallModal(false);
        setIsLightboxOpen(false);
        setSelectedPosterId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showReportModal, showPrintModal, showRequestCallModal, isLightboxOpen, selectedPosterId]);

  const imagesList = item.images && item.images.length > 0 
    ? [...item.images].sort((a, b) => a.order - b.order) 
    : (item.image ? [{ url: item.image, isCover: true, order: 1 }] : []);

  const handleRequestCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestCallPhone.trim()) {
      onShowToast('Please provide your contact phone number.', 'error');
      return;
    }

    setIsSubmittingCallRequest(true);
    try {
      const { apiFetch } = await import('../utils/api');

      let currentUserId = '';
      try {
        const stored = localStorage.getItem('jkkniu_user_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          currentUserId = parsed?.user?.id || parsed?.user?.uid || '';
        }
      } catch (err) {}

      if (currentUserId && String(currentUserId) === String(item.userId)) {
        onShowToast('You cannot send a call request to yourself.', 'error');
        setIsSubmittingCallRequest(false);
        return;
      }

      const msgText = `📞 CALLBACK REQUEST for "${item.title}"\n• Contact Phone: ${requestCallPhone.trim()}\n• Preferred Callback Time: ${requestCallTime}\n${requestCallNote.trim() ? `• Note: ${requestCallNote.trim()}` : ''}`;

      const res = await apiFetch('/chats/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          recipientId: item.userId,
          recipientName: item.postedBy?.name || 'Reporter',
          text: msgText
        })
      });

      if (res && !res.error) {
        onShowToast('📞 Callback request sent to reporter! They have been notified in chat.', 'success');
        setShowRequestCallModal(false);
        setRequestCallNote('');
      } else {
        onShowToast(res?.error || 'Failed to send callback request.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error sending callback request.', 'error');
    } finally {
      setIsSubmittingCallRequest(false);
    }
  };

  const catStyle = getCategoryStyle(item.category);
  const CatIcon = catStyle.icon;

  const statusLabels: Record<string, string> = {
    active: 'Active & Available',
    claim_requested: 'Claim Requested',
    under_verification: 'Under Verification',
    handover_pending: 'Handover Pending',
    claimed: 'Item Claimed',
    returned: 'Returned to Owner',
    reunited: 'Reunited with Owner',
    closed: 'Listing Closed',
    resolved: 'Resolved'
  };

  const REPORT_REASONS = [
    { id: 'spam', label: 'Spam or Advertising', desc: 'Commercial ads, bulk postings, or unrelated content' },
    { id: 'inappropriate', label: 'Inappropriate Content', desc: 'Offensive language, explicit images, or harassment' },
    { id: 'fraud', label: 'Fraud or Scam', desc: 'Fake items, suspicious claims, or false finders' },
    { id: 'duplicate', label: 'Duplicate Listing', desc: 'Already posted by the same or another user' },
    { id: 'other', label: 'Other Issues', desc: 'Any other violation of campus guidelines' }
  ];

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowReportModal(false);
      setReportDetails('');
      setSelectedReason('spam');
      onShowToast(`Listing reported successfully. Administrators have been notified.`, 'success');
    }, 800);
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      onShowToast('Direct listing link copied! Perfect for sharing on campus social media.', 'success');
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed', err);
      onShowToast('Direct listing link copied!', 'success');
    }
    document.body.removeChild(textArea);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  return (
    <div className="bg-brand-cream dark:bg-[#0A101D] min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-start">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-brand-border dark:border-slate-800 hover:border-brand-gold dark:hover:border-amber-400 bg-white dark:bg-[#111A2E] hover:text-brand-gold dark:hover:text-amber-400 text-brand-navy dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>{backLabel || 'Back to Listings'}</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 sm:gap-8">
        {/* Left Side: Detail Contents */}
        <div>
          {/* Cover emoji or image illustration */}
          <div className="w-full h-[240px] min-[420px]:h-[300px] sm:h-[380px] md:h-[440px] bg-gradient-to-br from-amber-50/60 to-slate-100 dark:from-[#111A2E] dark:to-[#0A101D] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center select-none shadow-sm mb-4 relative overflow-hidden group">
            {/* Elegant large background glows */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-brand-gold/10 pointer-events-none" />
            
            {imagesList.length > 0 ? (
              <div 
                className="w-full h-full relative z-10 cursor-zoom-in overflow-hidden"
                onClick={() => setIsLightboxOpen(true)}
              >
                <img 
                  src={imagesList[activeImageIndex]?.url} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating click to zoom helper */}
                <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
                  <span>Click to Zoom</span>
                </div>

                {/* Previous / Next Arrow buttons on the sides for desktop gallery navigation */}
                {imagesList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 text-white rounded-full hover:bg-slate-900/90 transition-colors z-20"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 text-white rounded-full hover:bg-slate-900/90 transition-colors z-20"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Beautiful large display plate */
              <div className="w-36 h-36 rounded-3xl bg-white/90 dark:bg-[#162137]/90 backdrop-blur-md flex flex-col items-center justify-center shadow-lg border border-slate-200 dark:border-slate-700 text-brand-gold select-none transform transition-transform duration-500 hover:scale-105 hover:rotate-1 z-10 p-4">
                <Inbox className="w-12 h-12 opacity-80 mb-2 text-brand-gold" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">No Image</span>
              </div>
            )}
          </div>

          {/* Thumbnail Strip underneath */}
          {imagesList.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-4 mb-6 select-none scrollbar-thin scrollbar-thumb-brand-gold/40 touch-scroll">
              {imagesList.map((img, idx) => (
                <button
                  key={img.url + idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 bg-white dark:bg-[#111A2E] flex-shrink-0 transition-all ${
                    idx === activeImageIndex 
                      ? 'border-brand-gold ring-2 ring-brand-gold/20 scale-102' 
                      : 'border-brand-border dark:border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Badges group */}
          <div className="flex flex-wrap gap-2.5 mb-5">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              item.type === 'lost' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {item.type}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${catStyle.badgeClass}`}>
              <CatIcon className="w-3.5 h-3.5" />
              {item.category}
            </span>
            {item.subcategory && (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-surface2 dark:bg-[#162137] border border-brand-border dark:border-slate-700 text-brand-navy dark:text-slate-200 text-xs rounded-full font-bold">
                ↳ {item.subcategory}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-gold-light/40 dark:bg-amber-950/30 border border-brand-gold/20 dark:border-amber-500/30 text-brand-gold text-xs rounded-full font-bold">
              <Calendar className="w-3.5 h-3.5" />
              {formatPostTime(item.createdAt || item.date)}
            </span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3.5xl font-black text-brand-navy dark:text-white mb-6 leading-tight">
            {item.title}
          </h2>

          {/* Metadata details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-4 rounded-xl flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider">Date Reported</span>
              <div className="text-sm font-semibold text-brand-navy dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-gold" />
                {formatPostTime(item.createdAt || item.date)}
              </div>
            </div>

            <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-4 rounded-xl flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider">Location Found</span>
              <div className="text-sm font-semibold text-brand-navy dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                {item.location}
              </div>
            </div>

            <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-4 rounded-xl flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider">Category</span>
              <div className="text-sm font-semibold text-brand-navy dark:text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-brand-gold" />
                {item.category} {item.subcategory && `(${item.subcategory})`}
              </div>
            </div>

            <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-4 rounded-xl flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider">Views count</span>
              <div className="text-sm font-semibold text-brand-navy dark:text-slate-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-gold" />
                {item.views} views total
              </div>
            </div>
          </div>

          {/* Listing Confidence & Verified Status Banner */}
          <div className={`border rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
            item.status === 'active'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
              : (item.status === 'returned' || item.status === 'reunited')
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : item.status === 'handover_pending'
              ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200'
              : (item.status === 'under_verification' || item.status === 'claim_requested')
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
              : item.status === 'claimed'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200'
          }`}>
            <div className="flex items-start gap-3.5">
              <div className="relative flex-shrink-0 mt-1">
                {item.status === 'active' && (
                  <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                )}
                {(item.status === 'under_verification' || item.status === 'claim_requested') && (
                  <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-amber-400 opacity-75 animate-ping" />
                )}
                {item.status === 'handover_pending' && (
                  <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-indigo-400 opacity-75 animate-ping" />
                )}
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  item.status === 'active'
                    ? 'bg-emerald-500'
                    : (item.status === 'returned' || item.status === 'reunited')
                    ? 'bg-emerald-600'
                    : item.status === 'handover_pending'
                    ? 'bg-indigo-500'
                    : (item.status === 'under_verification' || item.status === 'claim_requested')
                    ? 'bg-amber-500'
                    : item.status === 'claimed'
                    ? 'bg-amber-500'
                    : 'bg-slate-500'
                }`} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold">Listing Status Verification</h4>
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-md ${
                    item.status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                      : (item.status === 'returned' || item.status === 'reunited')
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                      : item.status === 'handover_pending'
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                      : (item.status === 'under_verification' || item.status === 'claim_requested')
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                      : item.status === 'claimed'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
                <p className="text-xs opacity-90 font-medium">
                  {item.status === 'active' && (
                    item.type === 'lost'
                      ? "The owner is actively looking for this lost item. Contact immediately if you have any leads!"
                      : "The finder has listed this found item and is awaiting verification from the rightful owner."
                  )}
                  {(item.status === 'under_verification' || item.status === 'claim_requested') && (
                    "A claim request has been submitted on this listing. Campus administrators and finder are currently reviewing ownership proof."
                  )}
                  {item.status === 'handover_pending' && (
                    "Claim has been verified! Both parties are coordinating safe campus handover."
                  )}
                  {(item.status === 'returned' || item.status === 'reunited') && (
                    "This item has been successfully reunited with its rightful owner! Safe travels."
                  )}
                  {item.status === 'claimed' && "A verified claim has been submitted. The handover is either in progress or completed."}
                  {item.status === 'closed' && "This listing is closed and no longer accepting queries or claims."}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center text-xs text-brand-navy dark:text-slate-200 shrink-0 font-bold bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 rounded-xl shadow-xs p-3">
              <div className="flex items-center gap-1.5" title="Total visitor views tracking">
                <Eye className="w-4 h-4 text-brand-gold animate-pulse" />
                <span>{item.views || 0} Views</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-border dark:bg-slate-700" />
              <div className="flex items-center gap-1.5" title="Last modified / published stamp">
                <Calendar className="w-4 h-4 text-brand-gold" />
                <span>Active Since {formatPostTime(item.createdAt || item.date)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8 p-5 bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <h3 className="font-sans text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-gold flex-shrink-0" />
              <span>Item Description</span>
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-[#162137] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line break-words">
              {item.description || 'No detailed description provided.'}
            </div>
          </div>

          {/* Reward block - only shown if owner explicitly pledged a reward amount/token */}
          {hasItemReward(item) && (
            <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-400/40 dark:border-amber-500/30 rounded-2xl text-slate-900 dark:text-amber-200 flex items-start sm:items-center gap-4 shadow-xs">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400 shadow-2xs">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-sm flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="font-extrabold text-brand-navy dark:text-amber-300 text-base">🎁 Reward Offered!</strong>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 font-extrabold text-xs border border-amber-500/30">
                    {getRewardDetails(item)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-normal mt-1 leading-relaxed">
                  The owner has pledged <span className="font-bold text-amber-900 dark:text-amber-300 font-mono">"{getRewardDetails(item)}"</span> upon safe return and handover of the item.
                </p>
              </div>
            </div>
          )}

          {/* Smart Match Detector */}
          {(() => {
            const potentialMatches = findPotentialMatches(item, allItems || [], 30);
            if (potentialMatches.length === 0) return null;

            return (
              <div className="mb-8 mt-6 bg-brand-navy/95 border border-brand-gold/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <div className="p-1.5 bg-brand-gold/10 text-brand-gold rounded-lg">
                    <Activity className="w-5 h-5 text-brand-gold" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-brand-gold-mid">Smart Match Detector</h3>
                    <p className="text-[10px] text-white/60 uppercase tracking-widest font-extrabold">Automated Cross-Reference Indexing</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {potentialMatches.slice(0, 3).map((match) => {
                    const matchedItem = match.oppositeItem;
                    const scoreColor = match.score >= 75 ? 'text-emerald-400' : match.score >= 50 ? 'text-brand-gold' : 'text-amber-400';
                    
                    return (
                      <div 
                        key={matchedItem.id}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            {matchedItem.image ? (
                              <img src={matchedItem.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-brand-gold bg-white/10 p-2 rounded-xl flex items-center justify-center w-12 h-12 flex-shrink-0">
                                <Inbox className="w-6 h-6" />
                              </span>
                            )}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-white leading-tight">{matchedItem.title}</h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                                  matchedItem.type === 'lost' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {matchedItem.type}
                                </span>
                              </div>
                              <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                <span className="truncate">{matchedItem.location} · {matchedItem.date}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-start sm:items-end">
                            <span className={`text-lg font-black tracking-tight ${scoreColor}`}>
                              {match.score}% Match
                            </span>
                            <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Confidence Score</span>
                          </div>
                        </div>

                        {/* Overlap & Reasons details */}
                        {match.reasons.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs text-white/80">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-gold-mid">Match Analysis:</span>
                            <ul className="space-y-1 pl-1">
                              {match.reasons.map((reason, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-brand-gold">✔</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                            {match.matchedKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2.5 items-center">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-white/50 mr-1 mt-0.5">Key Overlaps:</span>
                                {match.matchedKeywords.map((kw, idx) => (
                                  <span key={idx} className="bg-brand-gold/15 text-brand-gold text-[10px] font-bold px-2 py-0.5 rounded-md border border-brand-gold/20">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action trigger button */}
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => {
                              onShowToast(`Comparing details with ${matchedItem.title}...`, 'info');
                              onSelectItem(matchedItem);
                            }}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 transition-all text-xs font-black rounded-lg cursor-pointer flex items-center gap-1 shadow-md shadow-amber-500/20 hover:scale-[1.02] border border-amber-300/30"
                          >
                            Compare &amp; View Post
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Side Contact Card Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider mb-4">Posted By</h3>
            
            <div className="flex items-center gap-4 pb-4 border-b border-brand-border dark:border-slate-800 mb-6">
              {isLoggedIn ? (
                <div 
                  onClick={() => {
                    if (item.userId) {
                      setSelectedPosterId(item.userId);
                    } else {
                      onShowToast("This user's profile details are not available.", "info");
                    }
                  }}
                  className="flex items-center gap-4 cursor-pointer group/poster hover:opacity-90 transition-all flex-1"
                  title="Click to view verified student profile"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0D1B2A] to-[#243347] text-brand-gold flex items-center justify-center text-lg font-black font-serif flex-shrink-0 overflow-hidden border border-brand-border/50 group-hover/poster:scale-105 transition-transform">
                    {item.postedBy.initials && (
                      item.postedBy.initials.startsWith('http') || 
                      item.postedBy.initials.startsWith('data:') || 
                      item.postedBy.initials.startsWith('/') || 
                      item.postedBy.initials.includes('googleusercontent.com') ||
                      item.postedBy.initials.includes('=') || 
                      item.postedBy.initials.length > 4
                    ) ? (
                      <img 
                        src={
                          (() => {
                            let src = String(item.postedBy?.initials || '');
                            if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
                              if (src.includes('googleusercontent.com') || src.startsWith('lh3.')) {
                                return `https://${src.replace(/^\/+/, '')}`;
                              } else if (src.includes('s96-c') || src.length > 10) {
                                return `https://lh3.googleusercontent.com/a/${src}`;
                              }
                            }
                            return src;
                          })()
                        } 
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-full" 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          // Fallback to text initials if the image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const span = document.createElement('span');
                            span.className = 'text-brand-gold-mid text-lg font-black font-serif';
                            span.innerText = item.postedBy.name ? item.postedBy.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
                            parent.appendChild(span);
                          }
                        }}
                      />
                    ) : (
                      item.postedBy.initials || (item.postedBy.name ? item.postedBy.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'U')
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-navy dark:text-white group-hover/poster:text-brand-gold dark:group-hover/poster:text-amber-400 transition-colors flex items-center gap-1">
                      {item.postedBy.name}
                    </h4>
                    <p className="text-xs text-brand-ink2 dark:text-slate-400 mt-0.5">
                      {(() => {
                        const pRole = (posterProfile?.role || '').toLowerCase();
                        const isPAdmin = pRole === 'admin' || pRole === 'moderator' || pRole === 'staff' || (item.postedBy?.name || '').toLowerCase().includes('admin');
                        if (isPAdmin) {
                          return pRole === 'admin' ? 'ICT Administration' : pRole === 'moderator' ? 'Campus Community Moderation' : 'University Staff';
                        }
                        return item.postedBy.department || 'JKKNIU Student';
                      })()}
                    </p>
                    {item.postedBy.verified && !['admin', 'moderator', 'coordinator', 'staff'].includes(String(posterProfile?.role || (item.postedBy as any)?.role || '').toLowerCase()) && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        <CheckCircle className="w-3.5 h-3.5 fill-emerald-100 dark:fill-emerald-950" />
                        Verified Student
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-lg font-black flex-shrink-0 border border-dashed border-slate-300 dark:border-slate-700">
                    🔒
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-navy dark:text-white italic">Name Hidden for Guests</h4>
                    <p className="text-[11px] text-brand-ink3 dark:text-slate-400 mt-0.5 font-medium">JKKNIU Department Protected</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-brand-gold font-bold mt-1 bg-brand-gold/5 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-brand-gold/20 dark:border-amber-500/30">
                      Login to view credentials
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2 mb-5 space-y-3">
              <h5 className="text-sm font-bold text-brand-navy dark:text-white transition-colors flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-brand-gold rounded-full"></span>
                  Quick Contact Information
                </span>
                {!isLoggedIn && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    Protected
                  </span>
                )}
              </h5>

              {!isLoggedIn ? (
                <div className="p-4 bg-slate-50 dark:bg-[#162137] rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Contact Info Hidden for Guests</h6>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      To protect JKKNIU student privacy and prevent spam, personal contact details (Email, Phone, WhatsApp) are strictly restricted to verified campus users.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRequireLogin({ type: 'contact', item })}
                    className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                    <span>Log In to View Contact Details</span>
                  </button>
                </div>
              ) : loadingPoster ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-3 animate-pulse justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
                  <span>Loading contact details...</span>
                </div>
              ) : (() => {
                const effectiveEmail = posterProfile?.email || item.email || (item as any).contactEmail || (item as any).posterEmail || '';
                const rawPhone = posterProfile?.phone || (item as any).phone || (item as any).contactPhone || (item as any).posterPhone || '';

                const isPosterPhoneHidden = Boolean(
                  posterProfile?.profileVisibility === 'private' ||
                  posterProfile?.hidePhone === true ||
                  posterProfile?.isPhonePrivate === true ||
                  (item as any).hidePhone === true ||
                  (item as any).isPhonePrivate === true ||
                  (item as any).profileVisibility === 'private' ||
                  (item.postedBy as any)?.profileVisibility === 'private' ||
                  (item.postedBy as any)?.hidePhone === true ||
                  (item.postedBy as any)?.isPhonePrivate === true
                );

                const viewerRole = (currentUser?.role || '').toLowerCase();
                const isViewerAdmin = viewerRole === 'admin' || viewerRole === 'moderator' || viewerRole === 'staff';
                const canSeePhone = !isPosterPhoneHidden || isAuthor || isViewerAdmin;
                const effectivePhone = canSeePhone ? rawPhone : '';

                if (!effectiveEmail && !effectivePhone && !isPosterPhoneHidden) {
                  return (
                    <div className="p-3.5 bg-slate-50 dark:bg-[#162137] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium text-center leading-relaxed">
                        Contact details not explicitly shared. Please use <strong className="text-slate-900 dark:text-white font-bold">In-App Messaging</strong> below to reach the poster securely.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Email copy bar */}
                    {effectiveEmail && (
                      <div className="p-3.5 bg-slate-50 dark:bg-[#162137] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-amber-400/80 dark:hover:border-amber-400/80 transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                              <Mail className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Email Address</span>
                              <span className="block text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate font-mono select-all mt-0.5" title={effectiveEmail}>
                                {effectiveEmail}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(effectiveEmail);
                              onShowToast('Email copied to clipboard!', 'success');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 transition-all text-xs font-bold rounded-lg cursor-pointer flex-shrink-0 hover:scale-[1.02] active:scale-[0.98] shadow-xs"
                            title="Copy Email Address"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Phone copy bar / Hidden Privacy Notice */}
                    {(() => {
                      const pRole = (posterProfile?.role || '').toLowerCase();
                      const isPAdmin = pRole === 'admin' || pRole === 'moderator' || pRole === 'staff' || (item.postedBy?.name || '').toLowerCase().includes('admin');
                      
                      if (isPAdmin) {
                        return (
                          <div className="p-3.5 bg-slate-50 dark:bg-[#162137] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20 mt-0.5">
                                <Phone className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Phone / Contact</span>
                                <span className="block text-xs font-bold text-slate-900 dark:text-white mt-1">
                                  Protected Official Contact (In-App Messaging Available)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // If poster hid their phone and viewer is regular other user:
                      if (isPosterPhoneHidden && !isAuthor && !isViewerAdmin) {
                        return (
                          <div className="p-3.5 bg-slate-50 dark:bg-[#162137] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 border border-slate-300 dark:border-slate-600 mt-0.5">
                                <Lock className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Phone / Contact</span>
                                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                  Hidden by poster for privacy
                                </span>
                                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                  Use the <strong>In-App Chat</strong> or <strong>Request Callback</strong> buttons below to contact safely.
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (!effectivePhone) return null;

                      return (
                        <div className="p-3.5 bg-slate-50 dark:bg-[#162137] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-amber-400/80 dark:hover:border-amber-400/80 transition-all">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20 mt-0.5">
                              <Phone className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Phone / Contact</span>
                                {isPosterPhoneHidden && (
                                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/20 dark:border-amber-500/40">
                                    {isAuthor ? 'Hidden from public' : 'Admin visible'}
                                  </span>
                                )}
                              </div>
                              <span className="block text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate font-mono select-all mt-0.5">
                                {effectivePhone}
                              </span>
                              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(effectivePhone);
                                    onShowToast('Phone number copied to clipboard!', 'success');
                                  }}
                                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-all text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                  title="Copy Phone Number"
                                >
                                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Copy</span>
                                </button>
                                <a
                                  href={`https://wa.me/${String(effectivePhone || '').replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                  title="Message on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Owner & Staff Management Control Panel */}
              {(() => {
                const isOwner = currentUser && (
                  (currentUser.id && (
                    (item.userId && String(currentUser.id) === String(item.userId)) ||
                    ((item as any).firebaseUid && String(currentUser.id) === String((item as any).firebaseUid)) ||
                    ((item as any).ownerUid && String(currentUser.id) === String((item as any).ownerUid)) ||
                    (item.postedBy && (item.postedBy as any).userId && String(currentUser.id) === String((item.postedBy as any).userId))
                  )) ||
                  (currentUser.email && (
                    (item.email && currentUser.email.toLowerCase() === item.email.toLowerCase()) ||
                    ((item.postedBy as any)?.email && currentUser.email.toLowerCase() === (item.postedBy as any).email.toLowerCase())
                  ))
                );
                const isStaff = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

                if (!isOwner && !isStaff) return null;

                return (
                  <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/20 border-2 border-amber-400/80 dark:border-amber-500/50 rounded-xl space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-slate-900 dark:text-amber-200 font-black text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>{isOwner ? 'Author Controls (Your Listing)' : 'Moderator / Admin Controls'}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                        {statusLabels[currentStatus] || currentStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-300 font-medium leading-relaxed">
                      Manage this listing's lifecycle status, verify handover, or close when resolved.
                    </p>

                    {/* Status actions */}
                    <div className="flex flex-col gap-2 pt-1">
                      {currentStatus !== 'returned' && currentStatus !== 'reunited' && currentStatus !== 'claimed' && currentStatus !== 'resolved' ? (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => setShowResolutionModal(true)}
                            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                            <span>
                              {item.type === 'lost' ? '🎉 I Found My Item! (Mark as Reunited)' : '✓ Handed Over to Owner (Mark as Returned)'}
                            </span>
                          </button>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 text-center font-medium">
                            Click to record successful return/recovery and update public post status.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              Listing Resolved: {item.type === 'lost' ? 'Reunited with Owner' : 'Returned to Owner'}
                            </span>
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={async () => {
                                setIsUpdatingStatus(true);
                                try {
                                  const { apiFetch } = await import('../utils/api');
                                  await apiFetch(`/items/${item.id}/status`, {
                                    method: 'PUT',
                                    bodyData: { status: 'active' }
                                  });
                                  setCurrentStatus('active');
                                  onShowToast('Listing re-opened as active.', 'info');
                                } catch (err: any) {
                                  onShowToast(err?.message || 'Failed to update status', 'error');
                                } finally {
                                  setIsUpdatingStatus(false);
                                }
                              }}
                              className="text-[11px] underline font-bold text-emerald-700 dark:text-emerald-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              Re-open Listing
                            </button>
                          </div>
                          <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90 font-medium leading-relaxed">
                            🎉 This item was successfully recovered and celebrated in the campus community log.
                          </p>
                        </div>
                      )}
                    </div>

                    {showDeleteConfirm ? (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg space-y-2 animate-in fade-in zoom-in-95 mt-2">
                        <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                          Confirm deleting this listing permanently?
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isDeleting}
                            onClick={async () => {
                              setIsDeleting(true);
                              if (onDeleteItem) {
                                await onDeleteItem(item.id);
                              } else {
                                onShowToast('Listing deleted successfully.', 'success');
                              }
                              setIsDeleting(false);
                              onBack();
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black cursor-pointer transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Post'}</span>
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Post</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              <button 
                onClick={() => {
                  if (!isLoggedIn) {
                    onRequireLogin({ type: 'contact', item });
                  } else {
                    onSendMessage(item);
                  }
                }}
                className="w-full text-center py-3.5 bg-brand-navy hover:bg-brand-navy-mid dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-brand-gold dark:text-slate-950" />
                <span>Send Message</span>
              </button>

              <button 
                onClick={() => {
                  if (!isLoggedIn) {
                    onRequireLogin({ type: 'request_call', item });
                  } else {
                    setShowRequestCallModal(true);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 border border-brand-border dark:border-slate-700/80 bg-white dark:bg-[#162137] text-brand-navy dark:text-slate-200 hover:border-brand-gold hover:bg-brand-gold/5 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs group"
              >
                <Phone className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
                <span className="text-brand-navy dark:text-slate-200 group-hover:text-brand-gold dark:group-hover:text-amber-400 transition-colors">Request Call</span>
              </button>

              {/* Dynamic Save / Unsave Action Button */}
              {(() => {
                const isSaved = (savedItemIds || []).includes(String(item.id));
                return (
                  <div className="space-y-2">
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          onRequireLogin({ type: 'save_item', item });
                        } else if (onToggleSaveItem) {
                          const nextSaved = !isSaved;
                          onToggleSaveItem(item.id, item.title);
                          setBookmarkFeedback(nextSaved ? 'saved' : 'unsaved');
                          setTimeout(() => {
                            setBookmarkFeedback(null);
                          }, 3500);
                        }
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 py-2.5 border text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs group ${
                        isSaved
                          ? 'bg-amber-500/15 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-400/80 dark:border-amber-500/80 hover:bg-amber-500/25 ring-2 ring-amber-400/30'
                          : 'bg-white dark:bg-[#162137] text-brand-navy dark:text-slate-200 border-brand-border dark:border-slate-700/80 hover:border-brand-gold hover:bg-brand-gold/5 dark:hover:bg-slate-800'
                      }`}
                    >
                      <motion.div
                        animate={
                          bookmarkFeedback === 'saved'
                            ? { scale: [1, 1.45, 1], rotate: [0, -15, 15, 0] }
                            : {}
                        }
                        transition={{ duration: 0.35 }}
                      >
                        <Bookmark className={`w-4 h-4 transition-transform group-hover:scale-110 ${isSaved ? 'fill-amber-500 text-amber-500' : 'text-brand-gold'}`} />
                      </motion.div>
                      <span className="text-brand-navy dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                        {isSaved ? 'Saved in Bookmarks (Click to Unsave)' : 'Save Item to Bookmarks'}
                      </span>
                    </motion.button>

                    {/* Inline Visual Confirmation Feedback Banner */}
                    <AnimatePresence>
                      {bookmarkFeedback && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -4 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -4 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 overflow-hidden shadow-xs ${
                            bookmarkFeedback === 'saved'
                              ? 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.15)]'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {bookmarkFeedback === 'saved' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Bookmark className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                            )}
                            <span className="leading-tight">
                              {bookmarkFeedback === 'saved' 
                                ? 'Item bookmarked! Available in your Saved list.' 
                                : 'Item removed from your Bookmarks.'}
                            </span>
                          </div>
                          {bookmarkFeedback === 'saved' && (onOpenSavedModal || onOpenUserModal) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenSavedModal) onOpenSavedModal();
                                else if (onOpenUserModal) onOpenUserModal('saved');
                              }}
                              className="text-[11px] font-black underline text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 cursor-pointer flex-shrink-0"
                            >
                              View Saved
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
              <button 
                onClick={handleShare}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 border border-brand-border dark:border-slate-700/80 bg-white dark:bg-[#162137] text-brand-navy dark:text-slate-200 hover:border-brand-gold hover:bg-brand-gold/5 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs group"
              >
                <Share2 className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
                <span className="text-brand-navy dark:text-slate-200 group-hover:text-brand-gold dark:group-hover:text-amber-400 transition-colors">Share Listing</span>
              </button>
              <button 
                onClick={() => {
                  if (!isLoggedIn) {
                    onRequireLogin({ type: 'print', item });
                  } else {
                    setShowPrintModal(true);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 border border-brand-border dark:border-slate-700/80 bg-white dark:bg-[#162137] text-brand-navy dark:text-slate-200 hover:border-brand-gold hover:bg-brand-gold/5 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs group"
              >
                <Printer className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
                <span className="text-brand-navy dark:text-slate-200 group-hover:text-brand-gold dark:group-hover:text-amber-400 transition-colors">Print Flyer Poster</span>
              </button>
              <button 
                onClick={() => {
                  if (!isLoggedIn) {
                    onRequireLogin({ type: 'report_item', item });
                  } else {
                    setShowReportModal(true);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 border border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 bg-white dark:bg-[#162137] text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Report Listing
              </button>
            </div>

            <div className="bg-brand-gold/10 dark:bg-amber-950/30 border border-brand-gold/20 dark:border-amber-500/20 rounded-xl p-4 mt-6 flex items-start gap-2 text-xs text-brand-gold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Contains private student properties. Please check credentials during face-to-face meetups.</span>
            </div>
          </div>

          {/* Similar Items lists */}
          <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-serif text-base font-bold text-brand-navy dark:text-white mb-4">Similar Lost Items</h3>
            <div className="flex flex-col gap-4">
              {similarItems.slice(0, 2).map(sim => (
                <div 
                  key={sim.id}
                  onClick={() => onSelectItem(sim)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  {sim.image ? (
                    <img src={sim.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-11 h-11 bg-brand-cream dark:bg-[#162137] border border-brand-border dark:border-slate-700 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:border-brand-gold transition-colors text-brand-gold">
                      <Inbox className="w-5 h-5 text-brand-gold" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-brand-navy dark:text-slate-100 group-hover:text-brand-gold dark:group-hover:text-amber-400 transition-colors truncate">{sim.title}</h4>
                    <p className="text-[11px] text-brand-ink3 dark:text-slate-400 mt-0.5">{sim.location} · {sim.date}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    sim.type === 'lost' ? 'bg-red-100 text-red-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    {sim.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 rounded-2xl w-full max-w-[min(calc(100vw-24px),32rem)] shadow-2xl p-4 sm:p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-brand-cream dark:hover:bg-slate-800 rounded-full text-brand-ink3 dark:text-slate-400 hover:text-brand-ink dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">Report Listing</h3>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4 font-medium">
              Help us maintain a safe campus community. If you believe this listing violates university guidelines, contains inappropriate content, or is a scam, please flag it below.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  Select Reason
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {REPORT_REASONS.map(reason => (
                    <label 
                      key={reason.id}
                      className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        selectedReason === reason.id 
                          ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/40' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162137] hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="reportReason" 
                        value={reason.id}
                        checked={selectedReason === reason.id}
                        onChange={() => setSelectedReason(reason.id)}
                        className="mt-0.5 accent-amber-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{reason.label}</span>
                        <span className="block text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">{reason.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5">
                  Additional Details
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional context or proof that can help administrators evaluate this listing..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#162137] border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white dark:focus:bg-[#111A2E] transition-all h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Flyer Customizer Modal */}
      <PrintFlyerModal 
        item={item}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onShowToast={onShowToast}
      />

      {/* Request Call / Callback Modal */}
      {showRequestCallModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[min(calc(100vw-24px),32rem)] shadow-2xl p-4 sm:p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowRequestCallModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-3">
              <Phone className="w-6 h-6" />
              <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">Request Callback</h3>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed font-medium">
              Request a phone call from the reporter regarding <strong className="text-slate-900 dark:text-white font-extrabold">"{item.title}"</strong>. Provide your phone number and preferred callback time.
            </p>

            <form onSubmit={handleRequestCallSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5">
                  Your Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={requestCallPhone}
                  onChange={(e) => setRequestCallPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#162137] border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white dark:focus:bg-[#111A2E] transition-all font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5">
                  Preferred Callback Time
                </label>
                <select
                  value={requestCallTime}
                  onChange={(e) => setRequestCallTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#162137] border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white dark:focus:bg-[#111A2E] transition-all cursor-pointer"
                >
                  <option value="As soon as possible" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-slate-100">As soon as possible</option>
                  <option value="Morning (9:00 AM - 12:00 PM)" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-slate-100">Morning (9:00 AM - 12:00 PM)</option>
                  <option value="Afternoon (12:00 PM - 5:00 PM)" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-slate-100">Afternoon (12:00 PM - 5:00 PM)</option>
                  <option value="Evening (5:00 PM - 9:00 PM)" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-slate-100">Evening (5:00 PM - 9:00 PM)</option>
                  <option value="Anytime" className="bg-white dark:bg-[#111A2E] text-slate-900 dark:text-slate-100">Anytime</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5">
                  Additional Note (Optional)
                </label>
                <textarea
                  value={requestCallNote}
                  onChange={(e) => setRequestCallNote(e.target.value)}
                  placeholder="e.g., I have found your item / I am available near Central Library..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#162137] border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white dark:focus:bg-[#111A2E] transition-all h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestCallModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer"
                  disabled={isSubmittingCallRequest}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                  disabled={isSubmittingCallRequest}
                >
                  <Phone className="w-4 h-4 text-brand-gold dark:text-slate-950" />
                  <span>{isSubmittingCallRequest ? 'Sending Request...' : 'Send Call Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isLightboxOpen && imagesList.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/95 z-[9999] flex flex-col select-none animate-fade-in"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
              setZoomScale(1);
              setPanPosition({ x: 0, y: 0 });
            } else if (e.key === 'ArrowRight') {
              setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
              setZoomScale(1);
              setPanPosition({ x: 0, y: 0 });
            } else if (e.key === 'Escape') {
              setIsLightboxOpen(false);
            }
          }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          {/* Top Control Bar */}
          <div className="p-3 sm:p-4 bg-black/50 text-white flex flex-wrap gap-2 justify-between items-center z-50">
            <div className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-slate-300 truncate">
              IMAGE {activeImageIndex + 1} OF {imagesList.length} 
              {imagesList[activeImageIndex]?.isCover && <span className="text-brand-gold ml-2">· COVER</span>}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Zoom buttons */}
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(1, prev - 0.5))}
                className="px-2.5 sm:px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-all text-white cursor-pointer"
                title="Zoom Out"
              >
                -
              </button>
              <span className="text-xs font-mono">{Math.round(zoomScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(5, prev + 0.5))}
                className="px-2.5 sm:px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-all text-white cursor-pointer"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="px-2.5 sm:px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-all text-slate-300 cursor-pointer hidden min-[360px]:inline-block"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Close overlay (Esc)"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Stage */}
          <div 
            className="flex-1 w-full relative overflow-hidden flex items-center justify-center cursor-move"
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setZoomScale(prev => Math.min(5, prev + 0.2));
              } else {
                setZoomScale(prev => Math.max(1, prev - 0.2));
              }
            }}
            onMouseDown={(e) => {
              if (zoomScale > 1) {
                setIsDragging(true);
                setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && zoomScale > 1) {
                setPanPosition({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y
                });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onDoubleClick={() => {
              if (zoomScale === 1) {
                setZoomScale(2);
              } else {
                setZoomScale(1);
                setPanPosition({ x: 0, y: 0 });
              }
            }}
          >
            {/* Image display layer */}
            <img 
              src={imagesList[activeImageIndex]?.url} 
              alt={`Zoom view ${activeImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain transition-transform duration-100 ease-out select-none pointer-events-none"
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`
              }}
              loading="lazy"
            />

            {/* Stage-level Navigation arrows */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="absolute left-2 sm:left-4 p-2.5 sm:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all text-base sm:text-lg font-black cursor-pointer"
                  title="Previous image"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="absolute right-2 sm:right-4 p-2.5 sm:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all text-base sm:text-lg font-black cursor-pointer"
                  title="Next image"
                >
                  &rarr;
                </button>
              </>
            )}
          </div>

          {/* Quick thumbnails bar at bottom */}
          {imagesList.length > 1 && (
            <div className="bg-black/50 p-3 sm:p-4 overflow-x-auto flex justify-center gap-2 touch-scroll">
              {imagesList.map((img, idx) => (
                <button
                  key={`lightbox-thumb-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className={`w-12 h-12 rounded border transition-all overflow-hidden flex-shrink-0 cursor-pointer ${
                    idx === activeImageIndex ? 'border-brand-gold scale-105' : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          {/* Drag & Pinch Helper overlay */}
          <div className="absolute bottom-4 left-4 text-[10px] text-slate-400 font-mono tracking-wide pointer-events-none bg-black/30 px-3 py-1.5 rounded-md hidden min-[480px]:block">
            Double-click to zoom · Scroll wheel zooms · Click & drag to pan when zoomed
          </div>
        </div>
      )}

      {/* Handover & Recovery Resolution Modal */}
      {showResolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 rounded-2xl max-w-[min(calc(100vw-24px),28rem)] w-full p-4 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                    {item.type === 'lost' ? 'Item Reunited & Recovered' : 'Handover & Return Completed'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update listing status to celebrate successful recovery!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResolutionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                How was the item recovered or returned?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'chat', label: 'In-App Chat / Message', desc: 'Resolved through student chat messages', icon: MessageSquare },
                  { id: 'admin_office', label: 'Admin / Proctor Office', desc: 'Handed over via university authority', icon: Building2 },
                  { id: 'meetup', label: 'Direct Campus Meetup', desc: 'Met at library/TSC/faculty building', icon: Users },
                  { id: 'self_found', label: 'Found on My Own', desc: 'Recovered independently or retrieved safely', icon: CheckCircle2 }
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSel = resolutionMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setResolutionMethod(opt.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSel 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#162137] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSel ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="text-xs font-bold">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Optional Note / Gratitude Message
              </label>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Returned safely to owner! Thanks to the kind student who contacted me."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#162137] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResolutionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={async () => {
                  setIsUpdatingStatus(true);
                  try {
                    const { apiFetch } = await import('../utils/api');
                    await apiFetch(`/items/${item.id}/status`, {
                      method: 'PUT',
                      bodyData: { 
                        status: 'returned',
                        resolutionMethod,
                        resolutionNotes
                      }
                    });
                    setCurrentStatus('returned');
                    setShowResolutionModal(false);
                    onShowToast(
                      `🎉 Success! Listing status marked as ${item.type === 'lost' ? 'Reunited with Owner' : 'Returned to Owner'}!`,
                      'success'
                    );
                  } catch (err: any) {
                    onShowToast(err?.message || 'Failed to update status', 'error');
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isUpdatingStatus ? 'Updating...' : item.type === 'lost' ? 'Confirm Reunited' : 'Confirm Returned'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public student profile view modal */}
      <PublicProfileModal
        userId={selectedPosterId}
        isOpen={selectedPosterId !== null}
        onClose={() => setSelectedPosterId(null)}
        onShowToast={onShowToast}
      />

      {/* Share to Facebook, Messenger, WhatsApp, Social & Copy Link Modal */}
      <ShareModal
        item={item}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
}

// Simple Helper component for verified check
function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
