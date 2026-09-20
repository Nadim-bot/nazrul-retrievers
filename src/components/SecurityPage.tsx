import { ShieldCheck, Eye, Shield, Lock, FileCode, CheckCircle2, UserCheck, KeyRound, ServerCrash, Sparkles } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="bg-brand-cream min-h-[calc(100vh-68px)] py-8 md:py-12 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full transition-colors duration-200">
      {/* Header Banner */}
      <div className="mb-8 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy">
                Security &amp; Workflow Architecture
              </h1>
              <p className="text-xs sm:text-sm text-brand-ink2 font-medium mt-1">
                Zero-trust authentication, cryptographic data hashing, and verification lifecycle.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" />
              Campus Verified
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: User Workflow */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-xs">
          <h2 className="font-serif text-lg font-bold text-brand-navy mb-6 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            Verification &amp; Recovery Lifecycle
          </h2>

          <div className="flex flex-col gap-6 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {/* Step 1 */}
            <div className="relative">
              <span className="absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-[#0D1B2A] text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                1
              </span>
              <h3 className="text-sm font-bold text-brand-navy mb-1">Registration &amp; 6-Digit Email OTP</h3>
              <p className="text-xs text-brand-ink2 font-normal leading-relaxed">
                Students register with verified university domain email. System delivers 6-digit one-time passcodes via Google Nodemailer SMTP securely.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <span className="absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-[#0D1B2A] text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                2
              </span>
              <h3 className="text-sm font-bold text-brand-navy mb-1">Detailed Listing Submission</h3>
              <p className="text-xs text-brand-ink2 font-normal leading-relaxed">
                Reports capture category tags, campus landmarks, contact permissions, and multi-angle photo uploads sanitized client &amp; server-side.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <span className="absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-[#0D1B2A] text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                3
              </span>
              <h3 className="text-sm font-bold text-brand-navy mb-1">Moderator Audit &amp; Approval</h3>
              <p className="text-xs text-brand-ink2 font-normal leading-relaxed">
                Coordinators review pending posts in their review dashboard to prevent spam or duplicate listings before publishing to the active feed.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <span className="absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-[#0D1B2A] text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                4
              </span>
              <h3 className="text-sm font-bold text-brand-navy mb-1">Smart Search &amp; AI Matching</h3>
              <p className="text-xs text-brand-ink2 font-normal leading-relaxed">
                Students filter by building, hall, or keyword. The similarity engine automatically suggests matching lost &amp; found counterparts.
              </p>
            </div>

            {/* Step 5 */}
            <div className="relative">
              <span className="absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-[#0D1B2A] text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                5
              </span>
              <h3 className="text-sm font-bold text-brand-navy mb-1">Secure Messaging &amp; Claim Validation</h3>
              <p className="text-xs text-brand-ink2 font-normal leading-relaxed">
                Claimants submit ownership proof descriptions or request a call. Chat messages are logged with moderation safeguards.
              </p>
            </div>

            {/* Step 6 */}
            <div className="relative">
              <span className="absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-[#0D1B2A] text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                6
              </span>
              <h3 className="text-sm font-bold text-brand-navy mb-1">Handover &amp; Resolution</h3>
              <p className="text-xs text-brand-ink2 font-normal leading-relaxed">
                Poster marks item status as "Returned/Reunited", resolving open claims and archiving the item permanently in historical records.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Security Implementations */}
        <div className="flex flex-col gap-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-xs">
            <h2 className="font-serif text-lg font-bold text-brand-navy mb-6 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Shield className="w-4.5 h-4.5" />
              </div>
              Security Safeguards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-[#0D1B2A] text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-brand-navy mb-1">Bcrypt Hashing</h3>
                  <p className="text-[11px] text-brand-ink2 font-normal leading-relaxed">Passwords hashed with salt rounds preventing rainbow table attacks.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-[#0D1B2A] text-amber-400 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-brand-navy mb-1">JWT Bearer Auth</h3>
                  <p className="text-[11px] text-brand-ink2 font-normal leading-relaxed">Cryptographically signed JSON Web Tokens for stateless API access.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-[#0D1B2A] text-amber-400 flex items-center justify-center flex-shrink-0">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-brand-navy mb-1">Input Sanitization</h3>
                  <p className="text-[11px] text-brand-ink2 font-normal leading-relaxed">Strict validation on all request payloads to prevent XSS and injections.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-[#0D1B2A] text-amber-400 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-brand-navy mb-1">Role-Based Access</h3>
                  <p className="text-[11px] text-brand-ink2 font-normal leading-relaxed">Granular permissions for Students, Coordinators, and System Admins.</p>
                </div>
              </div>
            </div>

            {/* Architecture Code Snippet */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy mb-2.5 flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-amber-500" />
                Verified SMTP Transporter Configuration
              </h3>
              <pre className="bg-[#0D1B2A] dark:bg-[#0B111A] text-[#E8E4DC] p-4 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed border border-brand-gold/20">
{`// server/utils/email.ts
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
