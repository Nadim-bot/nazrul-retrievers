import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Copy, 
  Printer, 
  X, 
  Share2, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  AlertTriangle, 
  Heart, 
  Sparkles,
  CheckCircle2,
  Mail,
  Send,
  Facebook,
  MessageCircle,
  Inbox,
  Eye,
  ShieldCheck,
  Bell,
  Search,
  FileText
} from 'lucide-react';
import { Item } from '../types';

interface ConfirmationModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintFlyer: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onViewReport?: () => void;
}

export default function ConfirmationModal({
  item,
  isOpen,
  onClose,
  onOpenPrintFlyer,
  onShowToast,
  onViewReport
}: ConfirmationModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const referenceNumber = `#NR-${String(item.id).padStart(5, '0')}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const shareUrl = `${origin}/?item=${encodeURIComponent(item.id)}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      onShowToast('Listing link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (e) {
      onShowToast('Failed to copy link. Try copying manually.', 'error');
    }
  };

  const handleCopyId = () => {
    try {
      navigator.clipboard.writeText(referenceNumber);
      setCopiedId(true);
      onShowToast('Reference ID copied!', 'success');
      setTimeout(() => setCopiedId(false), 2200);
    } catch (e) {
      onShowToast('Failed to copy ID.', 'error');
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🔔 *${item.type === 'lost' ? 'LOST PROPERTY REPORT' : 'FOUND PROPERTY REPORT'} - JKKNIU* 🔔\n\nItem: *${item.title}*\nLocation: *${item.location}* ${item.specificSpot ? `(${item.specificSpot})` : ''}\nReference: *${referenceNumber}*\n\nPlease check details and connect here:\n${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(
      `🔔 Nazrul Retrievers Campus Alert: ${item.type === 'lost' ? 'LOST' : 'FOUND'} ${item.title.toUpperCase()} at ${item.location}. Ref: ${referenceNumber}. Link: ${shareUrl}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleMessengerShare = () => {
    const url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494448529&redirect_uri=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 24 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: 'spring', 
        stiffness: 280, 
        damping: 24,
        staggerChildren: 0.05,
        delayChildren: 0.08
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 12,
      transition: {
        duration: 0.18,
        ease: 'easeInOut'
      }
    }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring', stiffness: 300, damping: 24 } 
    }
  };

  // Sparkle burst particles (subtle & lightweight)
  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 360) / 12;
      const distance = 42 + (i % 3) * 14;
      const radian = (angle * Math.PI) / 180;
      const x = Math.cos(radian) * distance;
      const y = Math.sin(radian) * distance;
      const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899'];
      return {
        id: i,
        x,
        y,
        color: colors[i % colors.length],
        size: 3 + (i % 3) * 1.5,
        delay: (i % 4) * 0.025,
      };
    });
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
      />

      {/* Dialog Container - Compact & Well-proportioned */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        id="confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title-id"
        aria-describedby="modal-desc-id"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[430px] shadow-2xl relative overflow-hidden z-10 flex flex-col my-auto max-h-[94vh] focus:outline-none"
      >
        {/* Top Decorative Brand Gradient Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 shrink-0" />

        {/* Top Floating Close Button */}
        <button 
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer z-20 focus:outline-none"
          title="Close window (Esc)"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar">
          
          {/* Header Banner (Compact) */}
          <div className="flex flex-col items-center text-center relative pt-0.5">
            {/* Celebration burst */}
            <div className="absolute top-4 inset-x-0 pointer-events-none flex items-center justify-center">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ 
                    x: p.x, 
                    y: p.y, 
                    scale: [0, 1.2, 0.5, 0], 
                    opacity: [1, 1, 0.5, 0]
                  }}
                  transition={{ 
                    duration: 0.9, 
                    ease: [0.16, 1, 0.3, 1],
                    delay: p.delay 
                  }}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                  }}
                />
              ))}
            </div>

            {/* Success Icon */}
            <motion.div 
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 mb-2 relative"
            >
              <Check className="w-6 h-6 stroke-[3.5]" />
              <div className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900">
                <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
              </div>
            </motion.div>

            {/* Title & Tagline */}
            <motion.h3 
              id="modal-title-id"
              variants={childVariants}
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight"
            >
              Report Published Successfully!
            </motion.h3>
            
            <motion.p 
              id="modal-desc-id"
              variants={childVariants}
              className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs font-medium leading-normal"
            >
              {item.type === 'found' ? (
                <span>Thank you! Your honesty helps reunite campus property.</span>
              ) : (
                <span>Live on campus feed & actively searchable by students & staff.</span>
              )}
            </motion.p>
          </div>

          {/* Unified Tracking & Item Info Card */}
          <motion.div 
            variants={childVariants}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-3 space-y-2.5"
          >
            {/* Tracking Code Bar */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Track ID:</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-xs bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/50 px-2 py-0.5 rounded-md tracking-wide">
                  {referenceNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all cursor-pointer shrink-0"
                title="Copy tracking code"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Item Details Row */}
            <div className="flex items-center gap-2.5">
              {item.image || item.coverImage ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-200 dark:bg-slate-800">
                  <img 
                    src={item.coverImage || item.image} 
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 text-base font-bold">
                  {item.emoji || <Inbox className="w-5 h-5" />}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    item.type === 'lost' 
                      ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40' 
                      : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                    {item.type === 'lost' ? 'Lost' : 'Found'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                    • {item.category}
                  </span>
                </div>
                
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {item.title}
                </h4>
                
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{item.location} {item.specificSpot ? `(${item.specificSpot})` : ''}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Micro Next-Steps Ribbon */}
          <motion.div 
            variants={childVariants} 
            className="grid grid-cols-3 gap-1.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl p-2"
          >
            <div className="flex flex-col items-center text-center p-1">
              <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-1">
                <Search className="w-3 h-3 stroke-[2.5]" />
              </div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Auto-Match</p>
              <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">Scanned 24/7</p>
            </div>

            <div className="flex flex-col items-center text-center p-1 border-x border-slate-200/60 dark:border-slate-700/60">
              <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-1">
                <Bell className="w-3 h-3 stroke-[2.5]" />
              </div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Instant Alerts</p>
              <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">Realtime Ping</p>
            </div>

            <div className="flex flex-col items-center text-center p-1">
              <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-1">
                <Printer className="w-3 h-3 stroke-[2.5]" />
              </div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">QR Notice</p>
              <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">Print Ready</p>
            </div>
          </motion.div>

          {/* Social Share & Quick Actions */}
          <motion.div 
            variants={childVariants} 
            className="flex items-center justify-between gap-2 px-1"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <Share2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Share:</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 flex items-center justify-center transition-all cursor-pointer"
                title="Share on WhatsApp"
              >
                <Send className="w-3.5 h-3.5 rotate-[-30deg]" />
              </button>

              <button
                type="button"
                onClick={handleFacebookShare}
                className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center transition-all cursor-pointer"
                title="Share on Facebook"
              >
                <Facebook className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleMessengerShare}
                className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 flex items-center justify-center transition-all cursor-pointer"
                title="Share on Messenger"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 flex items-center justify-center transition-all cursor-pointer"
                title="Copy Listing Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintFlyer();
                }}
                className="px-2 py-1 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Print physical notice poster"
              >
                <Printer className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                <span>Flyer</span>
              </button>
            </div>
          </motion.div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (onViewReport) {
                  onViewReport();
                } else {
                  window.open(shareUrl, '_blank');
                }
              }}
              className="h-9.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-sm text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>View Live Listing</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-9.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

        </div>

      </motion.div>
    </motion.div>
  );
}
