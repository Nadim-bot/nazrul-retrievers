import React, { useState, useEffect } from 'react';
import { User, Mail, Landmark, Calendar, ShieldCheck, ShieldAlert, Award, Heart, Bell, CheckCircle2, Globe, Phone, MapPin, Loader2, UploadCloud, Camera } from 'lucide-react';
import { User as UserType } from '../types';
import { DEPARTMENT_GROUPS } from '../data';
import { apiFetch } from '../utils/api';
import ImageCropModal from './ImageCropModal';
import { uploadImageToStorage } from '../utils/imageUpload';

interface ProfilePageProps {
  userName: string;
  userEmail: string;
  user?: UserType | null;
  onTabChange: (tab: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onUpdateUser?: (updatedFields: any) => any;
  onOpenUserModal?: (tab: 'profile' | 'settings' | 'reports' | 'saved') => void;
}

export default function ProfilePage({
  userName,
  userEmail,
  user,
  onTabChange,
  onShowToast,
  onUpdateUser,
  onOpenUserModal
}: ProfilePageProps) {
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
  const [isSavingCroppedAvatar, setIsSavingCroppedAvatar] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);

  const profileAvatar = user?.avatar || (user as any)?.profilePhoto || (user as any)?.profileImage || (user as any)?.profile_photo || (user as any)?.photoURL || '';
  const hasProfileAvatar = Boolean(profileAvatar && (profileAvatar.startsWith('http') || profileAvatar.startsWith('data:') || profileAvatar.startsWith('/')));

  useEffect(() => {
    setProfileAvatarError(false);
  }, [profileAvatar]);
  const isStaff = user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'staff' || (user as any)?.role === 'coordinator' || userName.toLowerCase().includes('admin');
  
  const currentUserName = user?.fullName || (user as any)?.full_name || userName || (isStaff ? 'Staff Member' : 'Student Member');
  const currentUserEmail = user?.email || userEmail || '';
  const department = user?.department || (isStaff ? 'ICT Administration' : 'Computer Science & Engineering');
  const sessionId = user?.sessionYear || (isStaff ? (user?.role === 'admin' ? 'System Administrator' : 'Staff Moderator') : '2020-21');
  const studentId = user?.studentId || (user as any)?.registrationNumber || (isStaff ? 'STAFF-OFFICIAL' : 'Not Setup');
  const designation = (user as any)?.designation || (isStaff ? (user?.sessionYear || (user?.role === 'admin' ? 'System Administrator' : 'Staff Coordinator')) : '');

  let faculty = user?.faculty || '';
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
  if (!faculty) {
    faculty = isStaff ? 'Central Administration' : 'Science & Engineering';
  }

