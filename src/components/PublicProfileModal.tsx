import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Mail, Phone, Calendar, Award, BookOpen, Facebook, 
  Linkedin, Globe, MapPin, Compass, Shield, CheckCircle2,
  Heart, Landmark, Info, AlertTriangle, MessageSquare, MessageCircle, Copy
} from 'lucide-react';
import { User as UserType } from '../types';
import { apiFetch } from '../utils/api';
import { DEPARTMENT_GROUPS } from '../data';

const getFaculty = (user: any) => {
  if (!user) return '';
  // Admin, moderator, staff, or coordinator accounts should only display faculty if explicitly configured
  if (user.role === 'admin' || user.role === 'moderator' || user.role === 'staff' || user.role === 'coordinator') {
    return user.faculty || '';
  }
  let faculty = user.faculty || '';
  const department = user.department || '';
  if (!faculty && department) {
    const group = DEPARTMENT_GROUPS.find(g =>
      g.departments.some(d => {
        if (d.name.trim().toLowerCase() === department.trim().toLowerCase()) return true;
        const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5
          ? `${d.name} (${d.aliases[0]})`
          : d.name;
        return formatted.trim().toLowerCase() === department.trim().toLowerCase();
      })
    );
    if (group) {
      faculty = group.label;
    }
  }
  return faculty;
};

