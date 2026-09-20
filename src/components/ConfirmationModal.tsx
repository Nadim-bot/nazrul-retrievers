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

  // Sparkle burst particles
  const particles = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const angle = (i * 360) / 16;
      const distance = 60 + (i % 3) * 20;
      const radian = (angle * Math.PI) / 180;
      const x = Math.cos(radian) * distance;
      const y = Math.sin(radian) * distance;
      const colors = ['#F59E0B', '#10B981', '#3B82F6', '#F59E0B', '#10B981'];
      return {
        id: i,
        x,
        y,
        color: colors[i % colors.length],
        size: 4 + (i % 4) * 2,
        delay: (i % 5) * 0.03,
      };
    });
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md cursor-pointer"
      />

      {/* Dialog Container */}
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
        className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-lg shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] relative overflow-hidden z-10 flex flex-col my-auto max-h-[92vh] focus:outline-none"
      >
        {/* Top Decorative Brand Gradient Stripe */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 shrink-0" />

        {/* Top Floating Close Button */}
        <button 
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer z-20 shadow-2xs focus:outline-none"
          title="Close window (Esc)"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 custom-scrollbar">
          
          {/* Header Banner */}
          <div className="flex flex-col items-center text-center relative pt-1">
            {/* Animated Celebration Burst */}
            <div className="absolute top-6 inset-x-0 pointer-events-none flex items-center justify-center">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ 
                    x: p.x, 
                    y: p.y, 
                    scale: [0, 1.2, 0.6, 0], 
                    opacity: [1, 1, 0.6, 0]
                  }}
                  transition={{ 
                    duration: 1.1, 
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
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-3.5 relative"
            >
              <Check className="w-8 h-8 stroke-[3.5]" />
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs border-2 border-white">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              </div>
            </motion.div>

            {/* Title & Tagline */}
            <motion.h3 
              id="modal-title-id"
              variants={childVariants}
              className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
            >
              Report Published Successfully!
            </motion.h3>
            
            <motion.p 
              id="modal-desc-id"
              variants={childVariants}
              className="text-xs sm:text-sm text-slate-600 mt-1 max-w-sm font-medium leading-relaxed"
            >
              {item.type === 'found' ? (
                <span>Thank you for reporting this found item! Your honesty helps keep our campus connected.</span>
              ) : (
                <span>Your lost item report is live on the campus feed and actively searchable by students & staff.</span>
              )}
            </motion.p>
          </div>

          {/* Reference ID & Item Preview Card */}
          <motion.div 
            variants={childVariants}
            className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-3"
          >
            {/* Reference Header Bar */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Tracking Code:</span>
                <span className="font-mono font-black text-amber-700 text-xs sm:text-sm bg-amber-100/80 border border-amber-300/80 px-2.5 py-0.5 rounded-lg tracking-wider">
                  {referenceNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Copy tracking code"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700 font-extrabold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Item Details Row */}
            <div className="flex items-start gap-3.5 pt-1">
              {item.image || item.coverImage ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-200 shadow-2xs">
                  <img 
                    src={item.coverImage || item.image} 
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-amber-100/60 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 text-xl font-bold">
                  {item.emoji || <Inbox className="w-6 h-6" />}
                </div>
              )}
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    item.type === 'lost' 
                      ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                    {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
                  </span>
                  
                  <span className="text-xs text-slate-500 font-semibold truncate">
                    • {item.category}
                  </span>
                </div>
                
                <h4 className="text-sm font-black text-slate-900 truncate leading-snug">
                  {item.title}
                </h4>
                
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{item.location} {item.specificSpot ? `(${item.specificSpot})` : ''}</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Next Steps Visual Timeline */}
          <motion.div variants={childVariants} className="space-y-2">
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>What happens next?</span>
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-bold text-slate-900">Auto-Matching</p>
                <p className="text-[11px] text-slate-500 leading-tight">Cross-checks against campus listings 24/7</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-bold text-slate-900">Instant Alerts</p>
                <p className="text-[11px] text-slate-500 leading-tight">Get notified when a student claims or chats</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-bold text-slate-900">Notice Flyer</p>
                <p className="text-[11px] text-slate-500 leading-tight">Print QR flyer for departmental boards</p>
              </div>
            </div>
          </motion.div>

          {/* Social Share & Flyer Actions */}
          <motion.div 
            variants={childVariants} 
            className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Share2 className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-slate-800">Share to Campus Groups:</span>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer shadow-2xs"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs"
                title="Share on WhatsApp"
              >
                <Send className="w-4 h-4 rotate-[-30deg]" />
              </button>

              <button
                type="button"
                onClick={handleFacebookShare}
                className="p-2 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                title="Share on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleMessengerShare}
                className="p-2 rounded-xl bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                title="Share on Messenger"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              <div className="h-5 w-px bg-slate-300 mx-1" />

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintFlyer();
                }}
                className="px-3 py-1.5 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Print physical poster"
              >
                <Printer className="w-3.5 h-3.5 text-amber-700" />
                <span>Flyer</span>
              </button>
            </div>
          </motion.div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                if (onViewReport) {
                  onViewReport();
                } else {
                  window.open(shareUrl, '_blank');
                }
              }}
              className="w-full sm:flex-1 h-11.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md shadow-amber-500/20 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] border border-amber-300/40"
            >
              <Eye className="w-4 h-4 stroke-[2.5]" />
              <span>View Live Listing</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 h-11.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200/80"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

        </div>

      </motion.div>
    </motion.div>
  );
}
