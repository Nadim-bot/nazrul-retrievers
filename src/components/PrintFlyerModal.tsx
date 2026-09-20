import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Scissors, 
  Phone, 
  User, 
  FileText, 
  Gift, 
  Info, 
  Check, 
  MapPin,
  Calendar,
  Hash,
  Mail,
  Megaphone,
  QrCode,
  Sparkles,
  Tag,
  Eye,
  ShieldCheck,
  Building2,
  AlertCircle,
  Palette,
  RotateCcw,
  Smartphone,
  Share2,
  ShieldAlert,
  HelpCircle,
  PhoneCall
} from 'lucide-react';
import { Item } from '../types';
import { hasItemReward, getRewardDetails } from '../utils/rewardUtils';

interface PrintFlyerModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type PosterTheme = 'urgent-red' | 'campus-navy' | 'found-emerald' | 'royal-purple' | 'mono-clean';

interface ThemeConfig {
  id: PosterTheme;
  name: string;
  badgeBg: string;
  badgeText: string;
  bannerBg: string;
  bannerText: string;
  bannerBorder: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  qrBorder: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
  printBannerStyle: string;
}

const THEME_CONFIGS: Record<PosterTheme, ThemeConfig> = {
  'urgent-red': {
    id: 'urgent-red',
    name: 'Urgent Crimson',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    bannerBg: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700',
    bannerText: 'text-white',
    bannerBorder: 'border-red-700',
    accentBg: 'bg-rose-50 dark:bg-rose-950/30',
    accentText: 'text-rose-900 dark:text-rose-200',
    accentBorder: 'border-rose-200 dark:border-rose-800',
    qrBorder: 'border-rose-600',
    chipBg: 'bg-rose-500/10',
    chipText: 'text-rose-600 dark:text-rose-400',
    chipBorder: 'border-rose-500/20',
    printBannerStyle: 'background-color: #dc2626 !important; color: #ffffff !important; border-color: #991b1b !important;'
  },
  'campus-navy': {
    id: 'campus-navy',
    name: 'Campus Gold & Navy',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    bannerBg: 'bg-gradient-to-r from-slate-900 via-[#162137] to-blue-950',
    bannerText: 'text-amber-400',
    bannerBorder: 'border-amber-500/60',
    accentBg: 'bg-amber-50 dark:bg-amber-950/30',
    accentText: 'text-amber-950 dark:text-amber-200',
    accentBorder: 'border-amber-300 dark:border-amber-700',
    qrBorder: 'border-slate-900',
    chipBg: 'bg-amber-500/10',
    chipText: 'text-amber-600 dark:text-amber-400',
    chipBorder: 'border-amber-500/20',
    printBannerStyle: 'background-color: #0f172a !important; color: #fbbf24 !important; border-color: #f59e0b !important;'
  },
  'found-emerald': {
    id: 'found-emerald',
    name: 'Recovery Emerald',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    bannerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700',
    bannerText: 'text-white',
    bannerBorder: 'border-emerald-700',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    accentText: 'text-emerald-950 dark:text-emerald-200',
    accentBorder: 'border-emerald-200 dark:border-emerald-800',
    qrBorder: 'border-emerald-600',
    chipBg: 'bg-emerald-500/10',
    chipText: 'text-emerald-600 dark:text-emerald-400',
    chipBorder: 'border-emerald-500/20',
    printBannerStyle: 'background-color: #059669 !important; color: #ffffff !important; border-color: #047857 !important;'
  },
  'royal-purple': {
    id: 'royal-purple',
    name: 'Royal Violet',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
    bannerBg: 'bg-gradient-to-r from-purple-700 via-indigo-700 to-violet-800',
    bannerText: 'text-white',
    bannerBorder: 'border-purple-800',
    accentBg: 'bg-purple-50 dark:bg-purple-950/30',
    accentText: 'text-purple-950 dark:text-purple-200',
    accentBorder: 'border-purple-200 dark:border-purple-800',
    qrBorder: 'border-purple-700',
    chipBg: 'bg-purple-500/10',
    chipText: 'text-purple-600 dark:text-purple-400',
    chipBorder: 'border-purple-500/20',
    printBannerStyle: 'background-color: #7c3aed !important; color: #ffffff !important; border-color: #5b21b6 !important;'
  },
  'mono-clean': {
    id: 'mono-clean',
    name: 'High-Contrast Ink Saver',
    badgeBg: 'bg-slate-200 dark:bg-slate-800',
    badgeText: 'text-slate-900 dark:text-slate-100',
    bannerBg: 'bg-black text-white',
    bannerText: 'text-white',
    bannerBorder: 'border-black',
    accentBg: 'bg-slate-100 dark:bg-slate-800',
    accentText: 'text-slate-900 dark:text-white',
    accentBorder: 'border-black dark:border-slate-700',
    qrBorder: 'border-black',
    chipBg: 'bg-slate-200',
    chipText: 'text-slate-800',
    chipBorder: 'border-slate-300',
    printBannerStyle: 'background-color: #000000 !important; color: #ffffff !important; border-color: #000000 !important;'
  }
};

