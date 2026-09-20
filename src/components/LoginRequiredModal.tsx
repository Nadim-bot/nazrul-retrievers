import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, LogIn, UserPlus } from 'lucide-react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export default function LoginRequiredModal({
  isOpen,
  onClose,
  onLogin,
  onRegister
}: LoginRequiredModalProps) {
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay - premium deep backdrop blur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0B0F17]/85 backdrop-blur-md"
        />

        {/* Modal Box - Premium Dark Glassmorphism Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.12 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          aria-describedby="login-modal-desc"
          className="relative bg-[#161B22]/98 border border-[#2D3748] rounded-2xl p-7 sm:p-8 max-w-[420px] w-full shadow-2xl overflow-hidden text-center z-10 animate-in fade-in zoom-in duration-200 focus:outline-none focus:ring-2 focus:ring-brand-gold"
        >
          {/* Top Decorative Gold Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-brand-gold via-brand-gold-mid to-brand-gold" />

          {/* Elegant background brand glowing orbs */}
          <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-brand-gold/10 filter blur-[32px] pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-brand-gold-mid/8 filter blur-[32px] pointer-events-none" />

          {/* Close Button - Top-right, neutral gray, gold hover */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-brand-gold hover:bg-[#1E293B] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold"
            aria-label="Close dialog"
            id="login-modal-close-btn"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>

          {/* Shield/Lock Header Icon with soft glow container */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[#1E293B] border border-[#2D3748] flex items-center justify-center mb-6 shadow-lg shadow-brand-gold/5 text-brand-gold relative">
            <div className="absolute inset-0 rounded-full bg-brand-gold/5 animate-ping opacity-75" />
            <Lock aria-hidden="true" className="w-6 h-6 z-10" />
          </div>

          {/* Title - Large white bold heading */}
          <h3 id="login-modal-title" className="text-2xl font-black text-white mb-3 tracking-tight font-sans">
            Sign In Required
          </h3>

          {/* Description - Soft gray readable text */}
          <p id="login-modal-desc" className="text-[#94A3B8] text-xs sm:text-sm font-normal leading-relaxed mb-6 px-1.5">
            You need to sign in to continue. Sign in or sign up to report items, contact owners, send messages, and access all Lost &amp; Found features.
          </p>

          {/* Action Buttons Stack with Hover Animations */}
          <div className="flex flex-col gap-3">
            {/* Primary Action Button - Login (Gold Gradient with lift animation) */}
            <button 
              onClick={() => {
                onLogin();
                onClose();
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-brand-gold to-brand-gold-mid hover:brightness-110 active:scale-[0.98] text-[#0D1B2A] hover:translate-y-[-1px] font-black rounded-xl text-xs sm:text-sm shadow-md shadow-brand-gold/10 transition-all flex items-center justify-center gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-[#161B22]"
              id="login-modal-primary-btn"
            >
              <LogIn aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
              <span>Sign In</span>
            </button>

            {/* Secondary Action Button - Create Account (Transparent, Gold Border, Gold Text) */}
            <button 
              onClick={() => {
                onRegister();
                onClose();
              }}
              className="w-full py-3 px-4 border border-brand-gold/60 hover:border-brand-gold bg-transparent hover:bg-brand-gold/5 text-brand-gold font-bold rounded-xl text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-[#161B22]"
              id="login-modal-secondary-btn"
            >
              <UserPlus aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
              <span>Sign Up</span>
            </button>

            {/* Cancel/Continue Browsing Link */}
            <button 
              onClick={onClose}
              className="mt-2.5 text-xs font-bold text-slate-400 hover:text-brand-gold transition-colors duration-200 cursor-pointer inline-block mx-auto py-1 focus:outline-none focus:ring-2 focus:ring-brand-gold rounded"
              id="login-modal-continue-btn"
            >
              Continue Browsing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

