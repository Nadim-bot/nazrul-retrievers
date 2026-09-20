import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Mail, 
  Smartphone, 
  QrCode, 
  MapPin, 
  Calendar, 
  Sparkles,
  FileText,
  Download,
  Globe,
  Info,
  Gift,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Item } from '../types';
import { getRewardDetails } from '../utils/rewardUtils';

interface ShareModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ShareModal({
  item,
  isOpen,
  onClose,
  onShowToast
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [showOriginOverride, setShowOriginOverride] = useState(false);
  const [qrImgError, setQrImgError] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item || !mounted) return null;

  // Format date helper for human-readable display
  const formatDisplayDate = (rawDate?: string) => {
    if (!rawDate) return 'Recent';
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return rawDate;
  };

  const formattedDate = formatDisplayDate(item.date);
  const rewardInfo = getRewardDetails(item);

  // Dynamically resolve base origin
  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const effectiveOrigin = (customOrigin.trim() || defaultOrigin).replace(/\/+$/, '');
  const isLocalhost = defaultOrigin.includes('localhost') || defaultOrigin.includes('127.0.0.1');

  // Canonical share URL (both ?item=ID and /item/ID are supported by the router)
  const shareUrl = `${effectiveOrigin}/?item=${encodeURIComponent(item.id)}`;

  const isLost = item.type === 'lost';
  const typeLabel = isLost ? 'LOST ITEM' : 'FOUND ITEM';
  const typeEmoji = isLost ? '🔍' : '📦';

  // Formatted post text for Messenger / WhatsApp / Facebook groups
  const formattedPostText = [
    `📢 [${typeLabel} at JKKNIU] ${typeEmoji}`,
    `📌 Item: ${item.title}`,
    `📍 Location: ${item.location}${item.specificSpot ? ` (${item.specificSpot})` : ''}`,
    `📅 Date: ${formattedDate}`,
    `🏷️ Category: ${item.category}`,
    item.description ? `📝 Details: ${item.description.slice(0, 160)}${item.description.length > 160 ? '...' : ''}` : '',
    rewardInfo ? `🎁 Reward: ${rewardInfo}` : '',
    `🔗 View Listing & Claim: ${shareUrl}`,
    `\n— Verified via Nazrul Retrievers (JKKNIU Lost & Found Portal)`
  ].filter(Boolean).join('\n');

  const shortShareTitle = `${isLost ? '[LOST]' : '[FOUND]'} ${item.title} at JKKNIU`;

  // Fallback copy for iframes / non-secure contexts
  const copyToClipboard = async (text: string, isFormatted: boolean = false) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      if (isFormatted) {
        setCopiedFormatted(true);
        setTimeout(() => setCopiedFormatted(false), 2500);
        onShowToast('Formatted post text copied! Paste directly into Facebook or Messenger.', 'success');
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        onShowToast('Direct listing link copied to clipboard!', 'success');
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
      onShowToast('Copy action failed. Please copy the URL manually.', 'error');
    }
  };

  // Social Share Handlers
  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shortShareTitle)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500,toolbar=no,menubar=no,location=no');
  };

  const handleMessengerShare = () => {
    copyToClipboard(formattedPostText, false);
    onShowToast('Copied post link! Opening Messenger...', 'info');

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`;
      setTimeout(() => {
        window.open(`https://www.messenger.com/`, '_blank');
      }, 1200);
    } else {
      const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`;
      window.open(messengerUrl, '_blank', 'width=600,height=500');
    }
  };

  const handleWhatsAppShare = () => {
    const waText = `${formattedPostText}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shortShareTitle)}`;
    window.open(tgUrl, '_blank');
  };

  const handleTwitterShare = () => {
    const tweetText = `${shortShareTitle}\n${shareUrl} #JKKNIU #LostAndFound`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twUrl, '_blank');
  };

  const handleEmailShare = () => {
    const subject = `${typeLabel}: ${item.title} - JKKNIU Lost & Found`;
    const body = `Hello,\n\nPlease check this listing on the JKKNIU Lost & Found Portal:\n\n${formattedPostText}\n\nThank you!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shortShareTitle,
          text: formattedPostText,
          url: shareUrl
        });
        onShowToast('Shared successfully!', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Native share error:', err);
          onShowToast('Could not open device share menu. Used clipboard fallback.', 'info');
        }
      }
    } else {
      copyToClipboard(shareUrl, false);
    }
  };

  // Primary & Fallback QR code servers (zero build dependencies, reliable across localhost and cloud)
  const primaryQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&margin=6`;
  const fallbackQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(shareUrl)}&size=300&margin=2`;
  const activeQrCodeUrl = qrImgError ? fallbackQrUrl : primaryQrUrl;

  const handleDownloadQr = async () => {
    try {
      setIsDownloadingQr(true);
      const response = await fetch(activeQrCodeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `jkkniu-post-${item.id}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      onShowToast('QR code downloaded successfully!', 'success');
    } catch (e) {
      console.warn('Direct blob download failed, opening image in new tab:', e);
      window.open(activeQrCodeUrl, '_blank');
      onShowToast('Opening QR code image in a new tab...', 'info');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-[min(calc(100vw-24px),36rem)] shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-[#162137]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shrink-0 shadow-xs">
              <Share2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 id="share-modal-title" className="font-serif font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Share Listing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Broadcast across campus networks & social media
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close share dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* ITEM SUMMARY CARD */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <span className="text-2xl">{item.emoji || '📦'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
                  isLost 
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLost ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                  {isLost ? 'Lost Item' : 'Found Item'}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {item.category}
                </span>
                {rewardInfo && (
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-black bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700/60 flex items-center gap-1">
                    <Gift className="w-2.5 h-2.5" />
                    Reward: {rewardInfo}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {item.title}
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{item.location}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{formattedDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: DIRECT LINK & ONE-CLICK COPY */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Direct Listing Link
              </label>
              {isLocalhost && (
                <button
                  type="button"
                  onClick={() => setShowOriginOverride(!showOriginOverride)}
                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Globe className="w-3 h-3" />
                  <span>{showOriginOverride ? 'Hide IP Config' : 'Domain / IP Settings'}</span>
                  {showOriginOverride ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Custom Domain/IP Input for Localhost */}
            {showOriginOverride && (
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs animate-in fade-in duration-150">
                <div className="flex items-start gap-1.5 text-amber-900 dark:text-amber-200 mb-2 leading-tight">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    When testing on LAN or external phones, enter your computer's local IP (e.g. <code>http://192.168.1.100:3000</code>) or live domain so the QR code and link open on mobile.
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    placeholder={defaultOrigin}
                    className="flex-1 text-xs font-mono bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {customOrigin && (
                    <button
                      type="button"
                      onClick={() => setCustomOrigin('')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  aria-label="Direct listing web link"
                  className="w-full text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-amber-500 transition-all select-all truncate"
                />
              </div>
              <button
                onClick={() => copyToClipboard(shareUrl, false)}
                aria-label="Copy direct post link"
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-md active:scale-95'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 stroke-[2.2]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 2: ONE-CLICK SOCIAL SHARE CHANNELS */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Share to Social Media & Campus Groups
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              
              {/* FACEBOOK */}
              <button
                onClick={handleFacebookShare}
                aria-label="Share on Facebook"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                    Facebook
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Feed & Groups</span>
                </div>
              </button>

              {/* MESSENGER */}
              <button
                onClick={handleMessengerShare}
                aria-label="Send via Facebook Messenger"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-sky-500 dark:hover:border-sky-500 hover:bg-sky-50/40 dark:hover:bg-sky-950/30 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0084FF] via-[#00B2FF] to-[#A033FF] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.615 4.47 8.653V24l4.088-2.242c1.09.303 2.247.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.192 14.962l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">
                    Messenger
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Chats & Inbox</span>
                </div>
              </button>

              {/* WHATSAPP */}
              <button
                onClick={handleWhatsAppShare}
                aria-label="Share on WhatsApp"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                    WhatsApp
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Groups & Status</span>
                </div>
              </button>

              {/* TELEGRAM */}
              <button
                onClick={handleTelegramShare}
                aria-label="Share on Telegram"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-sky-400 dark:hover:border-sky-400 hover:bg-sky-50/40 dark:hover:bg-sky-950/30 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.24l-2.02 9.53c-.15.68-.56.84-1.12.52l-3.11-2.29-1.5 1.44c-.17.17-.31.31-.63.31l.22-3.17 5.77-5.21c.25-.22-.05-.35-.39-.12l-7.13 4.49-3.07-.96c-.67-.21-.68-.67.14-.99l12.01-4.63c.56-.2 1.04.13.83 1.08z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">
                    Telegram
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Channels & Chats</span>
                </div>
              </button>

              {/* X / TWITTER */}
              <button
                onClick={handleTwitterShare}
                aria-label="Post on X (Twitter)"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-900 dark:hover:border-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform border border-slate-700/50">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate">
                    X (Twitter)
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Public Post</span>
                </div>
              </button>

              {/* EMAIL */}
              <button
                onClick={handleEmailShare}
                aria-label="Share via Email"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                    Email
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Campus Mail</span>
                </div>
              </button>

            </div>
          </div>

          {/* SECTION 3: FORMATTED POST TEMPLATE (ONE CLICK COPY FOR GROUPS) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  Campus Group Post Template
                </h4>
              </div>
              <button
                onClick={() => copyToClipboard(formattedPostText, true)}
                className={`inline-flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs shrink-0 ${
                  copiedFormatted 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {copiedFormatted ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Copied Template!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Copy Post Text</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
              Pre-formatted summary with title, location, category & direct verification link ready to paste on student batch groups:
            </p>
            <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-amber-200/60 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {formattedPostText}
            </div>
          </div>

          {/* SECTION 4: EXTRA UTILITIES (NATIVE SHARE & QR CODE) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                <span>Device Share Sheet</span>
              </button>
            )}

            <button
              onClick={() => setShowQrCode(!showQrCode)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-auto"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-500" />
              <span>{showQrCode ? 'Hide QR Code' : 'Show Scannable QR Code'}</span>
            </button>
          </div>

          {/* QR CODE EXPANSION */}
          {showQrCode && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150 shadow-xs">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 inline-block mb-3">
                <img 
                  src={activeQrCodeUrl} 
                  alt="Post QR Code" 
                  onError={() => setQrImgError(true)}
                  className="w-36 h-36 object-contain"
                  referrerPolicy="no-referrer" 
                  loading="lazy"
                />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Scan with any phone camera
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-3 max-w-xs truncate">
                Encodes: <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{shareUrl}</span>
              </p>
              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={isDownloadingQr}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloadingQr ? 'Downloading...' : 'Download QR Image (.PNG)'}</span>
              </button>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-[#162137]/90 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 
            <span>Nazrul Retrievers · Campus Lost & Found</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl font-bold text-xs bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