interface PublicProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function PublicProfileModal({
  userId,
  isOpen,
  onClose,
  onShowToast
}: PublicProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserType | null>(null);
  const [error, setError] = useState<string | null>(null);

  let currentUser: any = null;
  try {
    const raw = localStorage.getItem('jkkniu_user');
    if (raw) currentUser = JSON.parse(raw);
  } catch (e) {}

  const isSelf = Boolean(
    currentUser && profile && (
      (currentUser.id && String(currentUser.id) === String(profile.id)) ||
      (currentUser.email && profile.email && currentUser.email.toLowerCase() === profile.email.toLowerCase())
    )
  );

  const viewerRole = (currentUser?.role || '').toLowerCase();
  const isViewerAdmin = viewerRole === 'admin' || viewerRole === 'moderator' || viewerRole === 'staff';

  const isProfilePhoneHidden = Boolean(
    profile?.profileVisibility === 'private' ||
    profile?.hidePhone === true ||
    profile?.isPhonePrivate === true
  );

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      setError(null);
      setProfile(null);
      
      apiFetch<any>(`/auth/profile?id=${userId}`)
        .then(data => {
          if (data && data.user) {
            setProfile(data.user);
          } else {
            setError('Failed to load profile details.');
          }
        })
        .catch(err => {
          console.error('Error fetching public profile:', err);
          setError(err.message || 'Error fetching profile.');
          onShowToast(err.message || 'Could not fetch user profile details.', 'error');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
        />

        {/* Modal content box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative bg-white dark:bg-[#111622] w-full max-w-2xl rounded-3xl border border-brand-border dark:border-slate-800 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden max-h-[85vh] flex flex-col z-10"
        >
          {/* Header background light effects */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-brand-navy/10 via-transparent to-transparent dark:from-brand-gold/5 pointer-events-none" />

          {/* Close trigger button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-brand-cream/50 hover:bg-brand-cream dark:bg-slate-800/40 dark:hover:bg-slate-800/80 rounded-full text-brand-ink3 hover:text-brand-navy dark:hover:text-white transition-all cursor-pointer z-20 active:scale-90"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Content - Scrollable */}
          <div className="overflow-y-auto p-6 md:p-8 flex-1">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-brand-gold/20 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-4 border-brand-gold border-t-transparent animate-spin" />
                </div>
                <p className="text-xs font-bold text-brand-navy/65 dark:text-slate-400 uppercase tracking-widest animate-pulse">
                  Retrieving Profile Details...
                </p>
              </div>
            ) : error ? (
              <div className="py-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30 mb-4 animate-bounce">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h4 className="font-serif text-lg font-bold text-brand-navy dark:text-white mb-2">Could Not Fetch Profile</h4>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 leading-relaxed mb-6">{error}</p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-transform active:scale-95"
                >
                  Go Back
                </button>
              </div>
            ) : profile ? (() => {
              const roleLower = (profile.role || '').toLowerCase();
              const isStaffOrAdmin = roleLower === 'admin' || roleLower === 'moderator' || roleLower === 'staff' || roleLower === 'coordinator' || (profile.fullName && profile.fullName.toLowerCase().includes('admin'));
              const isAdmin = roleLower === 'admin' || (profile.fullName && profile.fullName.toLowerCase().includes('admin'));
              const isModerator = roleLower === 'moderator';

              return (
                <div className="space-y-6">
                  {/* Profile Title Banner Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-brand-border dark:border-slate-800/80">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-navy to-brand-navy-light text-brand-gold flex items-center justify-center text-3xl font-black font-serif shadow-md border-2 border-white dark:border-slate-800 overflow-hidden flex-shrink-0">
                      {profile.avatar || profile.profilePhoto ? (
                        <img
                          src={profile.avatar || profile.profilePhoto}
                          alt={profile.fullName}
                          className="w-full h-full object-cover rounded-full"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const span = document.createElement('span');
                              span.className = 'text-brand-gold text-3xl font-black font-serif';
                              const name = profile.fullName || (profile as any).full_name || (profile.role === 'admin' ? 'Admin' : 'User');
                              span.innerText = name.split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
                              parent.appendChild(span);
                            }
                          }}
                        />
                      ) : (
                        (profile.fullName || (profile as any).full_name || (profile.role === 'admin' ? 'Admin' : 'User'))
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((n: string) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase() || 'U'
                      )}
                    </div>

                    {/* Identity Header */}
                    <div className="text-center sm:text-left flex-1 space-y-1.5">
                      <div className="flex items-center flex-wrap justify-center sm:justify-start gap-2">
                        <h3 className="font-serif text-xl sm:text-2xl font-black text-brand-navy dark:text-white">
                          {profile.fullName}
                        </h3>
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" title="Official System Administrator">
                            <Shield className="w-3 h-3 text-rose-500" />
                            Administrator
                          </span>
                        ) : isModerator ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-brand-gold border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" title="Official Staff Moderator">
                            <Shield className="w-3 h-3 text-amber-500" />
                            Moderator
                          </span>
                        ) : (profile.isVerified || profile.verified || profile.is_verified || (profile as any).idVerificationStatus === 'verified') ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold" title="Verified JKKNIU Student ID">
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                            Verified Student
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            Campus Member
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-brand-gold font-bold font-mono dark:text-brand-gold-mid">
                        {isStaffOrAdmin 
                          ? (isAdmin ? 'ICT Administration' : isModerator ? 'Campus Community Moderation' : 'University Staff')
                          : (profile.department || 'JKKNIU Student')}
                      </p>

                      {profile.bio ? (
                        <p className="text-xs text-brand-ink2 dark:text-slate-300 italic max-w-md leading-relaxed">
                          "{profile.bio}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-brand-ink3 dark:text-slate-500 italic">
                          No bio set by this user yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Main Profile Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: Credentials */}
                    <div className="space-y-3.5 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-brand-border/60 dark:border-slate-800/40">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-ink3 dark:text-slate-500 flex items-center gap-1.5 mb-2">
                        {isStaffOrAdmin ? (
                          <>
                            <Shield className="w-3.5 h-3.5 text-brand-gold" />
                            Official Credentials
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-3.5 h-3.5 text-brand-gold" />
                            Academic Details
                          </>
                        )}
                      </h4>

                      {/* Official Role / Designation */}
                      {isStaffOrAdmin && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <Award className="w-4 h-4 text-brand-ink3/75 dark:text-slate-400 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">Designation</span>
                            <span className="font-bold text-brand-navy dark:text-white">
                              {isAdmin ? 'System Administrator' : isModerator ? 'Campus Community Moderator' : 'University Staff'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Faculty (rendered if non-empty) */}
                      {getFaculty(profile) && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <Award className="w-4 h-4 text-brand-ink3/75 dark:text-slate-400 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">Faculty</span>
                            <span className="font-bold text-brand-navy dark:text-white">{getFaculty(profile)}</span>
                          </div>
                        </div>
                      )}

                      {/* ID Field */}
                      <div className="flex items-start gap-2.5 text-xs">
                        <User className="w-4 h-4 text-brand-ink3/75 dark:text-slate-400 mt-0.5" />
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">
                            {isStaffOrAdmin ? 'Staff / Official ID' : 'Registration Number'}
                          </span>
                          <span className="font-bold text-brand-navy dark:text-white font-mono">
                            {isStaffOrAdmin ? 'ADMIN-OFFICIAL' : (profile.studentId || profile.registrationNumber || profile.employeeId || profile.staffId || 'Not Setup')}
                          </span>
                        </div>
                      </div>

                      {/* Class Roll Field */}
                      {!isStaffOrAdmin && (profile.classRoll || profile.rollNumber || profile.roll) && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">
                              Class Roll Number
                            </span>
                            <span className="font-bold text-brand-navy dark:text-white font-mono">
                              {profile.classRoll || profile.rollNumber || profile.roll}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Session or Service Status */}
                      {isStaffOrAdmin ? (
                        <div className="flex items-start gap-2.5 text-xs">
                          <Calendar className="w-4 h-4 text-brand-gold mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">Service Status</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Official Active {isAdmin ? 'Administrator' : isModerator ? 'Moderator' : 'Staff'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5 text-xs">
                          <Calendar className="w-4 h-4 text-brand-ink3/75 dark:text-slate-400 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">Academic Session</span>
                            <span className="font-bold text-brand-navy dark:text-white">
                              {profile.sessionYear || profile.academicSession || 'Not Setup'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Residential Hall */}
                      {!isStaffOrAdmin && profile.residentialHall && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <Landmark className="w-4 h-4 text-brand-ink3/75 dark:text-slate-400 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">Residential Hall</span>
                            <span className="font-bold text-brand-navy dark:text-white">{profile.residentialHall}</span>
                          </div>
                        </div>
                      )}
                    </div>

                  {/* Right Column: Contact & Personal info */}
                  <div className="space-y-4 bg-slate-50/70 dark:bg-slate-900/30 p-5 rounded-2xl border border-brand-border/60 dark:border-slate-800/40">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-ink2 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-3 bg-brand-gold rounded-full"></span>
                      Contact &amp; Identity
                    </h4>

                    {/* Email */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-amber-400/80 dark:hover:border-amber-400/60 transition-all duration-200">
                      <div className="flex items-start gap-2.5 text-xs">
                        <Mail className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Email Address</span>
                          <div className="mt-1 space-y-2">
                            <a 
                              href={`mailto:${profile.email}`} 
                              className="block font-black text-slate-900 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-200 hover:underline font-mono truncate text-xs sm:text-sm transition-colors duration-150"
                              title={profile.email}
                            >
                              {profile.email}
                            </a>
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(profile.email || '');
                                  onShowToast('Email copied to clipboard!', 'success');
                                }}
                                className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white dark:text-slate-100 transition-all text-[11px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                title="Copy Email Address"
                              >
                                <Copy className="w-3.5 h-3.5 text-amber-400" />
                                <span>Copy Email</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-amber-400/80 dark:hover:border-amber-400/60 transition-all duration-200">
                      <div className="flex items-start gap-2.5 text-xs">
                        <Phone className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Phone / Contact</span>
                          {isStaffOrAdmin ? (
                            <span className="font-bold text-slate-900 dark:text-slate-200 text-xs mt-1 block">
                              Protected Official Contact (In-App Messaging Available)
                            </span>
                          ) : isProfilePhoneHidden && !isSelf && !isViewerAdmin ? (
                            <div className="mt-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                                Hidden by user for privacy
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                                Please reach out via campus in-app chat.
                              </span>
                            </div>
                          ) : profile.phone ? (
                            <div className="mt-1 space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className="block font-black text-slate-900 dark:text-amber-300 font-mono text-sm tracking-wide truncate">
                                  {profile.phone}
                                </span>
                                {isProfilePhoneHidden && (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    {isSelf ? 'Hidden from public' : 'Admin visible'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(profile.phone || '');
                                    onShowToast('Phone number copied to clipboard!', 'success');
                                  }}
                                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white dark:text-slate-100 transition-all text-[11px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                  title="Copy Phone Number"
                                >
                                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Copy</span>
                                </button>
                                <a
                                  href={`https://wa.me/${String(profile.phone || '').replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-[11px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                                  title="Message on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-500 dark:text-slate-400 italic mt-1 block">Not Shared</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Blood Group */}
                    {!isStaffOrAdmin && profile.bloodGroup && (
                      <div className="flex items-start gap-2.5 text-xs">
                        <Heart className="w-4 h-4 text-rose-500 mt-0.5 animate-pulse" />
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">Blood Group</span>
                          <span className="font-extrabold text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded border border-rose-500/15">
                            {profile.bloodGroup}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Permanent Address */}
                    <div className="flex items-start gap-2.5 text-xs">
                      <MapPin className="w-4 h-4 text-brand-ink3/75 dark:text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-brand-ink3/60 dark:text-slate-500">Address / Location</span>
                        <span className="font-semibold text-brand-navy dark:text-white">
                          {isStaffOrAdmin ? 'JKKNIU Administration Office' : (profile.address || 'JKKNIU Campus')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Connect section */}
                {(profile.facebook || profile.linkedin || profile.socialLink) && (
                  <div className="p-4 bg-brand-navy/[0.03] dark:bg-slate-900/10 rounded-2xl border border-brand-border/40 dark:border-slate-800/30 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-brand-gold animate-spin-slow" />
                      <span className="text-xs font-bold text-brand-navy dark:text-white">Connect with {profile.fullName.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.facebook && (
                        <a
                          href={profile.facebook.startsWith('http') ? profile.facebook : `https://${profile.facebook}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] rounded-xl transition-all cursor-pointer hover:scale-105"
                          title="Facebook Profile"
                        >
                          <Facebook className="w-4.5 h-4.5 fill-current" />
                        </a>
                      )}
                      {profile.linkedin && (
                        <a
                          href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] rounded-xl transition-all cursor-pointer hover:scale-105"
                          title="LinkedIn Profile"
                        >
                          <Linkedin className="w-4.5 h-4.5 fill-current" />
                        </a>
                      )}
                      {profile.socialLink && (
                        <a
                          href={profile.socialLink.startsWith('http') ? profile.socialLink : `https://${profile.socialLink}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-navy dark:text-white rounded-xl transition-all cursor-pointer hover:scale-105"
                          title="Personal Website"
                        >
                          <Globe className="w-4.5 h-4.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile Privacy Disclaimer */}
                <div className="flex items-start gap-2 text-[10px] text-brand-ink3 dark:text-slate-500 bg-amber-500/5 dark:bg-amber-500/[0.02] p-3 rounded-xl border border-amber-500/10">
                  <Info className="w-4.5 h-4.5 text-amber-500/70 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {isStaffOrAdmin ? (
                      'This is an official JKKNIU Administration / Moderator account. Platform moderation, user support, and security logs are governed by official JKKNIU Administration policies.'
                    ) : (
                      'This is a verified student profile. Academic and contact details are bound by JKKNIU platform security policies. Report any misleading profiles directly to active moderators or administration.'
                    )}
                  </p>
                </div>
              </div>
            );
          })() : null}
          </div>

          {/* Footer action */}
          <div className="bg-brand-cream/50 dark:bg-[#0B0F19] px-6 py-4.5 border-t border-brand-border dark:border-slate-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5"
            >
              Close Profile
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
