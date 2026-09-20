import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Search, 
  ArrowRight, 
  UserPlus, 
  Eye, 
  Gift, 
  ShieldAlert, 
  HeartHandshake, 
  BellRing, 
  UserCheck, 
  ShieldCheck, 
  History, 
  Clock, 
  MapPin, 
  Sparkles, 
  Heart, 
  Check,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  Shield,
  X,
  HelpCircle,
  Send,
  Sparkle
} from 'lucide-react';
import { validateSupportContact } from '../utils/validation';
import { apiFetch } from '../utils/api';

interface LandingPageProps {
  onTabChange: (tab: string) => void;
  onPostTypeToggle: (type: 'lost' | 'found') => void;
}

export default function LandingPage({ onTabChange, onPostTypeToggle }: LandingPageProps) {
  const [reunited, setReunited] = useState(847);
  const [activeStudents, setActiveStudents] = useState(2400);
  const [recoveryRate, setRecoveryRate] = useState(92);
  const statsRef = useRef<HTMLDivElement>(null);

  const [heroSearch, setHeroSearch] = useState('');

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // State for Contact form inside contact modal
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    if (!contactName || !contactEmail || !contactMessage) {
      setContactError('Please fill in all fields.');
      return;
    }

    const validationErr = validateSupportContact({
      name: contactName,
      email: contactEmail,
      message: contactMessage
    });

    if (validationErr) {
      setContactError(validationErr);
      return;
    }

    setIsSubmittingContact(true);
    try {
      await apiFetch('/auth/contact', {
        method: 'POST',
        bodyData: {
          name: contactName,
          email: contactEmail,
          message: contactMessage
        }
      });
      setContactSubmitted(true);
      setTimeout(() => {
        setContactSubmitted(false);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
        setContactError('');
        setShowContactModal(false);
      }, 2500);
    } catch (err: any) {
      setContactError(err.message || 'An error occurred while sending your message. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  useEffect(() => {
    const reunitedTarget = 847;
    const studentsTarget = 2400;
    const rateTarget = 92;

    const duration = 1200; // ms
    const steps = 40;
    const intervalTime = duration / steps;

    let timer: NodeJS.Timeout | null = null;
    let hasAnimated = false;

    const startAnimation = () => {
      if (hasAnimated) return;
      hasAnimated = true;
      if (timer) clearInterval(timer);
      let step = 0;
      setReunited(0);
      setActiveStudents(0);
      setRecoveryRate(0);

      timer = setInterval(() => {
        step++;
        setReunited(Math.min(Math.floor((reunitedTarget / steps) * step), reunitedTarget));
        setActiveStudents(Math.min(Math.floor((studentsTarget / steps) * step), studentsTarget));
        setRecoveryRate(Math.min(Math.floor((rateTarget / steps) * step), rateTarget));

        if (step >= steps) {
          if (timer) clearInterval(timer);
          setReunited(reunitedTarget);
          setActiveStudents(studentsTarget);
          setRecoveryRate(rateTarget);
        }
      }, intervalTime);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          startAnimation();
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#F1E9DA] dark:from-[#080C14] dark:via-[#0D1117] dark:to-[#0A0F1D] hero-grid-lines min-h-[calc(100vh-110px)] flex items-center py-12 md:py-20 lg:py-24 transition-colors duration-300">
        {/* Background ambient orbs */}
        <div className="absolute pointer-events-none rounded-full filter blur-[120px] w-[500px] h-[500px] bg-amber-400/20 dark:bg-amber-500/10 -top-[100px] -right-[100px] transition-colors duration-300" />
        <div className="absolute pointer-events-none rounded-full filter blur-[120px] w-[400px] h-[400px] bg-emerald-500/15 dark:bg-emerald-600/10 -bottom-[80px] -left-[80px] transition-colors duration-300" />

        <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 md:px-12 relative z-10 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Text, Search & CTAs (7 Cols on desktop for generous typography room) */}
            <div className="lg:col-span-7 flex flex-col justify-center text-left">
              {/* Official Campus Hub Badge */}
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/30 px-4 py-2 rounded-full text-xs font-extrabold tracking-wider uppercase mb-6 shadow-xs w-fit backdrop-blur-xs transition-colors duration-300">
                <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>Official JKKNIU Campus Lost &amp; Found Hub</span>
              </div>
              
              {/* Main Headline */}
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[54px] xl:text-[58px] font-extrabold text-slate-900 dark:text-white leading-[1.12] mb-5 tracking-tight transition-colors duration-300">
                Find What You <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 dark:from-amber-400 dark:via-amber-300 dark:to-amber-500 bg-clip-text text-transparent">Lost.</span><br />
                Return What You Found.
              </h1>
              
              {/* Subheading / Description */}
              <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-[540px] mb-7 transition-colors duration-300">
                Nazrul Retrievers connects the entire JKKNIU campus community — report missing items, discover lost belongings, and reunite with what matters most.
              </p>

              {/* Quick Interactive Search Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  onTabChange('listing');
                }}
                className="w-full max-w-[530px] mb-7 flex items-center bg-white dark:bg-[#131B2C] border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-1.5 shadow-md shadow-slate-200/60 dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)] focus-within:border-amber-500 dark:focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/20 transition-all duration-300"
              >
                <div className="pl-3.5 pr-2 text-amber-500">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search for lost keys, ID card, wallet, phone..."
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-2.5"
                />
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex-shrink-0"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </form>

              {/* 3 Prominent Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 w-full">
                {/* 1. I Lost Something */}
                <button 
                  onClick={() => {
                    onPostTypeToggle('lost');
                    onTabChange('post');
                  }}
                  className="w-full sm:w-auto justify-center inline-flex items-center gap-2.5 px-5 sm:px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md hover:shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer border border-amber-300/40"
                >
                  <Megaphone className="w-4 h-4 stroke-[2.5]" />
                  <span>I Lost Something</span>
                </button>

                {/* 2. I Found Something */}
                <button 
                  onClick={() => {
                    onPostTypeToggle('found');
                    onTabChange('post');
                  }}
                  className="w-full sm:w-auto justify-center inline-flex items-center gap-2.5 px-5 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer border border-emerald-400/30"
                >
                  <HeartHandshake className="w-4 h-4 stroke-[2.5]" />
                  <span>I Found Something</span>
                </button>

                {/* 3. Browse All Items */}
                <button 
                  onClick={() => onTabChange('listing')}
                  className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-5 sm:px-6 py-3.5 bg-white/95 hover:bg-white text-slate-800 hover:text-amber-800 border border-slate-300/90 hover:border-amber-400/80 rounded-xl shadow-xs hover:shadow-md shadow-slate-200/50 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs sm:text-sm font-bold cursor-pointer dark:bg-[#131B2C] dark:hover:bg-[#1A243B] dark:text-slate-200 dark:border-slate-700/70 dark:hover:border-amber-400/70 dark:hover:text-amber-300 dark:shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
                >
                  <Eye className="w-4 h-4" />
                  <span>Browse All Items</span>
                </button>
              </div>
            </div>

            {/* Right Column: Staggered Elegant Showcase (5 Cols on desktop) */}
            <div className="lg:col-span-5 relative w-full max-w-[480px] mx-auto flex items-center justify-center mt-6 lg:mt-0 p-1 sm:p-2">
              {/* Ambient glows for professional depth styling */}
              <div className="absolute top-[10%] left-[10%] w-72 h-72 rounded-full bg-amber-400/15 dark:bg-amber-500/10 filter blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />
              <div className="absolute bottom-[10%] right-[5%] w-64 h-64 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 filter blur-[100px] pointer-events-none animate-pulse duration-[4500ms]" />
              
              {/* Organized Grid */}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3.5 sm:gap-4 w-full relative z-10">
                
                {/* Column 1: Lost Item Showcase */}
                <div className="flex flex-col gap-3.5 sm:gap-4">
                  {/* Item Returned Success Banner */}
                  <div className="bg-white/95 dark:bg-[#131B2C]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/70 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-md shadow-slate-200/60 dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)] hover:scale-105 transition-all duration-300">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Heart className="w-5 h-5 fill-current" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-slate-900 dark:text-white text-xs sm:text-sm font-extrabold leading-tight">Reunited!</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] truncate mt-0.5">Casio Watch · 15m ago</span>
                    </div>
                  </div>

                  {/* Lost Card: Sleek Premium Backpack */}
                  <div className="bg-white dark:bg-[#131B2C] border border-slate-200/90 dark:border-slate-700/70 rounded-[22px] p-3.5 sm:p-4 shadow-md shadow-slate-200/60 dark:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.5),0_4px_10px_-2px_rgba(0,0,0,0.3)] hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-200/80 dark:hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.7)] transition-all duration-300 group/backpack flex flex-col">
                    {/* Image Container */}
                    <div className="relative w-full h-32 sm:h-38 bg-slate-50 dark:bg-[#0B101E] rounded-xl overflow-hidden mb-3 border border-slate-100 dark:border-slate-800/80 shadow-xs dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center p-2">
                      <img 
                        src="https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&q=80&w=600" 
                        alt="Sleek Minimalist Leather Backpack" 
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-full object-contain drop-shadow-md group-hover/backpack:drop-shadow-xl group-hover/backpack:scale-110 transition-all duration-500 ease-out"
                      />
                    </div>
                    
                    {/* Meta details */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">Lost</span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-[11px] font-medium">2h ago</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-slate-900 dark:text-white text-xs sm:text-sm font-bold text-left mb-1.5 group-hover/backpack:text-amber-600 dark:group-hover/backpack:text-amber-400 transition-colors duration-200 truncate">
                      Sleek Tech Backpack
                    </h3>

                    {/* Location with Red pulse dot */}
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs text-left">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="truncate">Singhara house</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Found Item Showcase with offset layout */}
                <div className="flex flex-col gap-3.5 sm:gap-4 min-[420px]:pt-8 pt-0">
                  {/* Found Card: Luxury Silver Watch */}
                  <div className="bg-white dark:bg-[#131B2C] border border-slate-200/90 dark:border-slate-700/70 rounded-[22px] p-3.5 sm:p-4 shadow-md shadow-slate-200/60 dark:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.5),0_4px_10px_-2px_rgba(0,0,0,0.3)] hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-200/80 dark:hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.7)] transition-all duration-300 group/watch flex flex-col">
                    {/* Image Container */}
                    <div className="relative w-full h-32 sm:h-38 bg-slate-50 dark:bg-[#0B101E] rounded-xl overflow-hidden mb-3 border border-slate-100 dark:border-slate-800/80 shadow-xs dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center p-2">
                      <img 
                        src="https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=600" 
                        alt="Luxury Silver Watch" 
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-full object-contain drop-shadow-md group-hover/watch:drop-shadow-xl group-hover/watch:scale-110 transition-all duration-500 ease-out"
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">Found</span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-[11px] font-medium">1d ago</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-slate-900 dark:text-white text-xs sm:text-sm font-bold text-left mb-1.5 group-hover/watch:text-amber-600 dark:group-hover/watch:text-amber-400 transition-colors duration-200 truncate">
                      Chrono Silver Watch
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs text-left">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                      <span className="truncate">Central Mosque</span>
                    </div>
                  </div>

                  {/* Match Found Alert Banner */}
                  <div className="bg-white/95 dark:bg-[#131B2C]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/70 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-md shadow-slate-200/60 dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)] hover:scale-105 transition-all duration-300">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check className="w-5 h-5 stroke-[3px]" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-slate-900 dark:text-white text-xs sm:text-sm font-extrabold leading-tight">Match Found!</span>
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] sm:text-[11px] font-bold mt-0.5 leading-none truncate">Pending meetup</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Statistics Bar (Full Width Below) */}
          <motion.div 
            ref={statsRef}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  staggerChildren: 0.1,
                  duration: 0.6,
                  ease: 'easeOut'
                }
              }
            }}
            className="mt-12 md:mt-18 lg:mt-20 p-4 sm:p-6 lg:p-7 bg-white/95 dark:bg-[#131B2C]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/70 rounded-3xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 items-center shadow-lg shadow-slate-200/60 dark:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.5)] relative overflow-hidden group/bar transition-colors duration-300"
          >
            {/* Subtle glow background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-1000 pointer-events-none" />

            {/* Stat 1 */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer transition-all duration-300 min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-xs transition-transform duration-300">
                <Gift className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-slate-900 dark:text-white text-base sm:text-lg md:text-xl lg:text-2xl font-black leading-tight font-mono">{reunited}+</span>
                <span className="block text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold mt-0.5 truncate">Items Found</span>
              </div>
            </motion.div>

            {/* Stat 2 */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="flex items-center gap-2.5 sm:gap-3.5 border-l border-slate-200/80 dark:border-slate-700/60 pl-2.5 sm:pl-4 md:pl-6 cursor-pointer transition-all duration-300 min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-xs transition-transform duration-300">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-slate-900 dark:text-white text-base sm:text-lg md:text-xl lg:text-2xl font-black leading-tight font-mono">
                  {activeStudents > 1000 ? `${(activeStudents / 1000).toFixed(1)}K+` : `${activeStudents}+`}
                </span>
                <span className="block text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold mt-0.5 truncate">Active Users</span>
              </div>
            </motion.div>

            {/* Stat 3 */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="flex items-center gap-2.5 sm:gap-3.5 border-l border-slate-200/80 dark:border-slate-700/60 pl-2.5 sm:pl-4 md:pl-6 cursor-pointer transition-all duration-300 min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-xs transition-transform duration-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-slate-900 dark:text-white text-base sm:text-lg md:text-xl lg:text-2xl font-black leading-tight font-mono">{recoveryRate}%</span>
                <span className="block text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold mt-0.5 truncate">Return Rate</span>
              </div>
            </motion.div>

            {/* Stat 4 */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="flex items-center gap-2.5 sm:gap-3.5 border-l border-slate-200/80 dark:border-slate-700/60 pl-2.5 sm:pl-4 md:pl-6 cursor-pointer transition-all duration-300 min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-xs transition-transform duration-300">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-slate-900 dark:text-white text-base sm:text-lg md:text-xl lg:text-2xl font-black leading-tight font-mono">24/7</span>
                <span className="block text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold mt-0.5 truncate">Support</span>
              </div>
            </motion.div>

            {/* Stat 5 */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="flex items-center gap-2.5 sm:gap-3.5 border-l border-slate-200/80 dark:border-slate-700/60 pl-2.5 sm:pl-4 md:pl-6 col-span-2 sm:col-span-1 lg:col-span-1 cursor-pointer transition-all duration-300 min-w-0"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-xs transition-transform duration-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-slate-900 dark:text-white text-base sm:text-lg md:text-xl lg:text-2xl font-black leading-tight truncate">JKKNIU</span>
                <span className="block text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold mt-0.5 truncate">Campus</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#FBFBFD] dark:bg-[#0B0F19] border-t border-b border-slate-200/80 dark:border-slate-800/80 py-20 px-6 md:px-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-3 border border-amber-300/70 dark:border-amber-400/20">
              Platform Features
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Everything You Need</h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-light">
              A complete lost &amp; found solution built from the ground up for the JKKNIU student community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-[#131B2C] border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-slate-200/60 dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] hover:border-amber-400/50 dark:hover:border-amber-400/50 hover:-translate-y-1 transition-all group duration-300">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/60 rounded-xl flex items-center justify-center text-xl mb-6 shadow-xs">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-3">Report in 60 Seconds</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
                Post missing or found items with custom photos, precise categories, campus spots, and timing guidelines.
              </p>
            </div>

            <div className="bg-white dark:bg-[#131B2C] border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-slate-200/60 dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] hover:border-amber-400/50 dark:hover:border-amber-400/50 hover:-translate-y-1 transition-all group duration-300">
              <div className="w-14 h-14 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700/60 rounded-xl flex items-center justify-center text-xl mb-6 shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-3">Smart Search &amp; Filter</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
                Filter instantaneously by active category, specific building location, reported timeframes, or lost/found tags.
              </p>
            </div>

            <div className="bg-white dark:bg-[#131B2C] border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-slate-200/60 dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] hover:border-amber-400/50 dark:hover:border-amber-400/50 hover:-translate-y-1 transition-all group duration-300">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/60 rounded-xl flex items-center justify-center text-xl mb-6 shadow-xs">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-3">Direct Messaging</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
                Initiate secured chats with finders or owners safely inside the platform. No private phone numbers required.
              </p>
            </div>

            <div className="bg-white dark:bg-[#131B2C] border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-slate-200/60 dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] hover:border-amber-400/50 dark:hover:border-amber-400/50 hover:-translate-y-1 transition-all group duration-300">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/60 rounded-xl flex items-center justify-center text-xl mb-6 shadow-xs">
                <BellRing className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-3">Real-time Alerts</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
                Receive visual notification indicators instantly as soon as someone interacts with your reports or matches your criteria.
              </p>
            </div>

            <div className="bg-white dark:bg-[#131B2C] border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-slate-200/60 dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] hover:border-amber-400/50 dark:hover:border-amber-400/50 hover:-translate-y-1 transition-all group duration-300">
              <div className="w-14 h-14 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/60 rounded-xl flex items-center justify-center text-xl mb-6 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-3">Admin Moderation</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
                All uploaded listings undergo rapid JKKNIU student coordinators/moderators verification to secure a spam-free listing.
              </p>
            </div>

            <div className="bg-white dark:bg-[#131B2C] border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-slate-200/60 dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] hover:border-amber-400/50 dark:hover:border-amber-400/50 hover:-translate-y-1 transition-all group duration-300">
              <div className="w-14 h-14 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-700/60 rounded-xl flex items-center justify-center text-xl mb-6 shadow-xs">
                <History className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-3">Status Tracking</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
                Track posted items step-by-step from 'Active' → 'Claimed' → 'Returned' with visible timeline audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-[#0D1B2A] dark:via-[#152335] dark:to-[#0A111A] border-y border-amber-200/60 dark:border-slate-800/80 text-center py-24 px-6 relative overflow-hidden transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(201,150,63,0.15)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
            Lost something? Don't panic.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-light mb-10 leading-relaxed">
            Thousands of your fellow students are online. Create your account and post details — someone might already have registered it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 justify-center items-center max-w-md mx-auto sm:max-w-none">
            <button 
              onClick={() => onTabChange('register')}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md hover:shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm cursor-pointer border border-amber-300/40"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Free Account</span>
            </button>
            <button 
              onClick={() => onTabChange('listing')}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300/90 shadow-xs hover:shadow-md shadow-slate-200/50 hover:border-amber-400/80 rounded-xl dark:bg-[#131B2C] dark:text-slate-200 dark:border-slate-700/70 dark:hover:bg-[#1A243B] dark:hover:border-amber-400/60 dark:hover:text-amber-300 dark:shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-all text-sm font-bold cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>View All Listings</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 dark:bg-[#070B14] text-slate-400 dark:text-white/60 py-16 px-6 md:px-12 border-t border-slate-800 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xs">
                <Search className="w-4 h-4 text-[#0D1B2A] stroke-[2.5]" />
              </div>
              <span className="font-serif text-lg font-black text-white">Nazrul Retrievers</span>
            </div>
            <p className="text-xs sm:text-sm font-light leading-relaxed max-w-[260px] mb-6 text-slate-400">
              The official, central lost &amp; found registry connecting campus community members at JKKNIU daily.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-amber-400/20 hover:text-amber-400 flex items-center justify-center shadow-xs hover:shadow-sm transition-all duration-300 border border-white/10" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-amber-400/20 hover:text-amber-400 flex items-center justify-center shadow-xs hover:shadow-sm transition-all duration-300 border border-white/10" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-amber-400/20 hover:text-amber-400 flex items-center justify-center shadow-xs hover:shadow-sm transition-all duration-300 border border-white/10" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-amber-400/20 hover:text-amber-400 flex items-center justify-center shadow-xs hover:shadow-sm transition-all duration-300 border border-white/10" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-amber-400/20 hover:text-amber-400 flex items-center justify-center shadow-xs hover:shadow-sm transition-all duration-300 border border-white/10" aria-label="YouTube">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-sm font-black text-white uppercase tracking-wider mb-5">Quick Links</h4>
            <div className="flex flex-col gap-3 text-xs sm:text-sm items-start">
              <button onClick={() => onTabChange('listing')} className="text-left text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">Browse Listings</button>
              <button onClick={() => { onPostTypeToggle('lost'); onTabChange('post'); }} className="text-left text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">Report Lost Item</button>
              <button onClick={() => { onPostTypeToggle('found'); onTabChange('post'); }} className="text-left text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">Report Found Item</button>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-sm font-black text-white uppercase tracking-wider mb-5">Support &amp; Helpline</h4>
            <div className="flex flex-col gap-3 text-xs sm:text-sm items-start text-slate-300">
              <button onClick={() => setShowContactModal(true)} className="text-left font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Contact Support Form
              </button>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Helpline: <a href="tel:01410073315" className="hover:text-amber-400 hover:underline transition-colors text-slate-300">01410073315</a></span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">Email: <a href="mailto:nazrulretrievers@gmail.com" className="hover:text-amber-400 hover:underline transition-colors truncate text-slate-300">nazrulretrievers@gmail.com</a></span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-sm font-black text-white uppercase tracking-wider mb-5">Legal</h4>
            <div className="flex flex-col gap-3 text-xs sm:text-sm items-start">
              <button onClick={() => setShowPrivacyModal(true)} className="text-left text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">Privacy Policy</button>
              <button onClick={() => setShowContactModal(true)} className="text-left text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">Contact Us</button>
              <button onClick={() => setShowTermsModal(true)} className="text-left text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">Terms of Service</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>© 2026 Nazrul Retrievers: Campus Lost and Found</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <button onClick={() => setShowPrivacyModal(true)} className="hover:text-amber-400 transition-colors cursor-pointer">Privacy Policy</button>
            <button onClick={() => setShowTermsModal(true)} className="hover:text-amber-400 transition-colors cursor-pointer">Terms of Service</button>
            <button onClick={() => setShowContactModal(true)} className="hover:text-amber-400 transition-colors cursor-pointer">Contact Us</button>
            <span>Built with <span className="text-amber-400 animate-pulse font-bold">♥</span> for JKKNIU Students</span>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacyModal(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-[min(calc(100vw-24px),42rem)] bg-white dark:bg-[#111A2E] rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">JKKNIU Platform Guidelines</span>
                  <h3 className="font-serif text-2xl font-black text-slate-900 dark:text-white">Privacy &amp; Trust Policy</h3>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed overflow-y-auto pr-2">
                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">1. Information We Collect</h4>
                  <p className="font-light text-left">
                    We keep data minimal to preserve absolute confidentiality. We only collect details essential for establishing item matches: item title, photo, location, approximate date, description, and the claimant/finder contact credentials (email or phone number) as specified by you.
                  </p>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">2. Campus Verification &amp; Security</h4>
                  <p className="font-light text-left">
                    To prevent harassment and scam postings, our JKKNIU student administrators monitor listings. We do not expose physical hostel room numbers or private identification numbers publicly; matches are facilitated in secure campus landmarks such as the Cafeteria Hub or security desk.
                  </p>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">3. Auto-Archiving System</h4>
                  <p className="font-light text-left">
                    Once an item's state transitions to "Returned", all related public bulletin entries and messages are securely archived or deleted from the main feed within 30 days to clear metadata and protect student identities.
                  </p>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">4. Absolute Control</h4>
                  <p className="font-light text-left">
                    You maintain complete ownership of your postings. You can update details, toggle status, or remove any reported items entirely at any time through your personal developer/student dashboard.
                  </p>
                </div>
              </div>

              {/* Divider & Close button */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button 
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermsModal(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-[min(calc(100vw-24px),42rem)] bg-white dark:bg-[#111A2E] rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowTermsModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">JKKNIU Platform Guidelines</span>
                  <h3 className="font-serif text-2xl font-black text-slate-900 dark:text-white">Terms of Service</h3>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed overflow-y-auto pr-2 text-left">
                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">1. Acceptable Use</h4>
                  <p className="font-light text-left">
                    Our platform is exclusively dedicated to assisting members of Jatiya Kabi Kazi Nazrul Islam University (JKKNIU) in reclaiming lost belongings or returning found items. Listings must be genuine and accurate.
                  </p>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">2. Verification Requirement</h4>
                  <p className="font-light text-left">
                    Users should complete their profile details (Student ID, Department, Session) to obtain verified status, which promotes security and authenticity within our community.
                  </p>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">3. Prohibited Content</h4>
                  <p className="font-light text-left">
                    Any spam, duplicate listings, commercial advertising, or items not matching JKKNIU's lost and found policy will be moderated and deleted instantly.
                  </p>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-slate-900 dark:text-white mb-2">4. Handover Safety</h4>
                  <p className="font-light text-left">
                    All handovers should happen on campus in broad daylight in public areas or at the security desk. The platform is not responsible for physical handovers or safety disputes.
                  </p>
                </div>
              </div>

              {/* Divider & Close button */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button 
                  onClick={() => setShowTermsModal(false)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Us Modal */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContactModal(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-[min(calc(100vw-24px),42rem)] bg-white dark:bg-[#111A2E] rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowContactModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">JKKNIU Helpdesk</span>
                  <h3 className="font-serif text-2xl font-black text-slate-900 dark:text-white">Contact Support</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8 overflow-y-auto pr-1">
                {/* Info Column */}
                <div className="md:col-span-2 space-y-6 text-left">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                    Have questions about an item? Or need moderator assistance with verification? Reach out directly.
                  </p>

                  <div className="space-y-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#162232] text-slate-900 dark:text-white flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Office Location</p>
                        <p className="text-slate-500 dark:text-slate-400">Admin Building, Ground Floor, JKKNIU Campus</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#162232] text-slate-900 dark:text-white flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Helpline</p>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">01410073315</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">(24/7 Campus Helpline)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#162232] text-slate-900 dark:text-white flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Official Email</p>
                        <p className="text-slate-500 dark:text-slate-400 font-medium break-all">nazrulretrievers@gmail.com</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">(Accepts normal or edu mail)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Column */}
                <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-6 md:pt-0 md:pl-6 text-left">
                  {contactSubmitted ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center py-8"
                    >
                      <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 stroke-[3px]" />
                      </div>
                      <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-2">Message Dispatched!</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                        A student coordinator will review your request and contact you via email shortly.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50/70 dark:bg-[#162232] placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="your.email@jkkniu.edu.bd"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50/70 dark:bg-[#162232] placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Your Message</label>
                        <textarea 
                          required
                          rows={3}
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="How can we assist you with your lost/found item?"
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50/70 dark:bg-[#162232] placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                        />
                      </div>

                      {contactError && (
                        <div className="p-3 bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-800 text-red-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                          <span>{contactError}</span>
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={isSubmittingContact}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingContact ? (
                          <span>Transmitting...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Secure Message</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
