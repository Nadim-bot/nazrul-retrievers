import React, { useState, useEffect } from 'react';
import { Mail, Lock, UserPlus, Check, ShieldCheck, Loader2, ShieldAlert, Timer, X, Eye, EyeOff, ChevronLeft, GraduationCap, Phone, Building2, CheckCircle2, Shield, User, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { 
  validateName, 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  validateRegistrationNumber, 
  validateSession, 
  validateFacultyAndDepartment,
  sanitizeInput
} from '../utils/validation';
import { DepartmentSelector } from './DepartmentSelector';

interface RegisterPageProps {
  onRegisterSuccess: (msg?: string, token?: string, user?: any) => void;
  onTabChange: (tab: string) => void;
}

export default function RegisterPage({ onRegisterSuccess, onTabChange }: RegisterPageProps) {
  // Redesigned form fields
  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status & loading states
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [conflictType, setConflictType] = useState<'none' | 'email' | 'registrationNumber'>('none');

  // Real-time Unique Checking States
  const [emailCheckState, setEmailCheckState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [emailCheckMsg, setEmailCheckMsg] = useState('');
  const [emailIsVerified, setEmailIsVerified] = useState(false);

  const [regCheckState, setRegCheckState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [regCheckMsg, setRegCheckMsg] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline Modal State for Terms/Privacy details
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; body: string } | null>(null);

  // Password strength checks (Strongest suggestions)
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const score = [hasMinLength, hasLowercase, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length;

  // Email Verification States (OTP code verification)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Debounced real-time check for Registration Number uniqueness
  useEffect(() => {
    const trimmedReg = registrationNumber.trim();
    if (!trimmedReg) {
      setRegCheckState('idle');
      setRegCheckMsg('');
      return;
    }

    const regDigits = trimmedReg.replace(/\D/g, '');
    if (regDigits.length !== 5 || regDigits.length !== trimmedReg.length) {
      setRegCheckState('invalid');
      setRegCheckMsg(regDigits.length !== trimmedReg.length ? 'Only numeric digits allowed' : 'Must be exactly 5 digits');
      return;
    }

    setRegCheckState('checking');
    setRegCheckMsg('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<{ unique: boolean; isVerified?: boolean; message?: string }>('/auth/check-unique', {
          method: 'POST',
          bodyData: { registrationNumber: trimmedReg }
        });

        if (res.unique) {
          setRegCheckState('available');
          setRegCheckMsg('Registration number is available');
        } else {
          setRegCheckState('taken');
          setRegCheckMsg(res.message || 'This registration number is already registered to an account.');
        }
      } catch (err: any) {
        console.warn('Registration number uniqueness check skipped:', err.message);
        setRegCheckState('idle');
        setRegCheckMsg('');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [registrationNumber]);

  // Debounced real-time check for Email Address uniqueness
  useEffect(() => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailCheckState('idle');
      setEmailCheckMsg('');
      setEmailIsVerified(false);
      return;
    }

    const emailErr = validateEmail(trimmedEmail);
    if (emailErr) {
      setEmailCheckState('invalid');
      setEmailCheckMsg(emailErr);
      return;
    }

    setEmailCheckState('checking');
    setEmailCheckMsg('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<{ unique: boolean; isVerified?: boolean; message?: string }>('/auth/check-unique', {
          method: 'POST',
          bodyData: { email: trimmedEmail }
        });

        if (res.unique) {
          setEmailCheckState('available');
          setEmailCheckMsg('Email address is available');
          setEmailIsVerified(false);
        } else {
          setEmailCheckState('taken');
          setEmailCheckMsg(res.message || 'This email address is already in use.');
          setEmailIsVerified(!!res.isVerified);
        }
      } catch (err: any) {
        console.warn('Email uniqueness check skipped:', err.message);
        setEmailCheckState('idle');
        setEmailCheckMsg('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Clear form submission errors when any of the input values change
  useEffect(() => {
    setSubmitError('');
    setConflictType('none');
  }, [fullName, registrationNumber, academicSession, email, phoneNumber, department, password, confirmPassword, agreeTerms]);

  // Clear verification code errors when verification code changes
  useEffect(() => {
    setVerificationError('');
  }, [verificationCode]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInfoModalContent(null);
        setIsVerifyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [infoModalContent, isVerifyModalOpen]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setVerificationError('Please enter the 6-digit verification code.');
      return;
    }

    setVerificationError('');
    setIsVerifying(true);

    try {
      const res = await apiFetch('/auth/verify-email', {
        method: 'POST',
        bodyData: {
          email: verificationEmail,
          code: verificationCode.trim()
        }
      });

      setVerificationSuccess(res.message || 'Email verified successfully!');
      
      setTimeout(() => {
        setIsVerifyModalOpen(false);
        onRegisterSuccess(res.message, res.token, res.user);
      }, 1500);

    } catch (err: any) {
      setVerificationError(err.message || 'Failed to verify email. Please check the code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;

    setVerificationError('');
    setVerificationSuccess('');
    setIsResending(true);

    try {
      const res = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        bodyData: {
          email: verificationEmail
        }
      });

      setResendCooldown(60);
      setVerificationSuccess(res.message || 'A fresh verification code has been sent to your email.');
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Precise explicit validations
    if (!fullName.trim()) {
      setSubmitError('Full Name is required.');
      return;
    }
    const nameError = validateName(fullName.trim());
    if (nameError) {
      setSubmitError(nameError);
      return;
    }

    if (!registrationNumber.trim()) {
      setSubmitError('Registration Number is required.');
      return;
    }
    const regError = validateRegistrationNumber(registrationNumber);
    if (regError) {
      setSubmitError(regError);
      return;
    }

    if (!academicSession) {
      setSubmitError('Academic Session is required.');
      return;
    }
    const sessionError = validateSession(academicSession);
    if (sessionError) {
      setSubmitError(sessionError);
      return;
    }

    if (!email.trim()) {
      setSubmitError('Email Address is required.');
      return;
    }
    const emailError = validateEmail(email.trim());
    if (emailError) {
      setSubmitError(emailError);
      return;
    }

    if (!phoneNumber.trim()) {
      setSubmitError('Phone Number is required.');
      return;
    }
    const phoneError = validatePhone(phoneNumber);
    if (phoneError) {
      setSubmitError(phoneError);
      return;
    }

    if (!department) {
      setSubmitError('Department is required.');
      return;
    }
    const facultyDeptError = validateFacultyAndDepartment(faculty, department);
    if (facultyDeptError) {
      setSubmitError(facultyDeptError);
      return;
    }

    if (!password) {
      setSubmitError('Password is required.');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setSubmitError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setSubmitError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    if (regCheckState === 'taken') {
      setSubmitError(regCheckMsg || 'This registration number is already registered to an account.');
      setConflictType('registrationNumber');
      return;
    }

    if (emailCheckState === 'taken') {
      setSubmitError(emailCheckMsg || 'This email address is already registered. Please sign in instead.');
      setConflictType('email');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        agreeTerms,
        registrationNumber: registrationNumber.trim(),
        academicSession,
        phoneNumber: phoneNumber.trim(),
        department,
        faculty,
        faculty_id: facultyId,
        department_id: departmentId
      };

      // Call Register API
      const res = await apiFetch<{ requiresVerification: boolean; message: string }>('/auth/register', {
        method: 'POST',
        bodyData: payload
      });

      if (res.requiresVerification) {
        setVerificationEmail((res as any).email || email.trim());
        setIsVerifyModalOpen(true);
        setVerificationCode('');
        setVerificationError('');
        setVerificationSuccess('');
        setResendCooldown(60);
      } else {
        onRegisterSuccess(res.message || 'Account registered successfully! Please login.');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to initiate registration. Please check your inputs and try again.';
      setSubmitError(errMsg);
      
      const lowerErr = errMsg.toLowerCase();
      if (err.code === 'REGISTRATION_NUMBER_ALREADY_EXISTS' || lowerErr.includes('registration number') && lowerErr.includes('already')) {
        setConflictType('registrationNumber');
        setRegCheckState('taken');
        setRegCheckMsg(errMsg);
      } else if (err.code === 'EMAIL_ALREADY_EXISTS' || err.code === 'ACCOUNT_ALREADY_EXISTS' || lowerErr.includes('email') && lowerErr.includes('already')) {
        setConflictType('email');
        setEmailCheckState('taken');
        setEmailCheckMsg(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] min-h-[calc(100vh-68px)] bg-slate-50 dark:bg-[#0a0f1d] transition-colors duration-300">
      
      {/* LEFT COLUMN: Premium Dark Navy Hero Panel (Matching Sign In) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0D1B2A] via-[#132235] to-[#0A121D] p-12 md:p-16 flex flex-col justify-center hidden lg:flex border-r border-brand-border/10 dark:border-slate-800">
        {/* Ambient background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(244,196,114,0.08)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        <div className="absolute -top-[120px] -left-[120px] w-64 h-64 rounded-full bg-brand-gold/10 blur-[80px]" />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <GraduationCap className="w-10 h-10 text-brand-gold" />
          </div>
          
          <h2 className="font-serif text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Join JKKNIU
          </h2>
          
          <p className="text-slate-300 font-light text-sm md:text-base leading-relaxed mb-10">
            Create your secure student or faculty profile to report lost belongings, verify found items, and coordinate returns safely on campus.
          </p>

          {/* Golden checkpoints (Cohesive checklist) */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-slate-200 text-sm font-semibold">
              <div className="w-6 h-6 rounded-full bg-brand-gold/20 text-[#FADC9E] flex items-center justify-center text-xs shadow-sm ring-1 ring-brand-gold/25">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span>Open to students, faculty and staff members</span>
            </div>
            
            <div className="flex items-center gap-3 text-slate-200 text-sm font-semibold">
              <div className="w-6 h-6 rounded-full bg-brand-gold/20 text-[#FADC9E] flex items-center justify-center text-xs shadow-sm ring-1 ring-brand-gold/25">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span>Direct departmental integration</span>
            </div>
            
            <div className="flex items-center gap-3 text-slate-200 text-sm font-semibold">
              <div className="w-6 h-6 rounded-full bg-brand-gold/20 text-[#FADC9E] flex items-center justify-center text-xs shadow-sm ring-1 ring-brand-gold/25">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span>Verified profiles for maximum item security</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Premium Sign Up Form Panel (Matching Sign In Style) */}
      <div className="bg-brand-surface dark:bg-[#0c1322] flex flex-col justify-center px-4 py-8 sm:px-8 sm:py-12 md:px-16 md:py-16 lg:px-24 transition-colors duration-300">
        <div className="max-w-xl w-full mx-auto">
          
          {/* Back to sign in utility navigation */}
          <button 
            onClick={() => onTabChange('login')}
            className="inline-flex items-center gap-1 text-xs text-brand-ink3 dark:text-slate-400 hover:text-brand-gold dark:hover:text-amber-400 font-bold mb-6 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Sign In
          </button>

          {/* Form Headers */}
          <div className="mb-8">
            <h3 className="font-serif text-2xl font-bold text-brand-navy dark:text-white mb-2 tracking-tight">
              Create Account
            </h3>
            <p className="text-sm text-brand-ink2 dark:text-slate-400 font-light">
              Register your student or faculty profile for Lost &amp; Found services.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* ROW 1: Full Name */}
            <div className="flex flex-col gap-1.5">
              <div className="relative group">
                <input 
                  type="text" 
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=" "
                  required
                  className="peer w-full pl-4 pr-11 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border border-brand-border dark:border-slate-800 rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all focus:border-brand-gold focus:bg-white dark:focus:bg-slate-900 dark:focus:border-amber-400 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10"
                />
                <label 
                  htmlFor="fullName"
                  className="absolute left-4 top-3.5 text-xs text-brand-ink3 dark:text-slate-400 font-bold uppercase tracking-wider transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:top-4.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-brand-gold dark:peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:text-brand-gold dark:peer-[:not(:placeholder-shown)]:text-amber-400"
                >
                  Full Name
                </label>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors flex items-center justify-center">
                  <User className="w-4.5 h-4.5" />
                </div>
              </div>
            </div>

            {/* ROW 2: Registration Number & Academic Session */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
              <div className="flex flex-col gap-1.5">
                <div className="relative group">
                  <input 
                    type="text"
                    id="registrationNumber"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder=" "
                    required
                    maxLength={5}
                    className={`peer w-full pl-4 pr-11 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all ${
                      regCheckState === 'taken'
                        ? 'border-rose-400 dark:border-rose-700 bg-rose-50/20 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : regCheckState === 'available'
                        ? 'border-emerald-500/60 dark:border-emerald-600/60 bg-emerald-50/10 dark:bg-emerald-950/30 text-brand-ink dark:text-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                        : 'border-brand-border dark:border-slate-800 focus:border-brand-gold focus:bg-white dark:focus:bg-slate-900 dark:focus:border-amber-400 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10'
                    }`}
                  />
                  <label 
                    htmlFor="registrationNumber"
                    className={`absolute left-4 top-3.5 text-xs font-bold uppercase tracking-wider transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:top-4.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider ${
                      regCheckState === 'taken'
                        ? 'text-rose-500 peer-focus:text-rose-500 peer-[:not(:placeholder-shown)]:text-rose-500'
                        : regCheckState === 'available'
                        ? 'text-emerald-600 dark:text-emerald-400 peer-focus:text-emerald-600 dark:peer-focus:text-emerald-400 peer-[:not(:placeholder-shown)]:text-emerald-600 dark:peer-[:not(:placeholder-shown)]:text-emerald-400'
                        : 'text-brand-ink3 dark:text-slate-400 peer-focus:text-brand-gold dark:peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:text-brand-gold dark:peer-[:not(:placeholder-shown)]:text-amber-400'
                    }`}
                  >
                    Registration No (5 Digits)
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                    {regCheckState === 'checking' ? (
                      <Loader2 className="w-4.5 h-4.5 text-brand-gold dark:text-amber-400 animate-spin" />
                    ) : regCheckState === 'taken' ? (
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                    ) : regCheckState === 'available' ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <GraduationCap className="w-4.5 h-4.5 text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors" />
                    )}
                  </div>
                </div>

                {/* Inline Real-time Reg Check Feedback outside relative box */}
                {regCheckState === 'taken' && (
                  <div className="flex items-start gap-1.5 px-1 text-xs text-rose-600 dark:text-rose-400 font-semibold animate-in fade-in duration-200">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                    <span>{regCheckMsg}</span>
                  </div>
                )}
                {regCheckState === 'available' && (
                  <div className="flex items-center gap-1.5 px-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Registration number is available</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="relative group">
                  <select
                    id="academicSession"
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    required
                    className="peer w-full pl-4 pr-11 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border border-brand-border dark:border-slate-800 rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all focus:border-brand-gold focus:bg-white dark:focus:bg-slate-900 dark:focus:border-amber-400 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10 appearance-none cursor-pointer"
                  >
                    <option value="" disabled hidden className="dark:bg-slate-900 dark:text-slate-100"></option>
                    <option value="2021-22" className="dark:bg-slate-900 dark:text-slate-100">2021-22</option>
                    <option value="2022-23" className="dark:bg-slate-900 dark:text-slate-100">2022-23</option>
                    <option value="2023-24" className="dark:bg-slate-900 dark:text-slate-100">2023-24</option>
                    <option value="2024-25" className="dark:bg-slate-900 dark:text-slate-100">2024-25</option>
                    <option value="2025-26" className="dark:bg-slate-900 dark:text-slate-100">2025-26</option>
                  </select>
                  <label 
                    htmlFor="academicSession"
                    className={`absolute left-4 transition-all pointer-events-none font-bold uppercase tracking-wider ${
                      academicSession !== "" 
                        ? 'top-1.5 text-[10px] text-brand-gold dark:text-amber-400' 
                        : 'top-4 text-sm font-normal normal-case tracking-normal text-brand-ink3 dark:text-slate-400'
                    } group-focus-within:top-1.5 group-focus-within:text-[10px] group-focus-within:font-bold group-focus-within:uppercase group-focus-within:tracking-wider group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400`}
                  >
                    Academic Session
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors flex items-center justify-center">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: Email Address & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
              <div className="flex flex-col gap-1.5">
                <div className="relative group">
                  <input 
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    required
                    className={`peer w-full pl-4 pr-11 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all ${
                      emailCheckState === 'taken'
                        ? 'border-rose-400 dark:border-rose-700 bg-rose-50/20 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : emailCheckState === 'available'
                        ? 'border-emerald-500/60 dark:border-emerald-600/60 bg-emerald-50/10 dark:bg-emerald-950/30 text-brand-ink dark:text-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                        : 'border-brand-border dark:border-slate-800 focus:border-brand-gold focus:bg-white dark:focus:bg-slate-900 dark:focus:border-amber-400 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10'
                    }`}
                  />
                  <label 
                    htmlFor="email"
                    className={`absolute left-4 top-3.5 text-xs font-bold uppercase tracking-wider transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:top-4.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider ${
                      emailCheckState === 'taken'
                        ? 'text-rose-500 peer-focus:text-rose-500 peer-[:not(:placeholder-shown)]:text-rose-500'
                        : emailCheckState === 'available'
                        ? 'text-emerald-600 dark:text-emerald-400 peer-focus:text-emerald-600 dark:peer-focus:text-emerald-400 peer-[:not(:placeholder-shown)]:text-emerald-600 dark:peer-[:not(:placeholder-shown)]:text-emerald-400'
                        : 'text-brand-ink3 dark:text-slate-400 peer-focus:text-brand-gold dark:peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:text-brand-gold dark:peer-[:not(:placeholder-shown)]:text-amber-400'
                    }`}
                  >
                    Email Address
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                    {emailCheckState === 'checking' ? (
                      <Loader2 className="w-4.5 h-4.5 text-brand-gold dark:text-amber-400 animate-spin" />
                    ) : emailCheckState === 'taken' ? (
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                    ) : emailCheckState === 'available' ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Mail className="w-4.5 h-4.5 text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors" />
                    )}
                  </div>
                </div>

                {/* Inline Real-time Email Check Feedback outside relative container */}
                {emailCheckState === 'invalid' && (() => {
                  const typoMatch = emailCheckMsg.match(/Did you mean "([^"]+)"/i);
                  const suggestedDomain = typoMatch ? typoMatch[1] : null;

                  const handleApplyTypoFix = () => {
                    if (!suggestedDomain) return;
                    const fixed = email.includes('@')
                      ? email.replace(/@[^@]+$/, '@' + suggestedDomain)
                      : email + '@' + suggestedDomain;
                    setEmail(fixed);
                  };

                  return (
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs shadow-xs animate-in fade-in duration-200">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                        <span className="text-slate-900 dark:text-amber-200 font-bold leading-relaxed">{emailCheckMsg}</span>
                      </div>
                      {suggestedDomain && (
                        <div className="pt-1.5 border-t border-amber-200/80 dark:border-amber-800/60 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-amber-950 dark:text-amber-300">Quick Fix:</span>
                          <button
                            type="button"
                            onClick={handleApplyTypoFix}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer border border-amber-600/30"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Use @{suggestedDomain}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {emailCheckState === 'taken' && (
                  <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs shadow-xs animate-in fade-in duration-200">
                    <span className="flex items-start gap-2 text-slate-900 dark:text-rose-200 font-bold">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <span>{emailCheckMsg}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onTabChange('login')}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer shrink-0 ml-1 whitespace-nowrap"
                    >
                      Sign In &rarr;
                    </button>
                  </div>
                )}
                {emailCheckState === 'available' && (
                  <div className="flex items-center gap-1.5 px-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Email address is valid and available</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="relative group">
                  <input 
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder=" "
                    required
                    className="peer w-full pl-4 pr-11 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border border-brand-border dark:border-slate-800 rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all focus:border-brand-gold focus:bg-white dark:focus:bg-slate-900 dark:focus:border-amber-400 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10"
                  />
                  <label 
                    htmlFor="phoneNumber"
                    className="absolute left-4 top-3.5 text-xs text-brand-ink3 dark:text-slate-400 font-bold uppercase tracking-wider transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:top-4.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-brand-gold dark:peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:text-brand-gold dark:peer-[:not(:placeholder-shown)]:text-amber-400"
                  >
                    Phone Number
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors flex items-center justify-center">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 4: Department Selector */}
            <div className="flex flex-col gap-1.5">
              <div className="relative group">
                <DepartmentSelector
                  value={department}
                  onChange={(deptName, facultyName, deptId, facId) => {
                    setDepartment(deptName);
                    setFaculty(facultyName);
                    setDepartmentId(deptId);
                    setFacultyId(facId);
                  }}
                />
                <label 
                  htmlFor="department"
                  className={`absolute left-4 transition-all pointer-events-none font-bold uppercase tracking-wider ${
                    department !== "" 
                      ? 'top-1.5 text-[10px] text-brand-gold dark:text-amber-400' 
                      : 'top-4 text-sm font-normal normal-case tracking-normal text-brand-ink3 dark:text-slate-400'
                  } group-focus-within:top-1.5 group-focus-within:text-[10px] group-focus-within:font-bold group-focus-within:uppercase group-focus-within:tracking-wider group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400`}
                >
                  Department
                </label>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
              </div>
            </div>

            {/* ROW 5: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
              <div className="flex flex-col gap-1.5">
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    required
                    className="peer w-full pl-4 pr-16 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border border-brand-border dark:border-slate-800 rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all focus:border-brand-gold focus:bg-white dark:focus:bg-slate-900 dark:focus:border-amber-400 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10"
                  />
                  <label 
                    htmlFor="password"
                    className="absolute left-4 top-3.5 text-xs text-brand-ink3 dark:text-slate-400 font-bold uppercase tracking-wider transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:top-4.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-brand-gold dark:peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:text-brand-gold dark:peer-[:not(:placeholder-shown)]:text-amber-400"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-11 top-1/2 -translate-y-1/2 text-brand-ink3 dark:text-slate-400 hover:text-brand-gold dark:hover:text-amber-400 transition-colors focus:outline-none cursor-pointer p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors flex items-center justify-center">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="relative group">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=" "
                    required
                    className="peer w-full pl-4 pr-16 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border border-brand-border dark:border-slate-800 rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all focus:border-brand-gold focus:bg-white dark:focus:bg-slate-900 dark:focus:border-amber-400 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10"
                  />
                  <label 
                    htmlFor="confirmPassword"
                    className="absolute left-4 top-3.5 text-xs text-brand-ink3 dark:text-slate-400 font-bold uppercase tracking-wider transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:top-4.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-brand-gold dark:peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:text-brand-gold dark:peer-[:not(:placeholder-shown)]:text-amber-400"
                  >
                    Confirm Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-11 top-1/2 -translate-y-1/2 text-brand-ink3 dark:text-slate-400 hover:text-brand-gold dark:hover:text-amber-400 transition-colors focus:outline-none cursor-pointer p-1"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-ink3 dark:text-slate-500 group-focus-within:text-brand-gold dark:group-focus-within:text-amber-400 transition-colors flex items-center justify-center">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Password Strength Indicator with Strongest suggestions */}
            {password.length > 0 && (
              <div className="p-4 bg-brand-cream/40 dark:bg-slate-900/60 border border-brand-border/60 dark:border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400">
                  <span>Password Security Strength</span>
                  <span className={`font-extrabold ${score === 5 ? "text-emerald-600 dark:text-emerald-400" : score >= 3 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {score === 5 ? '🛡️ Strongest' : score >= 3 ? '⚠️ Medium' : '❌ Weak'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 h-1.5">
                  <div className={`rounded-full h-full transition-all duration-300 ${score >= 1 ? (score === 5 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200 dark:bg-slate-800'}`} />
                  <div className={`rounded-full h-full transition-all duration-300 ${score >= 2 ? (score === 5 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200 dark:bg-slate-800'}`} />
                  <div className={`rounded-full h-full transition-all duration-300 ${score >= 3 ? (score === 5 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200 dark:bg-slate-800'}`} />
                  <div className={`rounded-full h-full transition-all duration-300 ${score >= 4 ? (score === 5 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200 dark:bg-slate-800'}`} />
                  <div className={`rounded-full h-full transition-all duration-300 ${score === 5 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-brand-ink2 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${hasMinLength ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                      {hasMinLength ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />}
                    </div>
                    <span className={hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-brand-ink3 dark:text-slate-500'}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${hasUppercase ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                      {hasUppercase ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />}
                    </div>
                    <span className={hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-brand-ink3 dark:text-slate-500'}>Uppercase letter (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${hasLowercase ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                      {hasLowercase ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />}
                    </div>
                    <span className={hasLowercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-brand-ink3 dark:text-slate-500'}>Lowercase letter (a-z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${hasNumber ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                      {hasNumber ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />}
                    </div>
                    <span className={hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-brand-ink3 dark:text-slate-500'}>At least 1 number (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${hasSpecialChar ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                      {hasSpecialChar ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />}
                    </div>
                    <span className={hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-brand-ink3 dark:text-slate-500'}>Special character (!@#$ etc.)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Privacy Checkbox */}
            <div className="pt-2">
              <label className="inline-flex items-start gap-3 text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer select-none font-medium leading-normal">
                <input 
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-brand-border dark:border-slate-700 dark:bg-slate-800 text-brand-gold focus:ring-brand-gold/20 mt-1 cursor-pointer w-4 h-4 shrink-0"
                />
                <span>
                  I agree to the{' '}
                  <button 
                    type="button"
                    onClick={() => setInfoModalContent({
                      title: 'Terms of Service',
                      body: 'By registering on Nazrul Retrievers: Campus Lost and Found, you agree to use this platform with integrity and care. Any attempt to abuse registration, claim items falsely, or engage in suspicious administrative or coordinating role violations is subject to strict review, logs reveal, and account suspensions by JKKNIU Administrators.'
                    })}
                    className="text-brand-gold dark:text-amber-400 hover:underline font-bold transition-all cursor-pointer focus:outline-none"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button 
                    type="button"
                    onClick={() => setInfoModalContent({
                      title: 'Privacy Policy',
                      body: 'Your student profile verification details (Registration, Full Name, Email, Department, and Phone) are encrypted and stored safely. We trace interactions, message histories, and claims to prevent security breaches and identity impersonation inside Jatiya Kabi Kazi Nazrul Islam University.'
                    })}
                    className="text-brand-gold dark:text-amber-400 hover:underline font-bold transition-all cursor-pointer focus:outline-none"
                  >
                    Privacy Policy
                  </button>.
                </span>
              </label>
            </div>

            {/* Error Message Display */}
            {submitError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm animate-fadeIn">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0 text-rose-700 dark:text-rose-300 mt-0.5 shadow-2xs">
                    <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                        Registration Notice
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-rose-200 leading-relaxed break-words">{submitError}</p>
                  </div>
                </div>
                {(conflictType === 'email' || conflictType === 'registrationNumber' || submitError.toLowerCase().includes('already')) && (
                  <button
                    type="button"
                    onClick={() => onTabChange('login')}
                    className="self-start sm:self-auto shrink-0 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Sign In Now</span>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>
            )}

            {/* Submit Button (Create Account) */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.98] transition-all text-sm mt-4 cursor-pointer disabled:opacity-50 border border-amber-300/30"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <UserPlus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              )}
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            </button>

          </form>

          {/* Already Registered Bottom Redirection */}
          <div className="text-center text-xs sm:text-sm text-brand-ink2 dark:text-slate-400 mt-8 font-light">
            Already registered?{' '}
            <button 
              onClick={() => onTabChange('login')}
              className="text-brand-gold dark:text-amber-400 hover:text-brand-gold-mid dark:hover:text-amber-300 font-bold transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>

        </div>
      </div>

      {/* RENDER TERMS & PRIVACY DETAILED INFO MODALS */}
      {infoModalContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-brand-navy p-5 text-white flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-gold dark:text-amber-400" />
                {infoModalContent.title}
              </h4>
              <button 
                onClick={() => setInfoModalContent(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-brand-ink2 dark:text-slate-300 leading-relaxed font-light whitespace-pre-line">
                {infoModalContent.body}
              </p>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setInfoModalContent(null)}
                  className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy-mid dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Dismiss Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verify Email Security Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-[min(calc(100vw-24px),28rem)] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="bg-brand-navy p-5 sm:p-6 text-center relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-gold/10 border border-brand-gold/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-brand-gold dark:text-amber-400" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">Verify Your Student Email</h3>
              <p className="text-xs text-brand-gold/90 dark:text-amber-400 font-bold mt-1">JKKNIU Identity Protection Portal</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <p className="text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 font-semibold text-center leading-relaxed">
                A verification code has been sent to:<br />
                <strong className="text-brand-navy dark:text-white text-sm sm:text-base break-all">{verificationEmail}</strong>
                <br /><br />
                Please check your inbox and enter the 6-digit code below.
              </p>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="verify-code-input" className="block text-xs font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
                    Enter Verification Code
                  </label>
                  <input
                    id="verify-code-input"
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[6px] sm:tracking-[12px] font-mono text-xl sm:text-2xl px-3 sm:px-4 py-3 border border-brand-border dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-brand-gold dark:focus:ring-amber-400 focus:outline-none bg-brand-cream dark:bg-slate-950 text-brand-navy dark:text-amber-400 font-black"
                  />
                </div>

                {verificationError && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 font-bold">
                    <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
                    <span>{verificationError}</span>
                  </div>
                )}

                {verificationSuccess && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-xl p-3 flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <Check className="w-4.5 h-4.5 shrink-0 text-emerald-500 mt-0.5" />
                    <span>{verificationSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || verificationCode.length < 6}
                  className="w-full py-3.5 bg-brand-navy hover:bg-brand-navy-mid dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white dark:text-slate-950" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verify & Activate Account
                    </>
                  )}
                </button>
              </form>

              <div className="border-t border-brand-border dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isResending}
                  className="text-xs font-bold text-brand-gold dark:text-amber-400 hover:text-brand-gold-mid dark:hover:text-amber-300 disabled:text-gray-400 dark:disabled:text-slate-600 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Timer className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-3 py-1.5 border border-brand-border dark:border-slate-700 text-xs font-bold text-brand-ink2 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-100 dark:hover:border-rose-900/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel Registration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