  const isVerified = !!(
    user && !isStaff && (user as any).idVerificationStatus === 'verified'
  );

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast('Please select a valid image file (PNG, JPG, WEBP)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onShowToast('Image size should be less than 10MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setSelectedImageForCrop(reader.result as string);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmCroppedAvatar = async (croppedBase64: string) => {
    try {
      setIsSavingCroppedAvatar(true);
      setIsUploadingAvatar(true);
      onShowToast('Uploading profile photo...', 'info');

      const url = await uploadImageToStorage(croppedBase64);
      if (onUpdateUser) {
        await onUpdateUser({
          avatar: url,
          profilePhoto: url,
          profileImage: url,
          profile_photo: url
        });
      }
      onShowToast('Profile photo updated successfully!', 'success');
      setCropModalOpen(false);
      setSelectedImageForCrop(null);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      onShowToast(err.message || 'Failed to update photo. Please try again.', 'error');
    } finally {
      setIsSavingCroppedAvatar(false);
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-brand-navy">
          {isStaff ? 'Institutional Staff Profile' : 'Student Profile'}
        </h2>
        <p className="text-sm text-brand-ink2 font-light mt-1">
          {isStaff 
            ? 'Manage your institutional administrator/moderator profile and account credentials.' 
            : 'Manage your university registry, account details, and verification status.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
        {/* Left column: JKKNIU Digital ID Card */}
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy-mid to-[#1A3D55] border border-brand-gold/30 rounded-2xl p-6 text-white shadow-xl">
            {/* Hologram orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />

            {/* University Crest Label */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
              <div className="leading-none">
                <div className="text-[9px] font-black tracking-widest text-brand-gold uppercase">
                  {isStaff ? 'OFFICIAL STAFF REGISTRY' : 'JKKNIU REGISTRY'}
                </div>
                <div className="text-[11px] font-serif font-bold text-white/90 mt-1">Jatiya Kabi Kazi Nazrul Islam University (JKKNIU)</div>
              </div>
              {isStaff ? (
                <span className="text-[10px] bg-brand-gold/20 text-[#FADC9E] font-black uppercase px-2.5 py-0.5 rounded-md border border-brand-gold/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-brand-gold" /> {user?.role === 'admin' ? 'ADMINISTRATOR' : 'MODERATOR'}
                </span>
              ) : isVerified ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold uppercase px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED
                </span>
              ) : (user as any)?.idVerificationStatus === 'pending' ? (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold uppercase px-2 py-0.5 rounded-md border border-blue-500/30 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> PENDING REVIEW
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold uppercase px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 animate-pulse" /> UNVERIFIED
                </span>
              )}
            </div>

            {/* Profile Avatar & Primary details */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative group/avatar">
                <div className="w-14 h-14 rounded-full border-2 border-brand-gold overflow-hidden bg-brand-gold-mid text-[#0D1B2A] font-black text-lg flex items-center justify-center shadow-sm relative select-none">
                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-[8px] font-black z-10">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-gold mb-0.5" />
                      <span>UPLOADING</span>
                    </div>
                  ) : null}
                  {hasProfileAvatar && !profileAvatarError ? (
                    <img 
                      src={profileAvatar} 
                      className="w-full h-full object-cover" 
                      alt={userName} 
                      referrerPolicy="no-referrer"
                      onError={() => setProfileAvatarError(true)}
                    />
                  ) : (
                    (userName || (isStaff ? 'Admin' : 'User')).split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'
                  )}
                </div>
                <input 
                  type="file" 
                  id="profile-page-avatar-input" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarFileSelect}
                  disabled={isUploadingAvatar}
                />
                <label 
                  htmlFor="profile-page-avatar-input" 
                  title="Change Profile Photo"
                  className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-center p-1"
                >
                  <Camera className="w-4 h-4 text-brand-gold mb-0.5" />
                  <span className="text-[8px] font-extrabold uppercase tracking-tighter">Edit</span>
                </label>
              </div>
              <div>
                <h4 className="font-serif text-base font-bold text-white tracking-tight">{currentUserName}</h4>
                <p className="text-[11px] text-white/60 mt-0.5">
                  {isStaff ? `Staff ID: ${studentId}` : `Reg No: ${studentId}`}
                </p>
                {!isStaff && ((user as any)?.classRoll || (user as any)?.rollNumber || (user as any)?.roll) && (
                  <p className="text-[11px] text-white/60 mt-0.5">Roll No: {(user as any).classRoll || (user as any).rollNumber || (user as any).roll}</p>
                )}
                {user?.bloodGroup && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/20 text-red-300 font-extrabold px-1.5 py-0.5 rounded-md mt-1">
                    <Heart className="w-2.5 h-2.5 fill-red-400 text-red-400" /> {user.bloodGroup}
                  </span>
                )}
              </div>
            </div>

            {/* Card Metadata Grid */}
            <div className="space-y-2.5 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">
                    {isStaff ? 'Division / Faculty' : 'Faculty'}
                  </span>
                  <span className="block font-semibold text-white/90 mt-0.5 truncate">{faculty}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider font-sans">
                    {isStaff ? 'Designation / Role' : 'Session / Hall'}
                  </span>
                  <span className="block font-semibold text-white/90 mt-0.5 truncate">
                    {isStaff 
                      ? designation
                      : `${sessionId} ${user?.residentialHall ? `• ${user.residentialHall.split(' ').slice(0, 2).join(' ')}` : ''}`
                    }
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">
                  {isStaff ? 'Section / Department' : 'Department'}
                </span>
                <span className="block font-semibold text-brand-gold-mid mt-0.5 truncate">{department}</span>
              </div>
            </div>

            {/* QR Code Placeholder / Design Accents */}
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-white/40">
              <span>MEMBER SINCE 2024</span>
              <span className="font-mono text-[9px] tracking-widest">{isStaff ? 'STAFF-VERIFIED' : 'NR-SECURE-ID'}</span>
            </div>
          </div>

          {/* Quick Stats Block with real MongoDB synced data */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col gap-4">
            <h5 className="text-xs font-black text-brand-navy uppercase tracking-wider pb-2 border-b border-brand-border/40">Activity Summary</h5>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-brand-cream border border-brand-border/30 p-2.5 rounded-xl">
                <span className="block text-xl font-bold text-brand-navy">{(user as any)?.totalLostPosts || 0}</span>
                <span className="block text-[9px] text-brand-ink3 font-bold uppercase mt-0.5">Reported</span>
              </div>
              <div className="bg-brand-cream border border-brand-border/30 p-2.5 rounded-xl">
                <span className="block text-xl font-bold text-emerald-500">{(user as any)?.successfulReturns || 0}</span>
                <span className="block text-[9px] text-brand-ink3 font-bold uppercase mt-0.5">Returned</span>
              </div>
              <div className="bg-brand-cream border border-brand-border/30 p-2.5 rounded-xl">
                <span className="block text-xl font-bold text-brand-gold">{(user as any)?.reputationScore || 100}</span>
                <span className="block text-[9px] text-brand-ink3 font-bold uppercase mt-0.5">Reputation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Form details & preferences */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 flex flex-col gap-8">
          {/* Section 1: Account Registry */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <User className="w-5 h-5 text-brand-gold" /> {isStaff ? 'Official Staff Registry & Credentials' : 'Registry Information'}
              </h4>
              {onOpenUserModal && (
                <button
                  type="button"
                  onClick={() => onOpenUserModal('profile')}
                  className="px-3.5 py-1.5 bg-brand-gold hover:bg-brand-gold-mid text-[#0D1B2A] font-extrabold text-xs rounded-xl transition-all shadow-xs hover:shadow flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Update your profile, contact, and credentials"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Edit Profile &amp; Info</span>
                </button>
              )}
            </div>

            {/* Profile Completion Tracker - Only for student accounts */}
            {!isStaff && user?.profileCompletion !== undefined && (
              <div className="mb-6 p-4 bg-brand-cream/80 border border-brand-border/40 rounded-xl">
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-bold text-brand-navy">Profile Completeness</span>
                  <span className="font-black text-brand-navy">{user.profileCompletion}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-brand-gold to-brand-gold-mid h-full transition-all duration-500" 
                    style={{ width: `${user.profileCompletion}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                <User className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Full Legal Name</span>
                  <span className="text-sm font-semibold text-brand-navy truncate block">{currentUserName}</span>
                </div>
              </div>
              <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-brand-ink3 uppercase">
                    {isStaff ? 'Staff / Employee ID' : 'Registration Number'}
                  </span>
                  <span className="text-sm font-semibold text-brand-navy truncate block">{studentId}</span>
                </div>
              </div>
              {!isStaff && ((user as any)?.classRoll || (user as any)?.rollNumber || (user as any)?.roll) && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Class Roll Number</span>
                    <span className="text-sm font-semibold text-brand-navy truncate block">{(user as any).classRoll || (user as any).rollNumber || (user as any).roll}</span>
                  </div>
                </div>
              )}
              <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                <Mail className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Verified Email</span>
                  <span className="text-sm font-semibold text-brand-navy truncate block max-w-[200px]">{currentUserEmail}</span>
                </div>
              </div>
              <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                <Landmark className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-brand-ink3 uppercase">
                    {isStaff ? 'Administrative Unit / Faculty' : 'Faculty'}
                  </span>
                  <span className="text-sm font-semibold text-brand-navy truncate block">{faculty}</span>
                </div>
              </div>
              <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                <Landmark className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-brand-ink3 uppercase">
                    {isStaff ? 'Specific Section / Department' : 'Department'}
                  </span>
                  <span className="text-sm font-semibold text-brand-navy truncate block">{department}</span>
                </div>
              </div>
              <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-brand-ink3 uppercase">
                    {isStaff ? 'Designation / Staff Role' : 'Session Year'}
                  </span>
                  <span className="text-sm font-semibold text-brand-navy truncate block">
                    {isStaff ? designation : sessionId}
                  </span>
                </div>
              </div>

              {/* Dynamic properties synced from MongoDB */}
              {user?.dateOfBirth && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Date of Birth</span>
                    <span className="text-sm font-semibold text-brand-navy truncate block">
                      {(() => {
                        try {
                          const d = new Date(user.dateOfBirth);
                          if (!isNaN(d.getTime())) {
                            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                          }
                        } catch {}
                        return user.dateOfBirth;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {user?.gender && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <User className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Gender</span>
                    <span className="text-sm font-semibold text-brand-navy truncate block">{user.gender}</span>
                  </div>
                </div>
              )}

              {user?.phone && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <Phone className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Contact Phone</span>
                      {(user?.profileVisibility === 'private' || user?.hidePhone || (user as any)?.isPhonePrivate) && (
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700/60">
                          Hidden from public
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-brand-navy truncate block">{user.phone}</span>
                  </div>
                </div>
              )}

              {user?.bloodGroup && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <Heart className="w-5 h-5 text-red-500 flex-shrink-0 fill-red-100" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Blood Group</span>
                    <span className="text-sm font-bold text-red-600 truncate block">{user.bloodGroup}</span>
                  </div>
                </div>
              )}

              {user?.residentialHall && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <Landmark className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Residential Hall</span>
                    <span className="text-sm font-semibold text-brand-navy truncate block">{user.residentialHall}</span>
                  </div>
                </div>
              )}

              <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                <MapPin className="w-5 h-5 text-brand-gold flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Current Address</span>
                  <span className="text-sm font-semibold text-brand-navy truncate block">
                    {user?.address || 'Not Provided'}
                  </span>
                </div>
              </div>

              {(user?.emergencyContact || user?.emergencyContactName) && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <Phone className="w-5 h-5 text-brand-ink3 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Emergency Contact</span>
                    <span className="text-sm font-semibold text-brand-navy truncate block">
                      {user.emergencyContactName ? `${user.emergencyContactName} (${user.emergencyContact || 'No Phone'})` : user.emergencyContact}
                    </span>
                  </div>
                </div>
              )}

              {user?.socialLink && (
                <div className="bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-center gap-3">
                  <Globe className="w-5 h-5 text-brand-gold-mid flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Social Link</span>
                    <a 
                      href={user.socialLink.startsWith('http') ? user.socialLink : `https://${user.socialLink}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm font-bold text-brand-gold hover:underline truncate block"
                    >
                      Visit Profile
                    </a>
                  </div>
                </div>
              )}

              {user?.bio && (
                <div className="sm:col-span-2 bg-brand-cream border border-brand-border/40 p-4 rounded-xl flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-brand-ink3 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-brand-ink3 uppercase">Short Bio</span>
                    <p className="text-xs text-brand-navy-mid leading-relaxed font-light mt-0.5">{user.bio}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Institutional Registration Card Verification / Official Staff Badge */}
          {isStaff ? (
            <div className="bg-gradient-to-r from-brand-gold/10 to-brand-gold/5 border border-brand-gold/25 rounded-2xl p-5 text-sm shadow-sm">
              <div className="flex items-start gap-3.5">
                <ShieldCheck className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-[#0D1B2A] uppercase text-xs tracking-wider mb-1 flex items-center gap-1.5">
                    Institutional Official Account
                  </h4>
                  <p className="text-xs text-brand-ink2 mt-1 leading-relaxed">
                    Your account is registered as an official <strong>{user?.role === 'admin' ? 'Administrator' : 'Moderator'}</strong>. Staff accounts hold full verified credentials by default. No student ID card submissions or review queues are required.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-amber-500/30 dark:border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                  <Award className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-amber-300 uppercase tracking-wide">
                    Institutional Student ID Verification
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Verify your student identity to bypass review queues
                  </p>
                </div>
              </div>
            
            {(() => {
              const idStatus = (user as any)?.idVerificationStatus || 'unverified';
              const idRemarks = (user as any)?.idVerificationRemarks || '';
              const idDoc = (user as any)?.verificationDocument || '';
              const idDocs = idDoc ? idDoc.split(',').filter(Boolean) : [];

              if (idStatus === 'verified') {
                return (
                  <div className="space-y-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100">✓ Institutional ID Approved</p>
                        <p className="mt-1 opacity-90 leading-relaxed font-medium">
                          Your student ID has been reviewed and approved by campus administrators. Your account holds full institutional verification credentials.
                        </p>
                        {idRemarks && (
                          <p className="mt-2 font-mono text-[11px] bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 font-semibold">
                            Admin Remarks: {idRemarks}
                          </p>
                        )}
                      </div>
                    </div>
                    {idDocs.length > 0 && (
                      <div className="flex flex-wrap gap-4 mt-3">
                        {idDocs.map((doc, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 w-full sm:w-48 bg-slate-100 dark:bg-slate-950 shadow-sm">
                            <img src={doc} className="w-full h-32 object-cover" alt={`Verified Registration Card - Part ${idx + 1}`} />
                            <div className="absolute inset-0 bg-emerald-950/30 flex items-center justify-center">
                              <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> {idx === 0 && idDocs.length > 1 ? 'FRONT SIDE' : idx === 1 && idDocs.length > 1 ? 'BACK SIDE' : 'APPROVED ID'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (idStatus === 'pending') {
                return (
                  <div className="space-y-3">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
                      <Loader2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 animate-spin" />
                      <div>
                        <p className="font-extrabold text-sm text-blue-900 dark:text-blue-100">⏳ Review Pending</p>
                        <p className="mt-1 opacity-90 leading-relaxed font-medium">
                          Your registration document/card is currently in queue. Campus coordinators are reviewing your submission to verify institutional authenticity.
                        </p>
                      </div>
                    </div>
                    {idDocs.length > 0 && (
                      <div className="flex flex-wrap gap-4 mt-3">
                        {idDocs.map((doc, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 w-full sm:w-48 bg-slate-100 dark:bg-slate-950 opacity-80 shadow-sm">
                            <img src={doc} className="w-full h-32 object-cover" alt={`Pending Registration Card - Part ${idx + 1}`} />
                            <div className="absolute inset-0 bg-blue-950/30 flex items-center justify-center">
                              <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow">
                                {idx === 0 && idDocs.length > 1 ? 'FRONT SIDE' : idx === 1 && idDocs.length > 1 ? 'BACK SIDE' : 'PENDING REVIEW'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {idStatus === 'rejected' && (
                    <div className="bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400/80 dark:border-rose-700 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-black tracking-wide uppercase shadow-xs">
                          <ShieldAlert className="w-4 h-4" /> ID Verification Rejected
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        Your previous registration card submission was declined by coordinators. Please review the remarks below and submit clear, legible photos of both sides of your JKKNIU student ID card.
                      </p>
                      <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg p-3 text-xs shadow-xs">
                        <span className="font-extrabold text-rose-900 dark:text-rose-300 uppercase text-[11px] tracking-wider block mb-1">
                          Remarks / Feedback from Coordinator:
                        </span>
                        <p className="text-slate-950 dark:text-white font-bold text-xs leading-relaxed">
                          {idRemarks || 'The uploaded image is blurry or illegible. Please submit a high-quality picture.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Guideline Callout Box */}
                  <div className="bg-amber-500/10 dark:bg-amber-500/10 border border-amber-400/30 dark:border-amber-500/30 rounded-xl p-4 text-xs space-y-2.5 text-slate-800 dark:text-slate-100">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        Two-Sided ID Verification Requirements
                      </p>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        frontImageUrl && backImageUrl
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : frontImageUrl || backImageUrl
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-500/15 border-slate-500/40 text-slate-700 dark:text-slate-300'
                      }`}>
                        {frontImageUrl && backImageUrl
                          ? '✓ 2/2 Both Sides Attached'
                          : frontImageUrl
                          ? '1/2 Front Attached (Back Required)'
                          : backImageUrl
                          ? '1/2 Back Attached (Front Required)'
                          : '0/2 Required Sides Attached'}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                      To authenticate your institutional student status and access verified campus privileges, you must upload clear, uncropped photos of <strong>both the front and back</strong> of your official JKKNIU Student ID / Registration Card.
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span><strong>Side 1 (Front):</strong> Full Student Name, Passport Photo, Department, and Roll/Reg No.</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span><strong>Side 2 (Back):</strong> Institutional barcode, issuing authority signature, and academic validity session.</span>
                      </li>
                      <li className="pt-1">
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold text-[11px]">
                          ⚠️ Mandatory: Submissions with only 1 side will not be accepted. Both sides must be uploaded.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Front Side Card Upload */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          1. Front Side Image <span className="text-rose-500 font-extrabold">*Mandatory</span>
                        </label>
                        {frontImageUrl ? (
                          <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-100 dark:bg-slate-900 h-32 flex items-center justify-center shadow-md">
                            <img src={frontImageUrl} className="w-full h-full object-cover" alt="Front ID Preview" />
                            <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow">
                              ✓ Front Uploaded
                            </div>
                            <button
                              type="button"
                              onClick={() => setFrontImageUrl('')}
                              className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition shadow cursor-pointer text-xs"
                              title="Remove Front Side"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl p-4 h-32 cursor-pointer transition-all duration-200 group shadow-xs">
                            <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                              <UploadCloud className="w-5 h-5 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white text-center">
                              {isUploadingFront ? 'Uploading Front...' : 'Upload Front Side'}
                            </span>
                            <span className="text-[10px] font-semibold text-rose-500 text-center mt-0.5 font-bold">Required (PNG, JPG)</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              disabled={isUploadingFront || isUploadingBack || isUploadingDoc}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsUploadingFront(true);
                                try {
                                  const url = await uploadImageToStorage(file, {
                                    onProgress: () => onShowToast('Uploading front ID document...', 'info')
                                  });
                                  setFrontImageUrl(url);
                                  onShowToast('Front side ID document uploaded successfully!', 'success');
                                } catch (err: any) {
                                  onShowToast('Front upload failed: ' + (err.message || 'Please try again'), 'error');
                                } finally {
                                  setIsUploadingFront(false);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Back Side Card Upload */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          2. Back Side Image <span className="text-rose-500 font-extrabold">*Mandatory</span>
                        </label>
                        {backImageUrl ? (
                          <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-100 dark:bg-slate-900 h-32 flex items-center justify-center shadow-md">
                            <img src={backImageUrl} className="w-full h-full object-cover" alt="Back ID Preview" />
                            <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow">
                              ✓ Back Uploaded
                            </div>
                            <button
                              type="button"
                              onClick={() => setBackImageUrl('')}
                              className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition shadow cursor-pointer text-xs"
                              title="Remove Back Side"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl p-4 h-32 cursor-pointer transition-all duration-200 group shadow-xs">
                            <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                              <UploadCloud className="w-5 h-5 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white text-center">
                              {isUploadingBack ? 'Uploading Back...' : 'Upload Back Side'}
                            </span>
                            <span className="text-[10px] font-semibold text-rose-500 text-center mt-0.5 font-bold">Required (PNG, JPG)</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              disabled={isUploadingFront || isUploadingBack || isUploadingDoc}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsUploadingBack(true);
                                try {
                                  const url = await uploadImageToStorage(file, {
                                    onProgress: () => onShowToast('Uploading back ID document...', 'info')
                                  });
                                  setBackImageUrl(url);
                                  onShowToast('Back side ID document uploaded successfully!', 'success');
                                } catch (err: any) {
                                  onShowToast('Back upload failed: ' + (err.message || 'Please try again'), 'error');
                                } finally {
                                  setIsUploadingBack(false);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!frontImageUrl || !backImageUrl || isUploadingFront || isUploadingBack || isUploadingDoc}
                      onClick={async () => {
                        if (!frontImageUrl || !backImageUrl) {
                          onShowToast('Please upload BOTH the front and back sides of your student ID card.', 'error');
                          return;
                        }
                        setIsUploadingDoc(true);
                        try {
                          const combinedUrl = `${frontImageUrl},${backImageUrl}`;
                          const submitRes = await apiFetch('/auth/submit-verification', {
                            method: 'POST',
                            bodyData: { verificationDocument: combinedUrl }
                          });

                          if (submitRes) {
                            onShowToast('Two-sided student ID verification submitted successfully!', 'success');
                            setFrontImageUrl('');
                            setBackImageUrl('');
                            if (onUpdateUser) {
                              await onUpdateUser({});
                            }
                          }
                        } catch (err: any) {
                          onShowToast('Submission failed: ' + err.message, 'error');
                        } finally {
                          setIsUploadingDoc(false);
                        }
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                        !frontImageUrl || !backImageUrl
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75'
                          : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] border border-amber-300/40'
                      }`}
                    >
                      {isUploadingDoc ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          Submitting Two-Sided ID Verification...
                        </>
                      ) : (
                        <span>
                          {!frontImageUrl && !backImageUrl
                            ? 'PLEASE UPLOAD BOTH SIDES OF ID CARD'
                            : !frontImageUrl
                            ? 'PLEASE UPLOAD FRONT SIDE IMAGE TO SUBMIT'
                            : !backImageUrl
                            ? 'PLEASE UPLOAD BACK SIDE IMAGE TO SUBMIT'
                            : 'SUBMIT 2-SIDED ID VERIFICATION REQUEST'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
          )}

          {/* Section 3: Notification Alerts */}
          <div className="border-t border-brand-border/40 pt-6">
            <h4 className="font-serif text-base font-bold text-brand-navy mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-gold" /> In-App Alerts &amp; Sound Feedback
            </h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 bg-brand-cream/40 border border-brand-border/30 rounded-xl cursor-pointer hover:bg-brand-cream/80 transition-all">
                <div className="flex gap-3 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="block text-xs sm:text-sm font-semibold text-brand-navy">In-App Chat Alerts</span>
                    <span className="block text-[11px] text-brand-ink3 font-light">Get sound feedback when a finder sends a live message.</span>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-brand-border text-brand-gold focus:ring-brand-gold/20" />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-brand-cream/40 border border-brand-border/30 rounded-xl cursor-pointer hover:bg-brand-cream/80 transition-all">
                <div className="flex gap-3 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="block text-xs sm:text-sm font-semibold text-brand-navy">Push Match Notifications</span>
                    <span className="block text-[11px] text-brand-ink3 font-light">Alert immediately when reported categories match active lost items.</span>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-brand-border text-brand-gold focus:ring-brand-gold/20" />
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="border-t border-brand-border/40 pt-6 flex justify-end gap-3">
            <button
              onClick={() => onTabChange('dashboard')}
              className="px-5 py-2.5 bg-brand-cream border border-brand-border hover:border-brand-gold rounded-xl text-brand-navy hover:text-brand-gold font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => onShowToast('Profile preference saved successfully.', 'success')}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-extrabold text-xs rounded-xl shadow cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>

      {/* Image Crop / Framing Modal */}
      {cropModalOpen && selectedImageForCrop && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={selectedImageForCrop}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedImageForCrop(null);
          }}
          onConfirm={handleConfirmCroppedAvatar}
          title="Adjust Profile Photo"
          cropShape="circle"
          isSaving={isSavingCroppedAvatar}
        />
      )}
    </div>
  );
}