export default function PrintFlyerModal({
  item,
  isOpen,
  onClose,
  onShowToast
}: PrintFlyerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [posterTheme, setPosterTheme] = useState<PosterTheme>(
    item.type === 'lost' ? 'urgent-red' : 'found-emerald'
  );
  const [customHeadline, setCustomHeadline] = useState(
    item.type === 'lost' ? 'LOST PROPERTY' : 'FOUND PROPERTY'
  );
  const [customTitle, setCustomTitle] = useState(item.title);
  const [customContactName, setCustomContactName] = useState(item.postedBy.name);
  const [customContactPhone, setCustomContactPhone] = useState('');
  const [customContactEmail, setCustomContactEmail] = useState(item.postedBy.email || '');
  const [customLocation, setCustomLocation] = useState(
    item.location + (item.specificSpot ? ` (${item.specificSpot})` : '')
  );
  const [customHandoverLocation, setCustomHandoverLocation] = useState(
    'Proctorial Office / Central Library Front Desk'
  );
  const [customFlyerDesc, setCustomFlyerDesc] = useState(item.description);
  const [showReward, setShowReward] = useState(hasItemReward(item));
  const [rewardAmount, setRewardAmount] = useState(
    getRewardDetails(item) || ''
  );
  const [customCallToAction, setCustomCallToAction] = useState(
    item.type === 'lost' ? 'PLEASE CONTACT IF FOUND' : 'CONTACT TO CLAIM YOUR ITEM'
  );
  const [includeTearSlips, setIncludeTearSlips] = useState(true);
  const [includeQrCode, setIncludeQrCode] = useState(true);
  const [includeSafetyProtocol, setIncludeSafetyProtocol] = useState(true);
  const [includeHelplineNotice, setIncludeHelplineNotice] = useState(true);

  // Format date helper for human-readable display
  const formatDisplayDate = (rawDate?: string) => {
    if (!rawDate) return 'Recent';
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {}
    return rawDate;
  };

  const formattedDate = formatDisplayDate(item.date);

  // Attempt to autofill user contact if logged in
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jkkniu_user_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user?.phone && !customContactPhone) {
          setCustomContactPhone(parsed.user.phone);
        }
        if (parsed?.user?.email && !customContactEmail) {
          setCustomContactEmail(parsed.user.email);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      setMounted(false);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    onShowToast('Preparing high-resolution A4 noticeboard poster...', 'info');
    setTimeout(() => {
      try {
        window.print();
      } catch (err: any) {
        console.error('Print action failed:', err);
        onShowToast("Print dialog blocked. Please use browser print shortcut (Ctrl+P)", "error");
      }
    }, 150);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const shareUrl = `${origin}/?item=${encodeURIComponent(item.id)}`;
  const flyerQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}&margin=1`;

  const currentTheme = THEME_CONFIGS[posterTheme];

  // Standardized printable layout injected via Portal for native browser printing
  const printableFlyerHTML = (
    <div 
      id="printable-flyer-area" 
      className="hidden print:flex flex-col justify-between bg-white text-black font-sans box-border"
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '282mm', 
        padding: '8mm 8mm 6mm 8mm',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* CSS overrides inside Portal for print rendering */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          #root, .no-print, [role="dialog"], header, nav, footer {
            display: none !important;
          }
          
          @page {
            size: A4 portrait;
            margin: 4mm 4mm 4mm 4mm;
          }

          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #printable-flyer-area {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      ` }} />

      {/* Main Poster Body */}
      <div className="flex flex-col flex-grow justify-between gap-2.5">
        
        {/* 1. University Header & Campus Notice Banner */}
        <div className="border-3 border-black p-2.5 bg-white text-center rounded-xs">
          <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-1.5 px-1">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-black flex items-center gap-1.5">
              🏛️ JATIYA KABI KAZI NAZRUL ISLAM UNIVERSITY
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-xs">
              OFFICIAL NOTICE • ID #{item.id}
            </span>
          </div>

          {/* Primary High-Impact Headline */}
          <div 
            className="text-4xl font-black uppercase tracking-tight py-2 px-4 rounded-xs border-2"
            style={{ ...JSON.parse(`{ ${currentTheme.printBannerStyle.split(';').filter(s => s.trim()).map(s => {
              const [k, v] = s.split(':');
              return `"${k.trim()}": "${v.replace('!important', '').trim()}"`;
            }).join(',')} }`) }}
          >
            {customHeadline || (item.type === 'lost' ? 'LOST PROPERTY' : 'FOUND PROPERTY')}
          </div>
        </div>

        {/* 2. Item Title & Category Metadata Bar */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-1 flex-wrap justify-center">
            <span className="text-[10px] uppercase font-black tracking-wider bg-gray-200 text-black px-2.5 py-0.5 rounded-xs border border-black">
              📁 {item.category || 'General Belongings'}
            </span>
            <span className="text-[10px] uppercase font-black tracking-wider bg-gray-100 text-black px-2.5 py-0.5 rounded-xs border border-black">
              📍 {item.location || 'JKKNIU Campus'}
            </span>
            <span className="text-[10px] uppercase font-mono font-black text-black bg-gray-100 px-2.5 py-0.5 rounded-xs border border-black">
              🕒 {formattedDate}
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase text-black tracking-tight underline decoration-3 underline-offset-4 mt-0.5">
            {customTitle || item.title}
          </h2>
        </div>

        {/* 3. Central Visual & Core Info Matrix */}
        <div className="grid grid-cols-[165px_1fr] gap-3 items-stretch">
          
          {/* Photo Frame */}
          <div className="border-3 border-black p-2 flex flex-col items-center justify-center bg-gray-50 rounded-lg overflow-hidden shadow-xs">
            {item.image ? (
              <img src={item.image} alt={item.title} className="w-full h-36 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2">
                <span className="text-5xl mb-1">{item.emoji || (item.type === 'lost' ? '🎒' : '🔑')}</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-black">Official Entry</span>
                <span className="text-[9px] text-gray-700 font-bold mt-0.5">Verified on campus portal</span>
              </div>
            )}
          </div>

          {/* Quick Details Box Grid */}
          <div className="border-3 border-black divide-y-2 divide-black bg-white flex flex-col justify-between">
            <div className="grid grid-cols-2 divide-x-2 divide-black">
              <div className="p-2 flex items-start gap-1.5">
                <span className="text-xs">📍</span>
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-700 block">CAMPUS LOCATION</span>
                  <span className="text-xs font-black text-black uppercase leading-tight block">{customLocation}</span>
                </div>
              </div>
              <div className="p-2 flex items-start gap-1.5">
                <span className="text-xs">📅</span>
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-700 block">DATE & TIME</span>
                  <span className="text-xs font-black text-black uppercase leading-tight block">{formattedDate}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x-2 divide-black">
              <div className="p-2 flex items-start gap-1.5">
                <span className="text-xs">👤</span>
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-700 block">POSTED BY</span>
                  <span className="text-xs font-black text-black leading-tight block">{customContactName}</span>
                  <span className="text-[9px] font-bold text-gray-800 block">{item.postedBy.department || 'JKKNIU Campus Member'}</span>
                </div>
              </div>
              <div className="p-2 flex items-start gap-1.5">
                <span className="text-xs">🏷️</span>
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-700 block">LISTING STATUS</span>
                  <span className="text-xs font-black text-black uppercase leading-tight block">{item.type === 'lost' ? 'LOST / MISSING' : 'FOUND / SECURED'}</span>
                  <span className="text-[9px] font-mono font-bold text-gray-700 block">Portal Log: #{item.id}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 4. Description & Distinguishing Notes */}
        <div className="border-3 border-black p-2.5 bg-white">
          <div className="flex items-center gap-1.5 mb-1 border-b border-black/30 pb-1">
            <span className="text-xs">📝</span>
            <span className="text-[10px] uppercase font-black tracking-wider text-black">
              DESCRIPTION & DISTINGUISHING MARKS
            </span>
          </div>
          <p className="text-xs leading-relaxed text-black font-bold whitespace-pre-wrap">
            {customFlyerDesc || item.description || 'Please inspect item characteristics. Claimants must provide proof of ownership.'}
          </p>
        </div>

        {/* 5. Reward Alert Banner if enabled */}
        {showReward && (
          <div className="border-3 border-dashed border-black p-2 text-center bg-amber-50">
            <div className="flex items-center justify-center gap-2">
              <span className="text-base">🎁</span>
              <span className="text-sm font-black uppercase tracking-wider text-black">
                {rewardAmount || 'REWARD OFFERED TO FINDER / TOKEN OF APPRECIATION'}
              </span>
              <span className="text-base">✨</span>
            </div>
          </div>
        )}

        {/* 6. Safe Handover & Anti-Fraud Security Notice */}
        {includeSafetyProtocol && (
          <div className="border-2 border-black p-2 bg-gray-100 flex items-start gap-2">
            <span className="text-sm shrink-0">🛡️</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-black block">
                CAMPUS SAFE RECOVERY & VERIFICATION PROTOCOL
              </span>
              <p className="text-[9px] text-gray-900 font-bold leading-tight">
                Recommended Handover Zone: <strong>{customHandoverLocation}</strong>. To claim valuable items (phones, wallets, laptops), claimants must present proof of ownership or verify secret features.
              </p>
            </div>
          </div>
        )}

        {/* 7. Footer Contact CTA with QR Code */}
        <div className="border-4 border-black p-2.5 bg-black text-white flex items-center justify-between gap-3">
          <div className="flex-1 text-left">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] mb-1 text-amber-300">
              {customCallToAction}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-bold text-white">
              <span className="flex items-center gap-1">
                <span>👤 Reporter:</span> <span>{customContactName}</span>
              </span>
              {customContactPhone && (
                <span className="flex items-center gap-1 font-mono">
                  <span>📞 Phone/WA:</span> <span className="text-amber-300 font-black">{customContactPhone}</span>
                </span>
              )}
              {customContactEmail && (
                <span className="flex items-center gap-1 col-span-2 text-[10px]">
                  <span>✉️ Email:</span> <span>{customContactEmail}</span>
                </span>
              )}
            </div>
            <p className="text-[9px] text-gray-300 mt-1 font-medium leading-tight">
              To verify item details, claim ownership, or message online: Scan QR code or search ID #{item.id} on Nazrul Retrievers portal.
            </p>
          </div>
          
          {includeQrCode && (
            <div className="bg-white p-1 rounded-xs shrink-0 text-center border-2 border-white">
              <img 
                src={flyerQrUrl} 
                alt="Scan to open post" 
                className="w-16 h-16 object-contain" 
                referrerPolicy="no-referrer" 
              />
              <span className="text-[7.5px] font-black text-black block tracking-tighter uppercase mt-0.5">
                SCAN WITH PHONE
              </span>
            </div>
          )}
        </div>

        {/* 8. Campus Emergency & Proctor Hotline Notice */}
        {includeHelplineNotice && (
          <div className="border border-black bg-gray-50 px-2 py-1 text-center text-[8.5px] font-bold text-black flex items-center justify-between">
            <span>🏛️ JKKNIU Proctorial Office & Security Help Desk</span>
            <span>📞 Campus Emergency Hotline: Gate 1 / Gate 2 Guard Desk</span>
            <span>🌐 Nazrul Retrievers Portal ID #{item.id}</span>
          </div>
        )}
      </div>

      {/* 9. Tear-off vertical Slips */}
      {includeTearSlips && (
        <div className="border-t-3 border-dashed border-black pt-1.5 mt-2">
          <div className="flex justify-between items-center text-[9px] font-black text-black uppercase tracking-widest px-1 mb-1">
            <span className="flex items-center gap-1">
              ✂ TEAR-OFF CONTACT SLIPS FOR NOTICEBOARD
            </span>
            <span>✂-- Cut along dashed lines --✂</span>
          </div>
          
          {/* 8 Slips columns */}
          <div className="grid grid-cols-8 divide-x-2 divide-dashed divide-black border-t-2 border-black">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div 
                key={idx} 
                className="px-1 py-1.5 text-center flex flex-col justify-between bg-white"
                style={{ 
                  writingMode: 'vertical-rl' as const,
                  textOrientation: 'mixed',
                  minHeight: '110px'
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-wider text-black">
                  {item.type === 'lost' ? 'LOST' : 'FOUND'}: {(customTitle || item.title || '').substring(0, 15)}
                </span>
                <span className="text-[8px] font-bold text-gray-800 mt-0.5 font-mono">
                  POST #{item.id}
                </span>
                <span className="text-[8px] font-black text-black mt-0.5">
                  {customContactName}
                </span>
                {customContactPhone && (
                  <span className="text-[8.5px] font-black text-black font-mono mt-0.5">
                    {customContactPhone}
                  </span>
                )}
                <span className="text-[7px] text-gray-600 font-mono mt-0.5">
                  nazrul-retrievers
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Actual printable layout injected into body */}
      {mounted && createPortal(printableFlyerHTML, document.body)}

      {/* Interactive Modal Screen Layer */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print animate-in fade-in duration-200">
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="flyer-modal-title"
          aria-describedby="flyer-modal-desc"
          className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-[min(calc(100vw-16px),72rem)] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden focus:outline-none"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#162137]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs shrink-0">
                <Printer aria-hidden="true" className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 id="flyer-modal-title" className="font-serif text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Flyer / Poster Customizer
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 shadow-2xs">
                    <FileText className="w-3 h-3" /> A4 Noticeboard Ready
                  </span>
                </div>
                <p id="flyer-modal-desc" className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  Customize a complete campus noticeboard flyer with QR code, security protocol, and tear-off contact slips.
                </p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              aria-label="Close flyer customizer dialog"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X aria-hidden="true" className="w-5 h-5" />
            </button>
          </div>

          {/* Dual Panel Body: Controls (Left) & Simulated A4 Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] overflow-y-auto flex-grow">
            
            {/* Customizer controls (Left Panel) */}
            <div className="p-4 sm:p-6 border-r border-slate-200 dark:border-slate-800 space-y-5 overflow-y-auto max-h-[60vh] lg:max-h-none bg-white dark:bg-[#111A2E]">
              
              {/* SECTION 1: THEME COLOR PALETTE PICKER */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    <Palette className="w-4 h-4 text-amber-500" />
                    <span>Poster Color Scheme</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {currentTheme.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(THEME_CONFIGS) as PosterTheme[]).map((themeKey) => {
                    const t = THEME_CONFIGS[themeKey];
                    const isSelected = posterTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setPosterTheme(themeKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                            : 'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${t.bannerBg} shrink-0 border border-black/10 shadow-2xs`} />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: HEADLINE & TITLE CONTROLS */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
                      <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                      <span>Primary Poster Headline</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">Main Ribbon</span>
                  </div>

                  <input 
                    type="text" 
                    value={customHeadline}
                    onChange={(e) => setCustomHeadline(e.target.value)}
                    placeholder={item.type === 'lost' ? 'LOST PROPERTY' : 'FOUND PROPERTY'}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                  />

                  {/* Quick Preset Headlines */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500">Presets:</span>
                    {[
                      item.type === 'lost' ? 'LOST PROPERTY' : 'FOUND PROPERTY',
                      'URGENT - LOST',
                      'ATTENTION STUDENTS',
                      'REWARD OFFERED',
                      'CAMPUS NOTICE'
                    ].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCustomHeadline(preset)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border transition-all cursor-pointer ${
                          customHeadline === preset
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item Display Title */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Item Title for Poster</span>
                  </label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* SECTION 3: LOCATION & CONTACT DETAILS */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                {/* Location */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Campus Location / Drop Point</span>
                  </label>
                  <input 
                    type="text" 
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="e.g., Central Library 2nd Floor, TSC Cafeteria, etc."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                  />
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Reporter Name</span>
                    </label>
                    <input 
                      type="text" 
                      value={customContactName}
                      onChange={(e) => setCustomContactName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Contact Phone</span>
                    </label>
                    <input 
                      type="text" 
                      value={customContactPhone}
                      onChange={(e) => setCustomContactPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                    />
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-500" />
                    <span>Contact Email (Optional)</span>
                  </label>
                  <input 
                    type="email" 
                    value={customContactEmail}
                    onChange={(e) => setCustomContactEmail(e.target.value)}
                    placeholder="student@jkkniu.edu.bd"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* SECTION 4: SAFE HANDOVER LOCATION & PROTOCOL */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Safe Handover Location / Desk</span>
                  </label>
                  <input 
                    type="text" 
                    value={customHandoverLocation}
                    onChange={(e) => setCustomHandoverLocation(e.target.value)}
                    placeholder="e.g. Proctorial Office, Central Library Desk, TSC"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                  />

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500">Presets:</span>
                    {[
                      'Proctorial Office / Central Library Front Desk',
                      'TSC Ground Floor Student Center',
                      'Central Library Circulation Desk',
                      'Respective Hall Proctorial Office',
                      'Direct Handover upon Verification'
                    ].map(hPreset => (
                      <button
                        key={hPreset}
                        type="button"
                        onClick={() => setCustomHandoverLocation(hPreset)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border transition-all cursor-pointer ${
                          customHandoverLocation === hPreset
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        {hPreset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Call to Action */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                    <span>Call to Action Banner</span>
                  </label>
                  <input 
                    type="text" 
                    value={customCallToAction}
                    onChange={(e) => setCustomCallToAction(e.target.value)}
                    placeholder="PLEASE CONTACT IF FOUND / RETURN TO PROCTOR"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                  />
                  
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500">Presets:</span>
                    {[
                      item.type === 'lost' ? 'PLEASE CONTACT IF FOUND' : 'CONTACT TO CLAIM YOUR ITEM',
                      'RETURN TO PROCTOR OFFICE',
                      'SAFE HANDOVER AT TSC',
                      'DROP AT CENTRAL LIBRARY DESK'
                    ].map(cta => (
                      <button
                        key={cta}
                        type="button"
                        onClick={() => setCustomCallToAction(cta)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border transition-all cursor-pointer ${
                          customCallToAction === cta
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                        }`}
                      >
                        {cta}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 5: DESCRIPTION & DISTINGUISHING MARKS */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Distinguishing Marks & Description</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Color, brand, stickers</span>
                </div>
                <textarea 
                  value={customFlyerDesc}
                  onChange={(e) => setCustomFlyerDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-950 dark:text-white placeholder-slate-400 leading-relaxed resize-none shadow-xs"
                />
              </div>

              {/* SECTION 6: REWARD BANNER TOGGLE */}
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl border border-amber-300 dark:border-amber-700/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        Include Reward / Appreciation Banner
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        Adds a high-visibility reward banner across the poster
                      </span>
                    </div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={showReward}
                      onChange={(e) => setShowReward(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                  </label>
                </div>

                {showReward && (
                  <div className="pt-3 border-t border-amber-200 dark:border-amber-800/60 space-y-2 animate-in fade-in duration-150">
                    <input 
                      type="text" 
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      placeholder="e.g., REWARD OFFERED: ৳500 / Treat at TSC"
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 text-slate-950 dark:text-white placeholder-slate-400 shadow-xs"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['৳200 Cash', '৳500 Cash Reward', '৳1000 Cash', 'Treat at TSC Cafeteria', 'Token of Gratitude'].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setRewardAmount(chip)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 hover:bg-amber-200 border border-amber-300/60 cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 7: TOGGLES FOR QR CODE, TEAR-OFF SLIPS, SECURITY & HELPLINE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* QR Code Toggle */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Mobile QR Code
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Scan to open listing
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={includeQrCode}
                      onChange={(e) => setIncludeQrCode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                  </label>
                </div>

                {/* Tear-Off Slips Toggle */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Tear-Off Slips (8 Tabs)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        For noticeboards
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={includeTearSlips}
                      onChange={(e) => setIncludeTearSlips(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                  </label>
                </div>

                {/* Safe Protocol Toggle */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Safe Handover Protocol
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Campus safe zones
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={includeSafetyProtocol}
                      onChange={(e) => setIncludeSafetyProtocol(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                  </label>
                </div>

                {/* Helpline Notice Toggle */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Campus Emergency Helpline
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Proctorial Office info
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={includeHelplineNotice}
                      onChange={(e) => setIncludeHelplineNotice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                  </label>
                </div>
              </div>

            </div>

            {/* Simulated Live Paper Preview (Right Panel) */}
            <div className="bg-slate-100/90 dark:bg-slate-900/80 p-4 sm:p-6 flex flex-col items-center justify-between border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
              
              <div className="w-full flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Live A4 Poster Preview
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                    Standard A4 • 210×297mm
                  </span>
                </div>
              </div>
              
              {/* Scaled A4 representation container - balanced vertical layout without dead space */}
              <div 
                className="bg-white text-black border-2 border-slate-400 dark:border-slate-700 shadow-2xl w-[320px] sm:w-[350px] min-h-[500px] p-2.5 flex flex-col justify-between overflow-hidden select-none rounded-sm relative transition-all"
                style={{ fontSize: '7.5px' }}
              >
                {/* Miniature Poster content */}
                <div className="flex flex-col flex-grow justify-between gap-1.5">
                  
                  {/* Top Header */}
                  <div className="text-center border-2 border-black p-1 bg-white rounded-xs">
                    <div className="flex items-center justify-between text-[5px] font-black uppercase tracking-[0.18em] text-gray-800 border-b border-black/30 pb-0.5 mb-1 px-0.5">
                      <span>🏛️ JKKNIU CAMPUS NOTICE</span>
                      <span className="font-mono">ID #{item.id}</span>
                    </div>
                    
                    {/* Themed Main Banner in Preview */}
                    <div className={`text-sm font-black uppercase py-0.5 px-2 rounded-xs shadow-2xs ${currentTheme.bannerBg} ${currentTheme.bannerText} border ${currentTheme.bannerBorder}`}>
                      {(customHeadline || '').substring(0, 20)}
                    </div>
                  </div>

                  {/* Title & Category Tags */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <span className="text-[5.5px] font-black uppercase tracking-wider bg-gray-200 text-black px-1.5 py-0.2 rounded-xs border border-black/30">
                        {item.category || 'General'}
                      </span>
                      <span className="text-[5.5px] font-black uppercase tracking-wider bg-gray-100 text-black px-1.5 py-0.2 rounded-xs border border-black/30">
                        {item.location || 'Campus'}
                      </span>
                      <span className="text-[5.5px] font-mono font-bold bg-gray-100 text-black px-1.5 py-0.2 rounded-xs border border-black/30">
                        #{item.id}
                      </span>
                    </div>
                    <span className="text-[10px] font-serif font-black uppercase text-black leading-tight block truncate">
                      {customTitle || item.title}
                    </span>
                  </div>

                  {/* Visual & Quick Info row */}
                  <div className="grid grid-cols-[64px_1fr] gap-1.5 items-stretch">
                    {/* Visual */}
                    <div className="border border-black w-16 h-16 flex items-center justify-center bg-gray-50 rounded-xs overflow-hidden p-0.5">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center">
                          <span className="text-xl block">{item.emoji || (item.type === 'lost' ? '🎒' : '🔑')}</span>
                          <span className="text-[5px] font-black uppercase block mt-0.5">Official Log</span>
                        </div>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div className="border border-black divide-y divide-black text-[5.5px] font-bold bg-white flex flex-col justify-between">
                      <div className="grid grid-cols-2 divide-x divide-black p-0.5">
                        <span className="truncate pl-0.5 font-bold flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0 text-red-600" /> {customLocation}
                        </span>
                        <span className="truncate pl-0.5 font-bold flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5 shrink-0 text-blue-600" /> {formattedDate}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-black p-0.5">
                        <span className="truncate pl-0.5 font-bold flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5 shrink-0 text-indigo-600" /> {customContactName}
                        </span>
                        <span className="truncate pl-0.5 font-mono font-bold flex items-center gap-0.5">
                          <Hash className="w-2.5 h-2.5 shrink-0 text-amber-600" /> #{item.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="border border-black p-1 text-[5.5px] leading-relaxed truncate overflow-hidden font-semibold bg-white max-h-11">
                    <span className="font-bold text-gray-800">DETAILS: </span>
                    {customFlyerDesc || item.description || 'Details registered on Nazrul Retrievers campus portal.'}
                  </div>

                  {/* Reward block */}
                  {showReward && (
                    <div className="border border-dashed border-black p-0.5 text-center bg-amber-50 text-[6px] font-black uppercase flex items-center justify-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                      <span>{rewardAmount || 'REWARD OFFERED TO FINDER'}</span>
                      <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                    </div>
                  )}

                  {/* Safe Handover Preview */}
                  {includeSafetyProtocol && (
                    <div className="border border-black p-1 bg-gray-100 text-[5px] leading-tight">
                      <span className="font-black text-black block">🔒 SAFE RECOVERY PROTOCOL:</span>
                      <span className="text-gray-900 font-bold truncate block">Handover Desk: {customHandoverLocation}</span>
                    </div>
                  )}

                  {/* Contact details bottom banner with QR */}
                  <div className="border border-black p-1 bg-black text-white text-[5.5px] font-bold flex items-center justify-between gap-1">
                    <div className="flex-1 text-left truncate">
                      <span className="block text-[6.5px] font-black text-amber-300 uppercase truncate">
                        {customCallToAction}
                      </span>
                      <span className="block truncate text-[5.5px]">
                        Contact: {customContactName} {customContactPhone ? `| ${customContactPhone}` : ''}
                      </span>
                      <span className="block text-[4.5px] text-gray-300">
                        Scan QR code to verify or chat online
                      </span>
                    </div>
                    {includeQrCode && (
                      <div className="bg-white p-0.5 rounded-xs shrink-0">
                        <img 
                          src={flyerQrUrl} 
                          alt="QR" 
                          className="w-7 h-7 object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Emergency Helpline in Preview */}
                  {includeHelplineNotice && (
                    <div className="border border-black bg-gray-50 px-1 py-0.5 text-center text-[4.5px] font-bold text-black flex justify-between">
                      <span>🏛️ Proctorial Office Helpline</span>
                      <span>Gate 1 & 2 Security</span>
                      <span>Portal ID #{item.id}</span>
                    </div>
                  )}
                </div>

                {/* Micro Slips Preview */}
                {includeTearSlips && (
                  <div className="border-t border-dashed border-black pt-1 mt-1">
                    <div className="flex justify-between items-center text-[4.5px] text-gray-700 font-black mb-0.5">
                      <span className="flex items-center gap-0.5"><Scissors className="w-2 h-2" /> TEAR-OFF SLIPS</span>
                      <span>✂-- Cut lines --✂</span>
                    </div>
                    <div className="grid grid-cols-8 divide-x divide-dashed divide-black border-t border-black pt-0.5">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="text-[3.5px] text-center flex flex-col items-center justify-between font-bold text-black" style={{ writingMode: 'vertical-rl', height: '36px' }}>
                          <span className="font-black">{(customTitle || item.title || '').substring(0, 7)}</span>
                          <span className="font-mono text-[3px]">{customContactPhone ? customContactPhone.slice(-6) : `#${item.id}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Print Note */}
              <div className="text-center mt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" /> Formatted for university noticeboards & photocopy centers
                </span>
              </div>

            </div>

          </div>

          {/* Actions Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#162137] flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:text-white text-xs sm:text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
            
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print / Save A4 Poster (PDF)</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
