import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, User, FileText, Check, Plus, AlertCircle, Settings, Bell,
  LogOut, Phone, Landmark, Calendar, ShieldCheck, ShieldAlert, Mail, Eye, EyeOff,
  Trash2, CheckCircle2, RotateCcw, Heart, AlertTriangle, Shield, CheckCircle, Globe, Lock, Key, Edit2, Save, ArrowRight, Image,
  Tag, FolderOpen, MapPin, Compass, ChevronDown, UploadCloud, Inbox, Loader2, MessageSquare, Search, XCircle, Clock,
  Volume2, Sparkles, Download, Sliders, RefreshCw, Database,
  Bookmark, LayoutGrid, List, Share2, Sun, Moon, Monitor, CheckSquare, ExternalLink, Award
} from 'lucide-react';
import { Item, NotificationItem, ImageMetadata, User as UserType } from '../types';
import { apiFetch } from '../utils/api';
import { DEPARTMENT_GROUPS, CATEGORIES, CATEGORY_STRUCTURE } from '../data';
import MultiImageUpload from './MultiImageUpload';
import ImageCropModal from './ImageCropModal';
import { uploadImageToStorage } from '../utils/imageUpload';
import { LOCATION_GROUPS } from './PostItemPage';
import { useRollNumberValidation } from '../hooks/useRollNumberValidation';
import { playNotificationSound, playSuccessSound } from '../utils/sound';
import { 
  validateName, 
  validatePhone, 
  validateFacultyAndDepartment, 
  validateSession,
  validateRollNumber,
  validateRegistrationNumber,
  getSessionEndYear
} from '../utils/validation';
import { formatPostTime } from '../utils/date';
import { getRewardDetails } from '../utils/rewardUtils';
import { handleNotificationClick, getNotificationIconAndColor, formatNotificationContent } from '../utils/notificationNavigation';
import { ThemeMode, getStoredThemeMode, applyThemeMode, subscribeToTheme } from '../utils/theme';

const normalizeDateForInput = (dateVal?: string | null): string => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10);
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return str;
};

interface UserProfileMenuModalsProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout';
  onActiveTabChange: (tab: 'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout') => void;
  user: UserType | null;
  onUpdateUser: (updatedFields: Partial<UserType> & { password?: string; oldPassword?: string }) => any;
  items: Item[];
  onUpdateItems: (items: Item[]) => void;
  onSelectItem: (item: Item) => void;
  onTabChange: (tab: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  savedItemIds: string[];
  onToggleSaveItem: (itemId: string) => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onDeleteNotification?: (id: string | number) => void;
  onClearAllNotifications?: () => void;
}

export default function UserProfileMenuModals({
  isOpen,
  onClose,
  activeTab,
  onActiveTabChange,
  user,
  onUpdateUser,
  items,
  onUpdateItems,
  onSelectItem,
  onTabChange,
  onShowToast,
  savedItemIds,
  onToggleSaveItem,
  onLogout,
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onDeleteNotification,
  onClearAllNotifications
}: UserProfileMenuModalsProps) {

  const isStaff = user?.role === 'admin' || user?.role === 'moderator' || (user as any)?.role === 'coordinator';

  // Profile local states
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editSessionYear, setEditSessionYear] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editClassRoll, setEditClassRoll] = useState('');
  const [editOldPassword, setEditOldPassword] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showEditOldPassword, setShowEditOldPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [editAvatar, setEditAvatar] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editEmergencyContactName, setEditEmergencyContactName] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editResidentialHall, setEditResidentialHall] = useState('');
  const [editSocialLink, setEditSocialLink] = useState('');
  const [editBio, setEditBio] = useState('');

  const isDirtyRef = useRef(false);
  const prevIsOpenRef = useRef(false);
  const prevUserIdRef = useRef(user?.id);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmStudentId, setConfirmStudentId] = useState('');
  const [deleteTextConfirm, setDeleteTextConfirm] = useState('');
  const [deletePasswordConfirm, setDeletePasswordConfirm] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
  const [isSavingCroppedAvatar, setIsSavingCroppedAvatar] = useState(false);
  const [sidebarAvatarError, setSidebarAvatarError] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);
  const [previewDocModalUrl, setPreviewDocModalUrl] = useState<string | null>(null);

  const activeAvatar = editAvatar || user?.avatar || (user as any)?.profilePhoto || (user as any)?.profileImage || (user as any)?.profile_photo || (user as any)?.photoURL || '';
  const hasValidAvatar = Boolean(activeAvatar && (activeAvatar.startsWith('data:') || activeAvatar.startsWith('http') || activeAvatar.startsWith('/')));

  useEffect(() => {
    setSidebarAvatarError(false);
    setProfileAvatarError(false);
  }, [activeAvatar]);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [currentMobileView, setCurrentMobileView] = useState<'menu' | 'content'>('content');

  // My Reports Search & Filter State
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'lost' | 'found' | 'reunited' | 'pending' | 'rejected'>('all');

  // Saved Items Management State
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [savedTypeFilter, setSavedTypeFilter] = useState<'all' | 'lost' | 'found' | 'resolved'>('all');
  const [savedCategoryFilter, setSavedCategoryFilter] = useState<string>('all');
  const [savedSortBy, setSavedSortBy] = useState<'newest' | 'oldest' | 'title' | 'reward'>('newest');
  const [savedViewMode, setSavedViewMode] = useState<'grid' | 'list'>('grid');
  const [showClearSavedConfirm, setShowClearSavedConfirm] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // Edit item inside reports
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemLocation, setEditItemLocation] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('');
  const [editItemSubcategory, setEditItemSubcategory] = useState('');
  const [editItemEmoji, setEditItemEmoji] = useState('');
  const [editItemSpecificSpot, setEditItemSpecificSpot] = useState('');
  const [editItemType, setEditItemType] = useState<'lost' | 'found'>('lost');
  const [editItemRewardOffered, setEditItemRewardOffered] = useState(false);
  const [editItemRewardAmount, setEditItemRewardAmount] = useState('');
  const [editItemImages, setEditItemImages] = useState<ImageMetadata[]>([]);
  const [editItemDate, setEditItemDate] = useState('');
  const [editItemContactPreference, setEditItemContactPreference] = useState('');

  // Location selector in edit report
  const [editLocationCategory, setEditLocationCategory] = useState('');
  const [editLocationSearchTerm, setEditLocationSearchTerm] = useState('');
  const [editLocationDropdownOpen, setEditLocationDropdownOpen] = useState(false);
  const [editLocationKeyboardIndex, setEditLocationKeyboardIndex] = useState(-1);
  const [editExpandedGroup, setEditExpandedGroup] = useState<string | null>(null);
  const editLocationDropdownRef = useRef<HTMLDivElement>(null);

  // Settings states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [matchAlertsEnabled, setMatchAlertsEnabled] = useState(true);
  const [activityBadges, setActivityBadges] = useState(true);
  const [showAcademicBadge, setShowAcademicBadge] = useState(true);
  const [language, setLanguage] = useState<'EN' | 'BN'>('EN');
  const [profilePrivate, setProfilePrivate] = useState(false);
  const [preferredContactMethod, setPreferredContactMethod] = useState<'chat' | 'phone' | 'both'>('chat');
  const [autoFillDetails, setAutoFillDetails] = useState(true);
  const [isExportingData, setIsExportingData] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Unified Theme Mode (Light / Dark / System)
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getStoredThemeMode());

  // Subscribe to real-time theme updates from Navbar, other tabs, and system changes
  useEffect(() => {
    return subscribeToTheme((mode) => {
      setThemeModeState(mode);
    });
  }, []);

  // Sync state whenever the modal opens or active tab switches
  useEffect(() => {
    if (isOpen) {
      setThemeModeState(getStoredThemeMode());
    }
  }, [isOpen, activeTab]);

  const handleSelectThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    applyThemeMode(mode);
  };

  // Reset mobile view when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentMobileView('content');
    }
  }, [isOpen, activeTab]);

  const { error: rollNumberError, expectedPrefix: expectedSessionEndYear } = useRollNumberValidation(editClassRoll, editSessionYear, false);

  // Synchronize form states from user data without clobbering active edits
  const syncFormWithUser = useCallback((userData: any, force = false) => {
    if (!userData) return;
    if (!force && isDirtyRef.current) {
      return;
    }

    setEditName(userData.fullName || userData.full_name || '');
    setEditPhone(userData.phone || userData.phoneNumber || userData.phone_number || '');

    // Normalize Faculty & Department
    let initDept = userData.department || userData.department_name || userData.dept || '';
    let initFaculty = userData.faculty || userData.faculty_name || '';

    if (initDept) {
      for (const group of DEPARTMENT_GROUPS) {
        for (const d of group.departments) {
          const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5
            ? `${d.name} (${d.aliases[0]})`
            : d.name;
          if (
            d.name.toLowerCase() === initDept.toLowerCase() ||
            formatted.toLowerCase() === initDept.toLowerCase() ||
            (d.aliases && d.aliases.some(a => a.toLowerCase() === initDept.toLowerCase()))
          ) {
            initDept = d.name;
            if (!initFaculty) {
              initFaculty = group.label;
            }
            break;
          }
        }
      }
    }

    if (initDept && !initFaculty) {
      const matchedGroup = DEPARTMENT_GROUPS.find(g =>
        g.departments.some(d => d.name.toLowerCase() === initDept.toLowerCase())
      );
      if (matchedGroup) {
        initFaculty = matchedGroup.label;
      }
    }

    setEditFaculty(initFaculty);
    setEditDepartment(initDept);

    setEditSessionYear(userData.sessionYear || userData.academicSession || userData.session_year || '');
    setEditStudentId(userData.studentId || userData.student_id || userData.registrationNumber || '');
    setEditClassRoll(userData.classRoll || userData.rollNumber || userData.roll || userData.class_roll || '');
    setEditAvatar(userData.avatar || userData.profilePhoto || userData.profile_photo || userData.profileImage || userData.photoURL || '');
    setEditGender(userData.gender || '');
    setEditDateOfBirth(normalizeDateForInput(userData.dateOfBirth));
    setEditAddress(userData.address || '');
    setEditEmergencyContact(userData.emergencyContact || '');
    setEditEmergencyContactName(userData.emergencyContactName || '');
    setEditBloodGroup(userData.bloodGroup || '');

    // Residential Hall normalization
    const rawHall = userData.residentialHall || userData.residential_hall || userData.hall || '';
    const knownHalls = ['Agnibina Hall', 'Bidrohi Hall', 'Dolonchapa Hall', 'Shiulimala Hall', 'Non-Residential'];
    const matchedHall = knownHalls.find(h => 
      h.toLowerCase() === rawHall.trim().toLowerCase() ||
      (rawHall.trim() && h.toLowerCase().includes(rawHall.trim().toLowerCase().replace(' hall', '')))
    );
    setEditResidentialHall(matchedHall || rawHall);
    setEditSocialLink(userData.socialLink || userData.facebook || userData.linkedin || '');
    setEditBio(userData.bio || '');
    
    setSoundEnabled(userData.notificationSettings?.sound !== false);
    setMatchAlertsEnabled(userData.notificationSettings?.matchAlerts !== false);
    setActivityBadges(userData.notificationSettings?.activityBadges !== false);
    setShowAcademicBadge(userData.notificationSettings?.showAcademicBadge !== false);
    setLanguage(userData.language || 'EN');
    setProfilePrivate(userData.profileVisibility === 'private' || userData.hidePhone === true || userData.isPhonePrivate === true);
    setPreferredContactMethod(((userData.accountSettings?.preferredContactMethod || userData.preferredContactMethod) || 'chat') as any);
    setAutoFillDetails(userData.accountSettings?.autoFillDetails !== false);
  }, []);

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const userChanged = user?.id && user.id !== prevUserIdRef.current;
    prevIsOpenRef.current = isOpen;
    prevUserIdRef.current = user?.id;

    if (justOpened || userChanged) {
      isDirtyRef.current = false;
      if (user) {
        syncFormWithUser(user, true);
      }

      if (isOpen) {
        let isMounted = true;
        apiFetch('/auth/me').then(res => {
          if (res && res.user && isMounted) {
            try {
              localStorage.setItem('jkkniu_user', JSON.stringify(res.user));
            } catch {}
            if (!isDirtyRef.current) {
              syncFormWithUser(res.user, false);
            }
          }
        }).catch(() => {});
        return () => { isMounted = false; };
      }
    } else if (!isDirtyRef.current && user && !isOpen) {
      syncFormWithUser(user, false);
    }
  }, [isOpen, user, syncFormWithUser]);

  useEffect(() => {
    if (isOpen && activeTab === 'notifications') {
      const unreadExists = notifications.some(n => n.unread);
      if (unreadExists) {
        onMarkAllNotificationsRead();
      }
    }
  }, [isOpen, activeTab, notifications, onMarkAllNotificationsRead]);

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

  // Click outside for edit location dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editLocationDropdownRef.current && !editLocationDropdownRef.current.contains(event.target as Node)) {
        setEditLocationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) {
      return {
        score: 0,
        label: 'Enter Password',
        color: 'bg-slate-200 dark:bg-slate-700',
        textColor: 'text-slate-400',
        checks: { length: false, lowercase: false, uppercase: false, number: false, special: false }
      };
    }

    const checks = {
      length: pwd.length >= 8,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd)
    };

    let score = 0;
    if (checks.length) score++;
    if (checks.lowercase) score++;
    if (checks.uppercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    let label = 'Very Weak';
    let color = 'bg-rose-500';
    let textColor = 'text-rose-600 dark:text-rose-400';

    if (score === 2) {
      label = 'Weak';
      color = 'bg-orange-500';
      textColor = 'text-orange-600 dark:text-orange-400';
    } else if (score === 3) {
      label = 'Fair';
      color = 'bg-amber-500';
      textColor = 'text-amber-600 dark:text-amber-400';
    } else if (score === 4) {
      label = 'Strong';
      color = 'bg-emerald-500';
      textColor = 'text-emerald-600 dark:text-emerald-400';
    } else if (score === 5) {
      label = 'Excellent';
      color = 'bg-teal-500';
      textColor = 'text-teal-600 dark:text-teal-400';
    }

    return { score, label, color, textColor, checks };
  };

  const strength = getPasswordStrength(editPassword);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      onShowToast('Please upload a valid image file (PNG, JPG, WEBP)', 'error');
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

      const permanentUrl = await uploadImageToStorage(croppedBase64);
      setEditAvatar(permanentUrl);

      if (onUpdateUser) {
        const updated = await onUpdateUser({
          avatar: permanentUrl,
          profilePhoto: permanentUrl,
          profileImage: permanentUrl,
          profile_photo: permanentUrl
        });
        if (updated) {
          try {
            localStorage.setItem('jkkniu_user', JSON.stringify(updated));
          } catch {}
          syncFormWithUser(updated, true);
        }
      }

      onShowToast('Profile photo updated successfully!', 'success');
      setCropModalOpen(false);
      setSelectedImageForCrop(null);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      onShowToast(err.message || 'Failed to upload photo. Please try again.', 'error');
    } finally {
      setIsSavingCroppedAvatar(false);
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      onShowToast('Name cannot be empty', 'error');
      return;
    }

    const nameError = validateName(editName);
    if (nameError) {
      onShowToast(nameError, 'error');
      return;
    }

    if (editPhone) {
      const phoneError = validatePhone(editPhone);
      if (phoneError) {
        onShowToast(phoneError, 'error');
        return;
      }
    }

    if (editSessionYear && !isStaff) {
      const sessionError = validateSession(editSessionYear);
      if (sessionError) {
        onShowToast(sessionError, 'error');
        return;
      }
    }

    if (!isStaff) {
      // Registration Number is optional, but if provided must be exactly 5 numeric digits
      if (editStudentId && editStudentId.trim()) {
        const regDigits = editStudentId.trim().replace(/\D/g, '');
        if (regDigits.length !== editStudentId.trim().length || regDigits.length !== 5) {
          onShowToast('Registration Number must be exactly 5 numeric digits.', 'error');
          return;
        }
      }

      // Roll Number is optional, but if provided must be validated (8 digits with session prefix)
      if (editClassRoll && editClassRoll.trim()) {
        const activeSession = editSessionYear || (user as any)?.sessionYear || (user as any)?.academicSession || '';
        const rollErr = validateRollNumber(editClassRoll.trim(), activeSession);
        if (rollErr) {
          onShowToast(rollErr, 'error');
          return;
        }
      }

      // Faculty and Department: validate only if faculty or department is specified
      if (editFaculty || editDepartment) {
        const facultyDeptError = validateFacultyAndDepartment(editFaculty, editDepartment);
        if (facultyDeptError) {
          onShowToast(facultyDeptError, 'error');
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      const payload = {
        fullName: editName,
        full_name: editName,
        phone: editPhone,
        phoneNumber: editPhone,
        phone_number: editPhone,
        faculty: editFaculty,
        department: editDepartment,
        sessionYear: editSessionYear,
        academicSession: editSessionYear,
        designation: isStaff ? editSessionYear : ((user as any)?.designation || ''),
        studentId: editStudentId,
        student_id: editStudentId,
        registrationNumber: editStudentId,
        classRoll: editClassRoll,
        rollNumber: editClassRoll,
        roll: editClassRoll,
        class_roll: editClassRoll,
        avatar: editAvatar || activeAvatar,
        profilePhoto: editAvatar || activeAvatar,
        profileImage: editAvatar || activeAvatar,
        profile_photo: editAvatar || activeAvatar,
        gender: editGender,
        dateOfBirth: editDateOfBirth,
        address: editAddress,
        emergencyContact: editEmergencyContact,
        emergencyContactName: editEmergencyContactName,
        bloodGroup: editBloodGroup,
        residentialHall: editResidentialHall,
        residential_hall: editResidentialHall,
        hall: editResidentialHall,
        socialLink: editSocialLink,
        bio: editBio
      };

      const updatedUser = await onUpdateUser(payload);
      if (updatedUser) {
        try {
          localStorage.setItem('jkkniu_user', JSON.stringify(updatedUser));
        } catch {}
        syncFormWithUser(updatedUser, true);
        const resolvedUpdatedRoll = updatedUser.classRoll || updatedUser.rollNumber || updatedUser.roll || payload.classRoll || '';
        setEditClassRoll(resolvedUpdatedRoll);
      } else {
        setEditClassRoll(payload.classRoll || '');
      }
      isDirtyRef.current = false;
      playSuccessSound();
      onShowToast('Profile registry updated successfully!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update profile. Registration number may already be registered.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOldPassword) {
      onShowToast('Please enter your current password', 'error');
      return;
    }
    if (!editPassword) {
      onShowToast('Please enter a new password', 'error');
      return;
    }
    if (editPassword !== editConfirmPassword) {
      onShowToast('Confirm password does not match new password', 'error');
      return;
    }
    if (editPassword === editOldPassword) {
      onShowToast('New password cannot be the same as your old password', 'error');
      return;
    }
    if (strength.score < 3) {
      onShowToast('Password must be min. 8 characters and contain mixed case, number, and special character', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await onUpdateUser({
        oldPassword: editOldPassword,
        password: editPassword
      });
      setEditOldPassword('');
      setEditPassword('');
      setEditConfirmPassword('');
      playSuccessSound();
      onShowToast('Security password updated successfully!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update password. Verify current password.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        notificationSettings: {
          sound: soundEnabled,
          matchAlerts: matchAlertsEnabled,
          activityBadges: activityBadges,
          showAcademicBadge: showAcademicBadge
        },
        language: language,
        profileVisibility: (profilePrivate ? 'private' : 'public') as 'public' | 'private',
        hidePhone: profilePrivate,
        isPhonePrivate: profilePrivate,
        preferredContactMethod: preferredContactMethod,
        accountSettings: {
          preferredContactMethod: preferredContactMethod,
          autoFillDetails: autoFillDetails
        }
      };
      const updated = await onUpdateUser(payload);
      if (updated) {
        try {
          localStorage.setItem('jkkniu_user', JSON.stringify(updated));
        } catch {}
      }
      if (soundEnabled) playSuccessSound();
      onShowToast('Account preferences updated successfully!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update preferences.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportUserData = async () => {
    try {
      setIsExportingData(true);
      const res = await apiFetch('/auth/profile/export-data');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `jkkniu-retrievers-activity-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (soundEnabled) playSuccessSound();
      onShowToast('Your account activity and reports exported successfully!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to export account activity.', 'error');
    } finally {
      setIsExportingData(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setIsClearingCache(true);
      Object.keys(localStorage).forEach(k => {
        if (k !== 'jkkniu_token' && k !== 'jkkniu_user' && k !== 'jkkniu_theme') {
          localStorage.removeItem(k);
        }
      });
      const fresh = await apiFetch('/auth/me');
      if (fresh && fresh.user) {
        localStorage.setItem('jkkniu_user', JSON.stringify(fresh.user));
      }
      if (soundEnabled) playSuccessSound();
      onShowToast('Local application cache cleaned & session refreshed!', 'success');
    } catch (err: any) {
      onShowToast('Cache reset successfully!', 'success');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleDeleteAccount = async () => {
    const entered = confirmStudentId.trim().toLowerCase();
    const userReg = String(user?.registrationNumber || user?.studentId || user?.student_id || editStudentId || '').trim().toLowerCase();
    const userRoll = String(user?.classRoll || user?.rollNumber || user?.roll || editClassRoll || '').trim().toLowerCase();
    const userEmail = String(user?.email || '').trim().toLowerCase();

    const isMatched = (
      !entered && !userReg && !userEmail
    ) || (
      (userReg && entered === userReg) ||
      (userRoll && entered === userRoll) ||
      (userEmail && entered === userEmail) ||
      (entered && userReg && userReg.includes(entered)) ||
      (entered && userEmail && userEmail.includes(entered))
    );

    if (!isMatched && (userReg || userEmail)) {
      const hint = user?.registrationNumber || user?.studentId || user?.email || '';
      onShowToast(`Identification does not match. Enter your registered ${hint ? `Registration No. (${hint})` : 'Email or Student ID'}`, 'error');
      return;
    }

    if (deleteTextConfirm.trim().toUpperCase() !== 'DELETE') {
      onShowToast('Please type "DELETE" exactly to confirm account deletion.', 'error');
      return;
    }

    const hasPassword = user?.provider !== 'google' && !user?.firebaseUid?.startsWith('google-');
    if (hasPassword && !deletePasswordConfirm) {
      onShowToast('Please enter your account password to authorize deletion.', 'error');
      return;
    }

    try {
      setIsDeleting(true);
      const response = await apiFetch('/auth/delete-account', {
        method: 'DELETE',
        bodyData: { 
          password: deletePasswordConfirm,
          confirmId: confirmStudentId.trim()
        }
      });
      onShowToast(response.message || 'Account deleted successfully.', 'success');
      setShowDeleteModal(false);
      setConfirmStudentId('');
      setDeleteTextConfirm('');
      setDeletePasswordConfirm('');
      onLogout();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete account. Please verify your password.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editItemTitle.trim() || !editItemLocation.trim()) {
      onShowToast('Title and Location are required', 'error');
      return;
    }

    if (editItemImages.length === 0) {
      onShowToast('At least one listing image is required.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const res = await apiFetch(`/items/${editingItem.id}`, {
        method: 'PUT',
        bodyData: {
          title: editItemTitle,
          location: editItemLocation,
          category: editItemCategory,
          subcategory: editItemSubcategory,
          description: editItemDescription,
          emoji: editItemEmoji,
          specificSpot: editItemSpecificSpot,
          type: editItemType,
          rewardOffered: editItemType === 'lost' && editItemRewardOffered && editItemRewardAmount.trim() ? editItemRewardAmount.trim() : '',
          rewardAmount: editItemType === 'lost' && editItemRewardOffered && editItemRewardAmount.trim() ? editItemRewardAmount.trim() : undefined,
          images: editItemImages,
          coverImage: editItemImages[0].url,
          date: editItemDate,
          contactPreference: editItemContactPreference
        }
      });

      const updatedItems = items.map(item => {
        if (String(item.id) === String(editingItem.id)) {
          if (res && res.item) {
            return res.item;
          }
          return {
            ...item,
            title: editItemTitle,
            location: editItemLocation,
            category: editItemCategory,
            subcategory: editItemSubcategory,
            description: editItemDescription,
            emoji: editItemEmoji,
            specificSpot: editItemSpecificSpot,
            type: editItemType,
            rewardOffered: editItemType === 'lost' && editItemRewardOffered && editItemRewardAmount.trim() ? editItemRewardAmount.trim() : '',
            rewardAmount: editItemType === 'lost' && editItemRewardOffered && editItemRewardAmount.trim() ? editItemRewardAmount.trim() : undefined,
            images: editItemImages,
            coverImage: editItemImages[0].url,
            image: editItemImages[0].url,
            imageUrl: editItemImages[0].url,
            date: editItemDate,
            contactPreference: editItemContactPreference
          };
        }
        return item;
      });

      onUpdateItems(updatedItems);
      onShowToast(res?.message || 'Listing updated successfully!', 'success');
      setEditingItem(null);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update listing.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiFetch(`/items/${itemId}`, {
        method: 'DELETE'
      });
      const updatedItems = items.filter(item => String(item.id) !== String(itemId));
      onUpdateItems(updatedItems);
      onShowToast('Listing deleted successfully.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete listing.', 'error');
    }
  };

  const handleToggleStatus = async (itemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'returned' ? 'active' : 'returned';
    try {
      await apiFetch(`/items/${itemId}/status`, {
        method: 'PUT',
        bodyData: { status: nextStatus }
      });
      const updatedItems = items.map(item => {
        if (String(item.id) === String(itemId)) {
          return {
            ...item,
            status: nextStatus as any
          };
        }
        return item;
      });
      onUpdateItems(updatedItems);
      onShowToast(`Listing status updated to ${nextStatus === 'returned' ? 'Returned' : 'Active'}.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleToggleResolved = async (itemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'claimed' ? 'active' : 'claimed';
    try {
      await apiFetch(`/items/${itemId}/status`, {
        method: 'PUT',
        bodyData: { status: nextStatus }
      });
      const updatedItems = items.map(item => {
        if (String(item.id) === String(itemId)) {
          return {
            ...item,
            status: nextStatus as any
          };
        }
        return item;
      });
      onUpdateItems(updatedItems);
      onShowToast(`Listing status updated to ${nextStatus === 'claimed' ? 'Claimed' : 'Active'}.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update status.', 'error');
    }
  };

  // Filter items created by this logged-in user
  const myItems = items.filter(i => {
    if (i.isDeleted || i.status === 'deleted') return false;
    if (user?.id && (
      (i.userId && String(i.userId) === String(user.id)) ||
      ((i as any).firebaseUid && String((i as any).firebaseUid) === String(user.id)) ||
      ((i as any).ownerUid && String((i as any).ownerUid) === String(user.id)) ||
      (i.postedBy && (i.postedBy as any).userId && String((i.postedBy as any).userId) === String(user.id))
    )) {
      return true;
    }
    const userEmail = (user?.email || '').trim().toLowerCase();
    const itemEmail = (i.email || (i.postedBy as any)?.email || '').trim().toLowerCase();
    if (userEmail && itemEmail && userEmail === itemEmail) {
      return true;
    }
    return false;
  });

  const lostCount = myItems.filter(i => i.type === 'lost' && i.status !== 'returned' && i.status !== 'claimed' && i.status !== 'reunited' && i.status !== 'resolved' && i.approvalStatus !== 'rejected').length;
  const foundCount = myItems.filter(i => i.type === 'found' && i.status !== 'returned' && i.status !== 'claimed' && i.status !== 'reunited' && i.status !== 'resolved' && i.approvalStatus !== 'rejected').length;
  const reunitedCount = myItems.filter(i => i.status === 'returned' || i.status === 'claimed' || i.status === 'reunited' || i.status === 'resolved').length;
  const rejectedCount = myItems.filter(i => i.approvalStatus === 'rejected' || i.status === 'rejected' || (i as any).isRejected === true).length;
  const pendingCount = myItems.filter(i => (i.approvalStatus === 'pending' || i.status === 'pending') && i.approvalStatus !== 'rejected').length;

  const filteredMyItems = myItems.filter(i => {
    if (reportSearchQuery.trim()) {
      const q = reportSearchQuery.toLowerCase();
      const matchTitle = (i.title || '').toLowerCase().includes(q);
      const matchLoc = (i.location || '').toLowerCase().includes(q);
      const matchCat = (i.category || '').toLowerCase().includes(q);
      const matchDesc = (i.description || '').toLowerCase().includes(q);
      const matchSpot = (i.specificSpot || '').toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchCat && !matchDesc && !matchSpot) {
        return false;
      }
    }
    if (reportFilter === 'lost') {
      return i.type === 'lost' && i.status !== 'returned' && i.status !== 'claimed' && i.status !== 'reunited' && i.status !== 'resolved' && i.approvalStatus !== 'rejected';
    }
    if (reportFilter === 'found') {
      return i.type === 'found' && i.status !== 'returned' && i.status !== 'claimed' && i.status !== 'reunited' && i.status !== 'resolved' && i.approvalStatus !== 'rejected';
    }
    if (reportFilter === 'reunited') {
      return i.status === 'returned' || i.status === 'claimed' || i.status === 'reunited' || i.status === 'resolved';
    }
    if (reportFilter === 'rejected') {
      return i.approvalStatus === 'rejected' || i.status === 'rejected' || (i as any).isRejected === true;
    }
    if (reportFilter === 'pending') {
      return (i.approvalStatus === 'pending' || i.status === 'pending') && i.approvalStatus !== 'rejected';
    }
    return true;
  }).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0);
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0);
    if (timeA !== timeB) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });

  // Initials generator
  const getInitials = (name: string) => {
    if (!name || !name.trim()) return user?.role === 'admin' ? 'A' : 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 1) {
      return parts[0][0].toUpperCase();
    }
    return user?.role === 'admin' ? 'A' : 'U';
  };

  const tabsList = [
    { id: 'profile', label: 'My Profile', icon: User, desc: 'Manage your JKKNIU digital registry details' },
    { id: 'reports', label: 'My Reports', icon: FileText, desc: 'View, edit, or resolve your campus reports' },
    { id: 'saved', label: 'Saved Items', icon: Bookmark, desc: 'Your bookmarked campus listings & watchlist' },
    { id: 'settings', label: 'Account Settings', icon: Settings, desc: 'Set notifications, theme, and language' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Review direct messages and matches' },
    { id: 'logout', label: 'Logout', icon: LogOut, desc: 'Securely sign out of your account' }
  ] as const;

  const unreadNotifsCount = (notifications || []).filter(n => n.unread || n.isRead === false).length;

  const handleCopyItemLink = (item: Item, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const url = `${window.location.origin}${window.location.pathname}#item=${item.id}`;
      navigator.clipboard.writeText(url);
      setCopiedItemId(item.id);
      onShowToast(`Listing link for "${item.title}" copied to clipboard!`, 'success');
      setTimeout(() => {
        setCopiedItemId(prev => (prev === item.id ? null : prev));
      }, 2500);
    } catch {
      onShowToast('Could not copy link to clipboard.', 'error');
    }
  };

  const handleClearAllSaved = () => {
    const idsToClear = [...(savedItemIds || [])];
    idsToClear.forEach(id => onToggleSaveItem(id));
    setShowClearSavedConfirm(false);
    onShowToast(`Cleared all ${idsToClear.length} saved bookmarks.`, 'info');
  };

  // Autocomplete location filtering
  const editFilteredGroups = LOCATION_GROUPS.filter(group => {
    if (!editLocationCategory) return true;
    return group.id === editLocationCategory || group.name === editLocationCategory;
  }).map(group => {
    const isGroupMatch = group.name.toLowerCase().includes(editLocationSearchTerm.toLowerCase());
    const matchingItems = group.items.filter(item => 
      isGroupMatch ||
      item.name.toLowerCase().includes(editLocationSearchTerm.toLowerCase()) ||
      (item.subgroup && item.subgroup.toLowerCase().includes(editLocationSearchTerm.toLowerCase()))
    );
    return { ...group, items: matchingItems };
  }).filter(group => group.items.length > 0);

  const editVisibleItemNames = editFilteredGroups.flatMap(group => {
    const expanded = editLocationSearchTerm || editLocationCategory || editExpandedGroup === group.id;
    if (expanded) {
      return group.items.map(item => item.name);
    }
    return [];
  });

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="bg-white dark:bg-[#111B27] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-[min(calc(100vw-24px),64rem)] h-[90vh] sm:h-[84vh] flex flex-col md:grid md:grid-cols-[270px_1fr] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        
        {/* Left Sidebar Menu */}
        <aside className={`bg-slate-50 dark:bg-[#0B131F] p-4 sm:p-5 flex-col justify-between border-r border-slate-200 dark:border-slate-800/80 overflow-y-auto ${currentMobileView === 'menu' ? 'flex w-full h-full' : 'hidden md:flex'}`}>
          <div className="space-y-5">
            {/* User Capsule */}
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#162232] rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs ring-2 ring-amber-400/30 overflow-hidden relative shrink-0 select-none">
                {hasValidAvatar && !sidebarAvatarError ? (
                  <img 
                    src={activeAvatar} 
                    alt={user?.fullName || 'User Avatar'} 
                    className="w-full h-full object-cover rounded-full" 
                    referrerPolicy="no-referrer"
                    onError={() => setSidebarAvatarError(true)}
                  />
                ) : (
                  getInitials(user?.fullName || (user?.role === 'admin' ? 'Admin' : 'User'))
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-950 dark:text-white truncate">{user?.fullName || (user?.role === 'admin' ? 'Admin' : 'Student Member')}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-semibold">{user?.email || 'student@jkkniu.edu.bd'}</p>
                <div className="inline-flex items-center gap-1 text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider mt-1 border border-amber-300/80 dark:border-amber-800/80">
                  {user?.role === 'admin' ? '🛡️ Administrator' : user?.role === 'moderator' ? '👔 Moderator' : '🎓 Student Member'}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2.5 mb-2">Account Dashboard</p>
              <nav className="flex flex-col gap-1">
                {tabsList.map(tab => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  let badgeCount: number | null = null;
                  if (tab.id === 'saved' && (savedItemIds || []).length > 0) {
                    badgeCount = (savedItemIds || []).length;
                  } else if (tab.id === 'reports' && myItems.length > 0) {
                    badgeCount = myItems.length;
                  } else if (tab.id === 'notifications' && unreadNotifsCount > 0) {
                    badgeCount = unreadNotifsCount;
                  }

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onActiveTabChange(tab.id);
                        setEditingItem(null);
                        setCurrentMobileView('content');
                      }}
                      className={`group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-all duration-150 cursor-pointer ${
                        isActive 
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-black ring-1 ring-amber-400/60' 
                          : tab.id === 'logout'
                          ? 'text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-900/40 font-black'
                          : 'text-slate-800 dark:text-slate-200 font-bold hover:bg-white dark:hover:bg-[#162232] hover:text-slate-950 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-slate-950 text-amber-400'
                            : tab.id === 'logout'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-900 dark:bg-[#1B2A3D] dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950'
                        }`}>
                          <TabIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {badgeCount !== null && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                          isActive 
                            ? 'bg-slate-950 text-amber-300' 
                            : tab.id === 'notifications'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200'
                        }`}>
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold text-center mt-4 tracking-wider uppercase">
            JKKNIU · Lost &amp; Found Portal
          </div>
        </aside>

        {/* Right Content Panel */}
        <div className={`flex-col h-full overflow-hidden bg-slate-50/70 dark:bg-[#0D1520] ${currentMobileView === 'content' ? 'flex w-full h-full' : 'hidden md:flex'}`}>
          {/* Top Bar Header */}
          <header className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#111B27] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                type="button"
                onClick={() => setCurrentMobileView('menu')}
                className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B2635] border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Back to menu"
              >
                <ArrowRight className="w-4 h-4 rotate-180 text-amber-600 dark:text-amber-400" />
              </button>
              <div className="min-w-0">
                <h3 id="profile-modal-title" className="text-base sm:text-lg font-black text-slate-950 dark:text-white flex items-center gap-2 truncate">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-[#1B2A3D] border border-amber-300/80 dark:border-amber-700/50 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0">
                    {React.createElement(tabsList.find(t => t.id === activeTab)?.icon || User, { className: 'w-4 h-4 stroke-[2.5]' })}
                  </span>
                  <span className="truncate">{tabsList.find(t => t.id === activeTab)?.label}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5 truncate">
                  {tabsList.find(t => t.id === activeTab)?.desc}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B2635] dark:hover:bg-[#233144] border border-slate-200 dark:border-slate-700 transition-all text-slate-950 dark:text-white shadow-xs cursor-pointer hover:scale-105 flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </header>

          {/* Panel Content Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            
            {/* 1. MY PROFILE PANEL */}
            {activeTab === 'profile' && (
              <div className="animate-in fade-in duration-150 space-y-6 max-w-3xl">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Institutional ID Header Card */}
                  <div className="bg-gradient-to-br from-[#0D1B2A] to-[#152335] border border-amber-500/40 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start pb-3 border-b border-white/10 mb-4">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-amber-400 uppercase block">
                          {isStaff ? 'Official Staff Registry' : 'Campus Identity Registry'}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5">Jatiya Kabi Kazi Nazrul Islam University</h4>
                      </div>
                      {isStaff ? (
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 font-black uppercase px-2.5 py-1 rounded-md border border-amber-400/40 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-400" /> {user?.role === 'admin' ? 'Administrator' : 'Moderator'}
                        </span>
                      ) : (user as any)?.idVerificationStatus === 'verified' || user?.isVerified || (user as any)?.verified ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black uppercase px-2.5 py-1 rounded-md border border-emerald-500/40 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Account
                        </span>
                      ) : (user as any)?.idVerificationStatus === 'pending' ? (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 font-black uppercase px-2.5 py-1 rounded-md border border-blue-500/40 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> ID Review Pending
                        </span>
                      ) : (user as any)?.idVerificationStatus === 'rejected' ? (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 font-black uppercase px-2.5 py-1 rounded-md border border-rose-500/40 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" /> Verification Rejected
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black uppercase px-2.5 py-1 rounded-md border border-amber-500/40 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-400" /> Registry Incomplete
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative group/avatar">
                        <div className="w-16 h-16 rounded-full bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center border-2 border-amber-400 overflow-hidden shadow-md relative">
                          {isUploadingAvatar && (
                            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-[8px] font-black z-10">
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400 mb-1" />
                              <span>UPLOADING</span>
                            </div>
                          )}
                          {hasValidAvatar && !profileAvatarError ? (
                            <img 
                              src={activeAvatar} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                              onError={() => setProfileAvatarError(true)}
                            />
                          ) : (
                            getInitials(editName || user?.fullName || 'User')
                          )}
                        </div>
                        <input 
                          type="file" 
                          id="profile-avatar-upload" 
                          accept="image/*" 
                          onChange={handleAvatarChange} 
                          className="hidden" 
                          disabled={isUploadingAvatar}
                        />
                        <label 
                          htmlFor={isUploadingAvatar ? undefined : "profile-avatar-upload"} 
                          className={`absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-[10px] font-black text-white transition-opacity text-center uppercase p-1 ${isUploadingAvatar ? 'opacity-0 cursor-not-allowed' : 'opacity-0 group-hover/avatar:opacity-100 cursor-pointer'}`}
                        >
                          Change
                        </label>
                      </div>
                      <div>
                        <h5 className="text-base font-bold text-white">{editName || user?.fullName || 'Campus Member'}</h5>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {isStaff ? (
                            <>{editSessionYear || 'Official Staff'} {editStudentId ? `· ID: ${editStudentId}` : ''}</>
                          ) : (
                            <>
                              Reg: <strong className="text-amber-300">{editStudentId || user?.studentId || 'Not Set'}</strong>
                              {(editClassRoll || (user as any)?.classRoll || (user as any)?.rollNumber || (user as any)?.roll) && (
                                <> · Roll: <strong className="text-amber-300">{editClassRoll || (user as any)?.classRoll || (user as any)?.rollNumber || (user as any)?.roll}</strong></>
                              )}
                              {` · Session: `}<strong className="text-amber-300">{editSessionYear || user?.sessionYear || 'Not Set'}</strong>
                            </>
                          )}
                        </p>
                        <label htmlFor="profile-avatar-upload" className="text-xs font-bold text-amber-400 hover:underline cursor-pointer mt-1.5 inline-block">
                          Upload New Photo
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ID Verification Guidelines & Submissions for Students */}
                  {!isStaff && (() => {
                    const idStatus: 'verified' | 'pending' | 'rejected' | 'unverified' = 
                      (user as any)?.idVerificationStatus || (user?.isVerified || (user as any)?.is_verified || (user as any)?.verified ? 'verified' : 'unverified');
                    const idRemarks = (user as any)?.idVerificationRemarks || '';
                    const idDoc = (user as any)?.verificationDocument || '';
                    const idDocs = idDoc ? idDoc.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

                    // 1. VERIFIED STATE
                    if (idStatus === 'verified') {
                      return (
                        <div className="bg-emerald-50/80 dark:bg-[#10241B] border-2 border-emerald-500/40 dark:border-emerald-600/50 p-5 rounded-2xl space-y-4 shadow-sm">
                          <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80 dark:border-emerald-800/60 flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                                  Student ID Verified &amp; Approved
                                </h4>
                                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                                  Official Campus Identity Authenticated
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-950 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-300 flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified Member
                            </span>
                          </div>

                          <div className="bg-white/80 dark:bg-[#0E1A14] border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            <p>
                              Your JKKNIU Student ID card has been reviewed and verified by campus administrators. Your account holds active institutional authenticity credentials and verified trust badges across the platform.
                            </p>
                            {idRemarks && (
                              <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-2 text-[11px]">
                                <span className="font-extrabold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider shrink-0">Admin Remarks:</span>
                                <span className="text-slate-700 dark:text-slate-300">{idRemarks}</span>
                              </div>
                            )}
                          </div>

                          {idDocs.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <label className="block text-[11px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                                Verified ID Document Copies ({idDocs.length} {idDocs.length === 1 ? 'Side' : 'Sides'})
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {idDocs.map((docUrl, idx) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => setPreviewDocModalUrl(docUrl)}
                                    className="group relative rounded-xl overflow-hidden border-2 border-emerald-500/40 hover:border-emerald-500 h-28 bg-slate-100 dark:bg-slate-900 cursor-pointer transition-all shadow-xs"
                                    title="Click to view full image"
                                  >
                                    <img src={docUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={`Verified Document Side ${idx + 1}`} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2.5">
                                      <span className="text-[10px] font-black uppercase text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/30">
                                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                        {idx === 0 && idDocs.length > 1 ? 'Front Side' : idx === 1 && idDocs.length > 1 ? 'Back Side' : 'Verified ID'}
                                      </span>
                                      <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> View
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // 2. PENDING STATE
                    if (idStatus === 'pending') {
                      return (
                        <div className="bg-blue-50/80 dark:bg-[#0F1E2E] border-2 border-blue-400/50 dark:border-blue-700/60 p-5 rounded-2xl space-y-4 shadow-sm">
                          <div className="flex items-center justify-between pb-3 border-b border-blue-200/80 dark:border-blue-800/60 flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5 stroke-[2.5] animate-pulse" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                                  ID Verification Under Review
                                </h4>
                                <p className="text-[11px] text-blue-800 dark:text-blue-300 font-semibold">
                                  Pending Campus Coordinator Approval
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-950 dark:bg-blue-950/80 dark:border-blue-700 dark:text-blue-300 flex items-center gap-1 shadow-2xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" /> Review In Progress
                            </span>
                          </div>

                          <div className="bg-white/80 dark:bg-[#0D1824] border border-blue-200 dark:border-blue-800/80 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            <p>
                              Your two-sided student ID card submission has been received and safely queued. Campus coordinators are verifying your student registration details. You will receive an in-app alert once your review is completed.
                            </p>
                          </div>

                          {idDocs.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <label className="block text-[11px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                                Submitted ID Documents ({idDocs.length} {idDocs.length === 1 ? 'Side' : 'Sides'})
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {idDocs.map((docUrl, idx) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => setPreviewDocModalUrl(docUrl)}
                                    className="group relative rounded-xl overflow-hidden border-2 border-blue-400/40 hover:border-blue-500 h-28 bg-slate-100 dark:bg-slate-900 cursor-pointer transition-all shadow-xs"
                                    title="Click to view full image"
                                  >
                                    <img src={docUrl} className="w-full h-full object-cover opacity-90 transition-transform group-hover:scale-105" alt={`Pending Document Side ${idx + 1}`} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2.5">
                                      <span className="text-[10px] font-black uppercase text-blue-300 bg-slate-950/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-500/30">
                                        <Clock className="w-3 h-3 text-blue-400" />
                                        {idx === 0 && idDocs.length > 1 ? 'Submitted Front' : idx === 1 && idDocs.length > 1 ? 'Submitted Back' : 'Submitted Document'}
                                      </span>
                                      <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> View
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // 3. REJECTED OR UNVERIFIED STATE (With Resubmission Form)
                    const isRejected = idStatus === 'rejected';

                    return (
                      <div className={`border-2 p-5 rounded-2xl space-y-4 shadow-xs ${
                        isRejected 
                          ? 'bg-rose-50/80 dark:bg-[#201015] border-rose-400/70 dark:border-rose-800/70' 
                          : 'bg-white dark:bg-[#15202D] border-slate-200 dark:border-slate-800'
                      }`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between pb-3 border-b flex-wrap gap-2 ${
                          isRejected ? 'border-rose-200 dark:border-rose-900/60' : 'border-slate-200 dark:border-slate-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            {isRejected ? (
                              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            ) : (
                              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            )}
                            <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                              {isRejected ? 'ID Verification Declined · Resubmit ID Card' : 'Student ID Card Verification'}
                            </h4>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isRejected
                              ? 'bg-rose-100 border-rose-300 text-rose-950 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300'
                              : 'bg-amber-100 border-amber-300 text-amber-950 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300'
                          }`}>
                            {isRejected ? '✕ Verification Rejected' : 'Upload 2 Sides Required'}
                          </span>
                        </div>

                        {/* Remarks if Rejected */}
                        {isRejected && (
                          <div className="bg-white/90 dark:bg-[#170B0E] border border-rose-300 dark:border-rose-800/80 rounded-xl p-3.5 space-y-2 shadow-2xs">
                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-black uppercase tracking-wider">
                              <AlertCircle className="w-4 h-4" /> Reason / Coordinator Feedback:
                            </div>
                            <p className="text-xs font-bold text-slate-950 dark:text-rose-100 leading-relaxed pl-6">
                              {idRemarks || 'The previous submission was blurry, illegible, or incomplete. Please resubmit clear photos of both sides.'}
                            </p>
                          </div>
                        )}

                        {/* Description */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {isRejected 
                            ? 'Please take clear, well-lit photos of both the front and back of your JKKNIU student ID card and resubmit below for immediate re-evaluation.'
                            : 'To unlock verified member badges and institutional authenticity, upload clear photos of both the front and back of your JKKNIU student ID card.'
                          }
                        </p>

                        {/* 2-Sided Upload Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          {/* Front Side */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                              1. Front Side Image <span className="text-rose-500 font-extrabold">*Required</span>
                            </label>
                            {frontImageUrl ? (
                              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 h-28 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                <img src={frontImageUrl} className="w-full h-full object-cover" alt="Front Preview" />
                                <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                                  ✓ Front Ready
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFrontImageUrl('')}
                                  className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full text-xs shadow-md cursor-pointer hover:bg-rose-700"
                                  title="Remove Front Side"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-[#1B2635] rounded-xl p-3 h-28 cursor-pointer transition-all group">
                                <UploadCloud className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                                  {isUploadingFront ? 'Uploading Front...' : 'Upload Front Side'}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Name &amp; Photo side</span>
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
                                      const url = await uploadImageToStorage(file);
                                      setFrontImageUrl(url);
                                      onShowToast('Front ID image uploaded successfully!', 'success');
                                    } catch (err: any) {
                                      onShowToast('Front upload failed: ' + err.message, 'error');
                                    } finally {
                                      setIsUploadingFront(false);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          {/* Back Side */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                              2. Back Side Image <span className="text-rose-500 font-extrabold">*Required</span>
                            </label>
                            {backImageUrl ? (
                              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 h-28 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                <img src={backImageUrl} className="w-full h-full object-cover" alt="Back Preview" />
                                <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                                  ✓ Back Ready
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setBackImageUrl('')}
                                  className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full text-xs shadow-md cursor-pointer hover:bg-rose-700"
                                  title="Remove Back Side"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-[#1B2635] rounded-xl p-3 h-28 cursor-pointer transition-all group">
                                <UploadCloud className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                                  {isUploadingBack ? 'Uploading Back...' : 'Upload Back Side'}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Barcode &amp; Session side</span>
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
                                      const url = await uploadImageToStorage(file);
                                      setBackImageUrl(url);
                                      onShowToast('Back ID image uploaded successfully!', 'success');
                                    } catch (err: any) {
                                      onShowToast('Back upload failed: ' + err.message, 'error');
                                    } finally {
                                      setIsUploadingBack(false);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Submission Button */}
                        {frontImageUrl && backImageUrl ? (
                          <button
                            type="button"
                            disabled={isUploadingDoc}
                            onClick={async () => {
                              setIsUploadingDoc(true);
                              try {
                                const combinedUrl = `${frontImageUrl},${backImageUrl}`;
                                await apiFetch('/auth/submit-verification', {
                                  method: 'POST',
                                  bodyData: { verificationDocument: combinedUrl }
                                });
                                onShowToast(
                                  isRejected 
                                    ? 'ID Verification documents resubmitted successfully!' 
                                    : 'ID Verification documents submitted successfully!', 
                                  'success'
                                );
                                setFrontImageUrl('');
                                setBackImageUrl('');
                                if (onUpdateUser) {
                                  await onUpdateUser({});
                                }
                                const meRes = await apiFetch('/auth/me');
                                if (meRes?.user) {
                                  try {
                                    localStorage.setItem('jkkniu_user', JSON.stringify(meRes.user));
                                  } catch {}
                                  syncFormWithUser(meRes.user, true);
                                }
                              } catch (err: any) {
                                onShowToast('Submission failed: ' + err.message, 'error');
                              } finally {
                                setIsUploadingDoc(false);
                              }
                            }}
                            className={`w-full py-3 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-98 ${
                              isRejected
                                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                                : 'bg-slate-950 dark:bg-amber-500 hover:bg-slate-900 text-amber-300 dark:text-slate-950'
                            }`}
                          >
                            {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            <span>{isRejected ? 'Resubmit 2-Sided ID Verification Request' : 'Submit 2-Sided ID Verification Request'}</span>
                          </button>
                        ) : (
                          <div className="text-center py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                            {!frontImageUrl && !backImageUrl
                              ? '⚠️ Please upload both Front and Back sides to submit verification'
                              : !frontImageUrl
                              ? '⚠️ Please upload Front Side image to submit'
                              : '⚠️ Please upload Back Side image to submit'}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Full Legal Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => {
                            isDirtyRef.current = true;
                            setEditName(e.target.value);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all"
                          placeholder="Legal Name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Verified Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="email" 
                          value={user?.email || ''} 
                          disabled
                          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-[#111A26] text-slate-900 dark:text-slate-300 cursor-not-allowed font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          value={editPhone}
                          onChange={(e) => {
                            isDirtyRef.current = true;
                            setEditPhone(e.target.value);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all"
                          placeholder="+880 17XX-XXXXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                        {isStaff ? 'Staff / Employee ID' : 'Registration Number (5 Digits)'}
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          value={editStudentId}
                          onChange={(e) => {
                            isDirtyRef.current = true;
                            setEditStudentId(e.target.value);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all"
                          placeholder={isStaff ? "e.g. STAFF-109" : "e.g. 12345"}
                        />
                      </div>
                    </div>

                    {!isStaff && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                            Roll Number (8 Digits)
                          </label>
                          {expectedSessionEndYear && (
                            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                              Starts with: {expectedSessionEndYear}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                          <input 
                            type="text" 
                            maxLength={8}
                            value={editClassRoll}
                            onChange={(e) => {
                              isDirtyRef.current = true;
                              const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                              setEditClassRoll(val);
                            }}
                            className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all ${
                              editClassRoll && rollNumberError
                                ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/30 focus:border-rose-500'
                                : 'border-slate-300 dark:border-slate-700 focus:ring-amber-500/30 focus:border-amber-500'
                            }`}
                            placeholder={expectedSessionEndYear ? `e.g. ${expectedSessionEndYear}101001` : "e.g. 23101001"}
                          />
                        </div>
                        {editClassRoll && rollNumberError ? (
                          <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1 leading-tight">
                            {rollNumberError}
                          </p>
                        ) : (
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                            8 digits total (e.g. {expectedSessionEndYear || '23'} + 6 digits for session {editSessionYear || '2022-23'})
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                        {isStaff ? 'Administrative Unit / Faculty' : 'Faculty'}
                      </label>
                      <div className="relative">
                        <Landmark className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        {isStaff ? (
                          <input 
                            type="text"
                            value={editFaculty}
                            onChange={(e) => {
                              isDirtyRef.current = true;
                              setEditFaculty(e.target.value);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold transition-all"
                            placeholder="e.g. Administration"
                          />
                        ) : (
                          <select 
                            value={editFaculty}
                            onChange={(e) => {
                              isDirtyRef.current = true;
                              setEditFaculty(e.target.value);
                              setEditDepartment('');
                            }}
                            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold transition-all"
                          >
                            <option value="">Select Faculty</option>
                            {DEPARTMENT_GROUPS.map((group) => (
                              <option key={group.label} value={group.label}>
                                {group.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                        {isStaff ? 'Section / Department' : 'Department'}
                      </label>
                      <div className="relative">
                        <Landmark className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        {isStaff ? (
                          <input 
                            type="text"
                            value={editDepartment}
                            onChange={(e) => {
                              isDirtyRef.current = true;
                              setEditDepartment(e.target.value);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold transition-all"
                            placeholder="e.g. ICT Cell"
                          />
                        ) : (
                          <select 
                            value={editDepartment}
                            onChange={(e) => {
                              isDirtyRef.current = true;
                              setEditDepartment(e.target.value);
                            }}
                            disabled={!editFaculty}
                            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold transition-all disabled:opacity-50"
                          >
                            <option value="">
                              {!editFaculty ? 'Select Faculty first' : 'Select Department'}
                            </option>
                            {editFaculty &&
                              DEPARTMENT_GROUPS.find((g) => g.label.toLowerCase() === editFaculty.toLowerCase())
                                ?.departments.map((dept) => {
                                  const formatted = dept.aliases && dept.aliases.length > 0 && dept.aliases[0].length <= 5
                                    ? `${dept.name} (${dept.aliases[0]})`
                                    : dept.name;
                                  return (
                                    <option key={dept.name} value={dept.name}>
                                      {formatted}
                                    </option>
                                  );
                                })}
                            {editDepartment && !DEPARTMENT_GROUPS.some(g => g.departments.some(d => d.name.toLowerCase() === editDepartment.toLowerCase())) && (
                              <option value={editDepartment}>{editDepartment}</option>
                            )}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                        {isStaff ? 'Designation / Title' : 'Academic Session'}
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          value={editSessionYear}
                          onChange={(e) => {
                            isDirtyRef.current = true;
                            setEditSessionYear(e.target.value);
                          }}
                          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all"
                          placeholder={isStaff ? "e.g. ICT Coordinator" : "e.g. 2020-21"}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Gender</label>
                      <select 
                        value={editGender}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setEditGender(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold transition-all"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Blood Group</label>
                      <select 
                        value={editBloodGroup}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setEditBloodGroup(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold transition-all"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Residential Hall</label>
                      <select 
                        value={editResidentialHall}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setEditResidentialHall(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold transition-all"
                      >
                        <option value="">Select Residential Hall</option>
                        <option value="Agnibina Hall">Agnibina Hall</option>
                        <option value="Bidrohi Hall">Bidrohi Hall</option>
                        <option value="Dolonchapa Hall">Dolonchapa Hall</option>
                        <option value="Shiulimala Hall">Shiulimala Hall</option>
                        <option value="Non-Residential">Non-Residential</option>
                        {editResidentialHall && !['Agnibina Hall', 'Bidrohi Hall', 'Dolonchapa Hall', 'Shiulimala Hall', 'Non-Residential'].includes(editResidentialHall) && (
                          <option value={editResidentialHall}>{editResidentialHall}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Social Profile (Facebook/LinkedIn)</label>
                      <input 
                        type="url" 
                        value={editSocialLink}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setEditSocialLink(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all"
                        placeholder="https://facebook.com/username"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Current Address</label>
                      <input 
                        type="text" 
                        value={editAddress}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setEditAddress(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all"
                        placeholder="e.g. Hall Room, Campus Area or Local Address"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">Bio / Introduction</label>
                      <textarea 
                        value={editBio}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setEditBio(e.target.value);
                        }}
                        rows={3}
                        className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none bg-white dark:bg-[#162232] text-slate-950 dark:text-white placeholder:text-slate-500 font-bold transition-all resize-none leading-relaxed"
                        placeholder="Brief intro about yourself..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-slate-950 dark:bg-amber-500 hover:bg-slate-900 text-amber-400 dark:text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving Registry...' : 'Save Profile Registry'}
                    </button>
                  </div>
                </form>

                {/* Account Deletion Area */}
                {user?.role !== 'admin' && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
                    <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-rose-950 dark:text-rose-200 flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Permanently Delete Account
                        </h4>
                        <p className="text-xs text-rose-900/80 dark:text-rose-300/80 font-medium mt-0.5">
                          Erase your account registry, listings, and claims permanently.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmStudentId('');
                          setDeleteTextConfirm('');
                          setDeletePasswordConfirm('');
                          setShowDeleteModal(true);
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer transition-all shrink-0 flex items-center gap-1.5 active:scale-98"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete My Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. MY REPORTS PANEL */}
            {activeTab === 'reports' && (
              <div className="animate-in fade-in duration-150">
                {editingItem ? (
                  /* Edit Post Form */
                  <form onSubmit={handleEditItemSubmit} className="space-y-6 max-w-2xl bg-white dark:bg-[#111B27] p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                          <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>Editing Post #{editingItem.id}</span>
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                          Update campus listing information and images
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="p-1.5 text-slate-500 hover:text-slate-950 dark:hover:text-white rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Report Type Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100">
                        Listing Type <span className="text-rose-600">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-[#1B2635] rounded-xl">
                        <button
                          type="button"
                          onClick={() => { setEditItemType('lost'); setEditItemEmoji('🎒'); }}
                          className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            editItemType === 'lost'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>I Lost This</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditItemType('found'); setEditItemEmoji('🔑'); }}
                          className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            editItemType === 'found'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span>I Found This</span>
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100">
                        Item Title <span className="text-rose-600">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={editItemTitle}
                        onChange={(e) => setEditItemTitle(e.target.value)}
                        className="w-full h-11 px-4 text-sm bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-bold outline-none focus:border-amber-500"
                        placeholder="e.g. Sony Wireless Headphones"
                        required
                      />
                    </div>

                    {/* Category, Subcategory, Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100 mb-1">
                          Category <span className="text-rose-600">*</span>
                        </label>
                        <select 
                          value={editItemCategory}
                          onChange={(e) => {
                            setEditItemCategory(e.target.value);
                            setEditItemSubcategory('');
                          }}
                          className="w-full h-10 px-3 text-xs bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-bold outline-none"
                        >
                          <option value="">Select Category</option>
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100 mb-1">
                          Subcategory
                        </label>
                        <select 
                          value={editItemSubcategory}
                          onChange={(e) => setEditItemSubcategory(e.target.value)}
                          disabled={!editItemCategory}
                          className="w-full h-10 px-3 text-xs bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-bold outline-none disabled:opacity-50"
                        >
                          <option value="">Select Subcategory</option>
                          {editItemCategory && CATEGORY_STRUCTURE.find(c => c.name === editItemCategory)?.subcategories.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100 mb-1">
                          Date <span className="text-rose-600">*</span>
                        </label>
                        <input 
                          type="date" 
                          value={editItemDate}
                          onChange={(e) => setEditItemDate(e.target.value)}
                          className="w-full h-10 px-3 text-xs bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-bold outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100 mb-1">
                          Location Category
                        </label>
                        <select 
                          value={editLocationCategory}
                          onChange={(e) => {
                            setEditLocationCategory(e.target.value);
                            setEditItemLocation('');
                          }}
                          className="w-full h-10 px-3 text-xs bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-bold outline-none"
                        >
                          <option value="">All Locations</option>
                          {LOCATION_GROUPS.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="relative" ref={editLocationDropdownRef}>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100 mb-1">
                          Campus Spot <span className="text-rose-600">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditLocationDropdownOpen(!editLocationDropdownOpen)}
                          className="w-full h-10 px-3 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-between text-left text-slate-950 dark:text-white cursor-pointer"
                        >
                          <span className="truncate">{editItemLocation || 'Select Area / Spot'}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </button>

                        {editLocationDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#15202D] shadow-xl z-50 overflow-hidden">
                            <div className="p-2 border-b border-slate-200 dark:border-slate-800">
                              <input
                                type="text"
                                placeholder="Search spots..."
                                value={editLocationSearchTerm}
                                onChange={(e) => setEditLocationSearchTerm(e.target.value)}
                                className="w-full text-xs py-1.5 px-2 bg-slate-100 dark:bg-[#1B2635] text-slate-950 dark:text-white rounded-lg outline-none font-bold"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                              {editFilteredGroups.map(grp => (
                                <div key={grp.id}>
                                  <div className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 px-2 py-1">
                                    {grp.name}
                                  </div>
                                  {grp.items.map(sub => (
                                    <button
                                      key={sub.name}
                                      type="button"
                                      onClick={() => {
                                        setEditItemLocation(sub.name);
                                        setEditLocationDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                                        editItemLocation === sub.name
                                          ? 'bg-amber-500 text-slate-950 font-black'
                                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1B2635]'
                                      }`}
                                    >
                                      <span>{sub.name}</span>
                                      {editItemLocation === sub.name && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Specific Spot */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100">
                        Specific Spot (Floor, Room, Desk)
                      </label>
                      <input 
                        type="text" 
                        value={editItemSpecificSpot}
                        onChange={(e) => setEditItemSpecificSpot(e.target.value)}
                        className="w-full h-10 px-4 text-xs bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-bold outline-none"
                        placeholder="e.g. 2nd Floor Library Corner"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-950 dark:text-slate-100">
                        Description <span className="text-rose-600">*</span>
                      </label>
                      <textarea 
                        value={editItemDescription}
                        onChange={(e) => setEditItemDescription(e.target.value)}
                        rows={3}
                        className="w-full p-3 text-xs bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-bold outline-none resize-none leading-relaxed"
                        placeholder="Provide details about appearance, markings, etc."
                        required
                      />
                    </div>

                    {/* Reward Toggle for Lost Posts */}
                    {editItemType === 'lost' && (
                      <div className="bg-slate-50 dark:bg-[#1B2635] p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-950 dark:text-white">
                          <input
                            type="checkbox"
                            checked={editItemRewardOffered}
                            onChange={(e) => {
                              setEditItemRewardOffered(e.target.checked);
                              if (!e.target.checked) setEditItemRewardAmount('');
                            }}
                            className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                          />
                          <span>🎁 Offer reward or treat to the finder (Optional)</span>
                        </label>
                        {editItemRewardOffered && (
                          <input 
                            type="text"
                            value={editItemRewardAmount}
                            onChange={(e) => setEditItemRewardAmount(e.target.value)}
                            placeholder="e.g. Tk. 500 reward, Cafeteria treat"
                            className="w-full px-3 py-2 bg-white dark:bg-[#162232] border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-950 dark:text-white outline-none"
                          />
                        )}
                      </div>
                    )}

                    {/* Image Upload Component */}
                    <div className="space-y-1.5">
                      <MultiImageUpload
                        images={editItemImages}
                        onChange={setEditItemImages}
                        onShowToast={onShowToast}
                        userId={user?.id}
                        maxImages={5}
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <button 
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-900 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 bg-slate-950 dark:bg-amber-500 hover:bg-slate-900 text-amber-300 dark:text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSaving ? 'Updating...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Reports List View */
                  <div className="space-y-4 max-w-3xl">
                    {/* Metrics Cards Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="bg-white dark:bg-[#15202D] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black shrink-0">
                          <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total</span>
                          <span className="text-lg font-black text-slate-950 dark:text-white leading-none">{myItems.length}</span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#15202D] p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 flex items-center gap-3 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-black shrink-0 border border-rose-200/60 dark:border-rose-900/50">
                          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 block uppercase tracking-wider">Lost</span>
                          <span className="text-lg font-black text-slate-950 dark:text-white leading-none">{lostCount}</span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#15202D] p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 flex items-center gap-3 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black shrink-0 border border-emerald-200/60 dark:border-emerald-900/50">
                          <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Found</span>
                          <span className="text-lg font-black text-slate-950 dark:text-white leading-none">{foundCount}</span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#15202D] p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 flex items-center gap-3 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-black shrink-0 border border-amber-200/60 dark:border-amber-900/50">
                          <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 block uppercase tracking-wider">Reunited</span>
                          <span className="text-lg font-black text-slate-950 dark:text-white leading-none">{reunitedCount}</span>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#15202D] p-3.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 flex items-center gap-3 shadow-xs col-span-2 sm:col-span-1">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black shrink-0 border border-indigo-200/60 dark:border-indigo-900/50">
                          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">Pending</span>
                          <span className="text-lg font-black text-slate-950 dark:text-white leading-none">{pendingCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="bg-white dark:bg-[#15202D] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={reportSearchQuery}
                          onChange={(e) => setReportSearchQuery(e.target.value)}
                          placeholder="Search your reports by title, location, category, or keywords..."
                          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-bold bg-slate-50 dark:bg-[#1B2635] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                        />
                        {reportSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setReportSearchQuery('')}
                            aria-label="Clear search"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-950 dark:hover:text-white p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Filter Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setReportFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            reportFilter === 'all'
                              ? 'bg-slate-950 dark:bg-amber-500 text-amber-300 dark:text-slate-950 shadow-xs ring-1 ring-amber-400/40'
                              : 'bg-slate-100 dark:bg-[#1B2635] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#233144] border border-slate-200 dark:border-slate-700/60'
                          }`}
                        >
                          <span>All</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-black/20">({myItems.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReportFilter('lost')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            reportFilter === 'lost'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-900/40'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Lost</span>
                          <span className="text-[10px] font-mono">({lostCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReportFilter('found')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            reportFilter === 'found'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-900/40'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span>Found</span>
                          <span className="text-[10px] font-mono">({foundCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReportFilter('reunited')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            reportFilter === 'reunited'
                              ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-900/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reunited</span>
                          <span className="text-[10px] font-mono">({reunitedCount})</span>
                        </button>

                        {pendingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setReportFilter('pending')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              reportFilter === 'pending'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/80 dark:border-indigo-900/40'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                            <span className="text-[10px] font-mono">({pendingCount})</span>
                          </button>
                        )}

                        {(reportFilter !== 'all' || reportSearchQuery) && (
                          <button
                            type="button"
                            onClick={() => {
                              setReportFilter('all');
                              setReportSearchQuery('');
                            }}
                            className="ml-auto text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1 py-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Filters</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Report Listings Cards */}
                    {filteredMyItems.length === 0 ? (
                      <div className="text-center py-12 px-4 bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-900/50">
                          <FileText className="w-7 h-7" />
                        </div>
                        <h4 className="text-base font-black text-slate-950 dark:text-white">No reports match your filters</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-sm mx-auto">
                          {reportSearchQuery ? 'Try adjusting your search terms or clearing active filters.' : 'You currently have no listings in this status view.'}
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onTabChange('post');
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Report New Item</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {filteredMyItems.map(item => {
                          const rewardVal = getRewardDetails(item);
                          const isResolved = item.status === 'returned' || item.status === 'reunited' || item.status === 'claimed';

                          return (
                            <div 
                              key={item.id}
                              className="bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-400/70 dark:hover:border-amber-500/50 transition-all space-y-3.5"
                            >
                              {/* Top Meta Line */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Type Badge */}
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                                    item.type === 'lost' 
                                      ? 'bg-rose-100 text-rose-900 border border-rose-300/80 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-900/60' 
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300/80 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-900/60'
                                  }`}>
                                    {item.type === 'lost' ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <Heart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                                    <span>{item.type.toUpperCase()} ITEM</span>
                                  </span>

                                  {/* Approval Status Badge */}
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                    item.approvalStatus === 'approved'
                                      ? 'bg-emerald-50 text-emerald-950 border border-emerald-300/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                                      : item.approvalStatus === 'rejected'
                                      ? 'bg-rose-50 text-rose-950 border border-rose-300/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                                      : 'bg-amber-50 text-amber-950 border border-amber-300/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                                  }`}>
                                    {item.approvalStatus === 'approved' ? (
                                      <><CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Approved</>
                                    ) : item.approvalStatus === 'rejected' ? (
                                      <><XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Rejected</>
                                    ) : (
                                      <><Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> In Review</>
                                    )}
                                  </span>

                                  {/* Resolution Badge */}
                                  {isResolved && (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center gap-1 shadow-xs">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Reunited
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  <span>{formatPostTime(item.createdAt || item.date)}</span>
                                </div>
                              </div>

                              {/* Card Content Row */}
                              <div className="flex flex-col sm:flex-row items-start gap-4">
                                {/* Thumbnail */}
                                <div 
                                  onClick={() => { onSelectItem(item); onClose(); }}
                                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-[#1B2635] border border-slate-200 dark:border-slate-700/80 flex items-center justify-center cursor-pointer relative group"
                                >
                                  {item.image ? (
                                    <>
                                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                      {item.images && item.images.length > 1 && (
                                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center text-[10px] font-black text-white">
                                          +{item.images.length - 1} photos
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#182333] text-amber-600 dark:text-amber-400">
                                      <Inbox className="w-8 h-8 opacity-75" />
                                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1">No Photo</span>
                                    </div>
                                  )}
                                </div>

                                {/* Details Column */}
                                <div className="min-w-0 flex-1 space-y-2">
                                  <h4 
                                    onClick={() => { onSelectItem(item); onClose(); }}
                                    className="font-black text-slate-950 dark:text-white text-base sm:text-lg leading-snug cursor-pointer hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                                  >
                                    {item.title}
                                  </h4>

                                  {/* Location & Spot */}
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                      <span className="font-black text-slate-950 dark:text-white">{item.location}</span>
                                    </span>
                                    {item.specificSpot && (
                                      <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#1B2635] px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700/60">
                                        Spot: {item.specificSpot}
                                      </span>
                                    )}
                                  </div>

                                  {/* Meta tags */}
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-950 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-900/50 px-2 py-0.5 rounded-md">
                                      <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span>{item.category}</span>
                                      {item.subcategory && <span className="opacity-75">· {item.subcategory}</span>}
                                    </span>

                                    {rewardVal && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-950 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                                        💰 ৳{rewardVal} Reward
                                      </span>
                                    )}

                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 py-0.5">
                                      <Eye className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                      <span>{item.views || 0} Views</span>
                                    </span>
                                  </div>

                                  {/* Description snippet */}
                                  {item.description && (
                                    <p className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#182333] border border-slate-200/80 dark:border-slate-800/80 p-2.5 rounded-xl font-medium line-clamp-2 leading-relaxed mt-1.5">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button 
                                    type="button"
                                    onClick={() => { onSelectItem(item); onClose(); }}
                                    className="px-3.5 py-1.5 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                    <span>View Listing</span>
                                  </button>

                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setEditingItem(item);
                                      setEditItemTitle(item.title);
                                      setEditItemLocation(item.location);
                                      setEditItemCategory(item.category);
                                      setEditItemSubcategory(item.subcategory || '');
                                      setEditItemDescription(item.description);
                                      setEditItemEmoji(item.emoji || '');
                                      setEditItemSpecificSpot(item.specificSpot || '');
                                      setEditItemType(item.type);
                                      const r = getRewardDetails(item);
                                      setEditItemRewardOffered(Boolean(r));
                                      setEditItemRewardAmount(r || '');
                                      setEditItemDate(item.date || '');
                                      setEditItemContactPreference((item as any).contactPreference || '');
                                      setEditItemImages(item.images || (item.image ? [{ url: item.image, storagePath: '', order: 1, isCover: true, width: 800, height: 600, uploadedAt: new Date().toISOString(), uploadedBy: user?.id || 'anonymous', fileSize: 0 }] : []));
                                    }}
                                    className="px-3.5 py-1.5 bg-white dark:bg-[#1B2635] hover:bg-slate-100 dark:hover:bg-[#233144] text-slate-900 dark:text-white rounded-xl text-xs font-black transition-all cursor-pointer border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>Edit Post</span>
                                  </button>

                                  {item.type === 'found' ? (
                                    <button 
                                      type="button"
                                      onClick={() => handleToggleResolved(item.id, item.status)}
                                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                        item.status === 'claimed'
                                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{item.status === 'claimed' ? 'Claimed' : 'Mark Reunited'}</span>
                                    </button>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={() => handleToggleStatus(item.id, item.status)}
                                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                        item.status === 'returned'
                                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{item.status === 'returned' ? 'Returned' : 'Mark Reunited'}</span>
                                    </button>
                                  )}
                                </div>

                                <div>
                                  {itemToDelete === item.id ? (
                                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-300 dark:border-rose-900 shadow-xs">
                                      <span className="text-[11px] text-rose-950 dark:text-rose-200 font-extrabold">Confirm Delete?</span>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          handleDeleteItem(item.id);
                                          setItemToDelete(null);
                                        }}
                                        className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-black cursor-pointer"
                                      >
                                        Yes
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setItemToDelete(null)}
                                        className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-md text-[10px] font-black cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={() => setItemToDelete(item.id)}
                                      className="px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. SAVED ITEMS PANEL */}
            {activeTab === 'saved' && (() => {
              const baseSaved = items.filter(i => (savedItemIds || []).includes(String(i.id)));
              const displayedSavedItems = baseSaved.filter(item => {
                if (savedSearchQuery.trim()) {
                  const q = savedSearchQuery.toLowerCase().trim();
                  const match = (item.title || '').toLowerCase().includes(q) ||
                                (item.location || '').toLowerCase().includes(q) ||
                                (item.category || '').toLowerCase().includes(q) ||
                                (item.description || '').toLowerCase().includes(q);
                  if (!match) return false;
                }
                if (savedTypeFilter === 'lost' && item.type !== 'lost') return false;
                if (savedTypeFilter === 'found' && item.type !== 'found') return false;
                if (savedTypeFilter === 'resolved' && item.status !== 'returned' && item.status !== 'claimed') return false;
                return true;
              });

              return (
                <div className="animate-in fade-in duration-150 space-y-4 max-w-3xl">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#15202D] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div>
                      <h4 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Saved Bookmarks ({baseSaved.length})</span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Your personalized campus watchlist for instant reference
                      </p>
                    </div>
                    {baseSaved.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowClearSavedConfirm(true)}
                        className="px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl border border-rose-200 dark:border-rose-900/40 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  {/* Search and Filters Bar */}
                  {baseSaved.length > 0 && (
                    <div className="bg-white dark:bg-[#15202D] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={savedSearchQuery}
                          onChange={(e) => setSavedSearchQuery(e.target.value)}
                          placeholder="Search bookmarks by title, area, or category..."
                          className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-bold bg-slate-50 dark:bg-[#1B2635] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        />
                        {savedSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSavedSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-950 dark:hover:text-white p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setSavedTypeFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            savedTypeFilter === 'all'
                              ? 'bg-slate-950 dark:bg-amber-500 text-amber-300 dark:text-slate-950 shadow-xs'
                              : 'bg-slate-100 dark:bg-[#1B2635] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#233144] border border-slate-200 dark:border-slate-700/60'
                          }`}
                        >
                          All ({baseSaved.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSavedTypeFilter('lost')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            savedTypeFilter === 'lost'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/40'
                          }`}
                        >
                          Lost
                        </button>
                        <button
                          type="button"
                          onClick={() => setSavedTypeFilter('found')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            savedTypeFilter === 'found'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/40'
                          }`}
                        >
                          Found
                        </button>
                        <button
                          type="button"
                          onClick={() => setSavedTypeFilter('resolved')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            savedTypeFilter === 'resolved'
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40'
                          }`}
                        >
                          Resolved
                        </button>
                      </div>
                    </div>
                  )}

                  {baseSaved.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-900/50">
                        <Bookmark className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-black text-slate-950 dark:text-white">Your Watchlist is Empty</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-sm mx-auto">
                        Bookmark lost and found items across campus to quickly track matches and updates here.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => { onClose(); onTabChange('listing'); }}
                          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
                        >
                          <Compass className="w-4 h-4" />
                          <span>Browse Campus Feed</span>
                        </button>
                      </div>
                    </div>
                  ) : displayedSavedItems.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
                      <p className="text-xs font-black text-slate-950 dark:text-white">No saved bookmarks match your search filters.</p>
                      <button
                        type="button"
                        onClick={() => { setSavedSearchQuery(''); setSavedTypeFilter('all'); }}
                        className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Reset Search
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {displayedSavedItems.map(item => (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-amber-400/60 transition-all flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                                item.type === 'lost' 
                                  ? 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/50' 
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/50'
                              }`}>
                                {item.type}
                              </span>
                              <button
                                type="button"
                                onClick={() => onToggleSaveItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                                title="Remove bookmark"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex gap-3 items-start">
                              {item.image && (
                                <img 
                                  src={item.image} 
                                  alt={item.title} 
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 
                                  onClick={() => { onSelectItem(item); onClose(); }}
                                  className="font-black text-slate-950 dark:text-white text-sm line-clamp-1 cursor-pointer hover:text-amber-700 dark:hover:text-amber-400"
                                >
                                  {item.title}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1 mt-1">
                                  <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                  <span className="truncate">{item.location}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { onSelectItem(item); onClose(); }}
                              className="flex-1 py-1.5 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>View Listing</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCopyItemLink(item, e)}
                              className="p-1.5 bg-slate-100 dark:bg-[#1B2635] text-slate-900 dark:text-white hover:bg-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                              title="Share listing link"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showClearSavedConfirm && (
                    <div 
                      onClick={() => setShowClearSavedConfirm(false)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-60 flex items-center justify-center p-4 animate-in fade-in duration-150"
                    >
                      <div 
                        onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-[#15202D] p-5 sm:p-6 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-950 dark:text-white">Clear All Bookmarks?</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                            Are you sure you want to remove all saved items from your campus watchlist?
                          </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowClearSavedConfirm(false)}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-900 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAllSaved}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-md"
                          >
                            Yes, Clear All
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4. ACCOUNT SETTINGS PANEL */}
            {activeTab === 'settings' && (
              <div className="animate-in fade-in duration-150 space-y-5 max-w-2xl">
                {/* Visual Appearance Theme Mode */}
                <div className="bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                      Appearance &amp; Theme Mode
                    </h5>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSelectThemeMode('light')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                        themeMode === 'light'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm ring-1 ring-amber-400'
                          : 'bg-slate-50 dark:bg-[#1B2635] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#233144]'
                      }`}
                    >
                      <Sun className="w-5 h-5" />
                      <span>Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectThemeMode('dark')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                        themeMode === 'dark'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm ring-1 ring-amber-400'
                          : 'bg-slate-50 dark:bg-[#1B2635] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#233144]'
                      }`}
                    >
                      <Moon className="w-5 h-5" />
                      <span>Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectThemeMode('system')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                        themeMode === 'system'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm ring-1 ring-amber-400'
                          : 'bg-slate-50 dark:bg-[#1B2635] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#233144]'
                      }`}
                    >
                      <Monitor className="w-5 h-5" />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                {/* Language & Notifications */}
                <div className="bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                      General Preferences
                    </h5>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5">
                      Interface Language
                    </label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#162232] text-slate-950 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500/30 outline-none"
                    >
                      <option value="EN">English (Default)</option>
                      <option value="BN">বাংলা (Bengali)</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-700/80 rounded-xl cursor-pointer bg-slate-50 dark:bg-[#1B2635]">
                    <div className="flex items-start gap-2.5">
                      <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <span className="block text-xs font-black text-slate-950 dark:text-white">Audio Chimes</span>
                        <span className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium">Play sounds on direct notifications</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={soundEnabled}
                      onChange={() => {
                        const next = !soundEnabled;
                        setSoundEnabled(next);
                        if (next) playNotificationSound();
                      }}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-700/80 rounded-xl cursor-pointer bg-slate-50 dark:bg-[#1B2635]">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <span className="block text-xs font-black text-slate-950 dark:text-white">Smart Match Alerts</span>
                        <span className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium">Highlight matching campus items automatically</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={matchAlertsEnabled}
                      onChange={() => setMatchAlertsEnabled(!matchAlertsEnabled)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                  </label>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings()}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-slate-950 dark:bg-amber-500 hover:bg-slate-900 text-amber-300 dark:text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
                    </button>
                  </div>
                </div>

                {/* Password Update */}
                <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                      Change Security Password
                    </h5>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5">Current Password</label>
                    <div className="relative">
                      <input 
                        type={showEditOldPassword ? "text" : "password"} 
                        value={editOldPassword}
                        onChange={(e) => setEditOldPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold focus:ring-2 focus:ring-amber-500/30 outline-none"
                        placeholder="Current Password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditOldPassword(!showEditOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                      >
                        {showEditOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5">New Password</label>
                      <div className="relative">
                        <input 
                          type={showEditPassword ? "text" : "password"} 
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold focus:ring-2 focus:ring-amber-500/30 outline-none"
                          placeholder="New Password (min 8 chars)"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <input 
                          type={showEditConfirmPassword ? "text" : "password"} 
                          value={editConfirmPassword}
                          onChange={(e) => setEditConfirmPassword(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#162232] text-slate-950 dark:text-white font-bold focus:ring-2 focus:ring-amber-500/30 outline-none"
                          placeholder="Confirm New Password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                        >
                          {showEditConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-slate-950 dark:bg-amber-500 hover:bg-slate-900 text-amber-300 dark:text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Updating...' : 'Update Password'}</span>
                    </button>
                  </div>
                </form>

                {/* Account Activity Tools */}
                <div className="bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h5 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                      Account Data &amp; Maintenance
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleExportUserData}
                      disabled={isExportingData}
                      className="flex items-center justify-center gap-2 p-3 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1B2635] hover:bg-slate-100 rounded-xl text-xs font-black text-slate-950 dark:text-slate-200 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{isExportingData ? 'Exporting...' : 'Export Activity (JSON)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={isClearingCache}
                      className="flex items-center justify-center gap-2 p-3 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1B2635] hover:bg-slate-100 rounded-xl text-xs font-black text-slate-950 dark:text-slate-200 cursor-pointer transition-all"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{isClearingCache ? 'Cleaning...' : 'Clear App Cache'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. NOTIFICATIONS PANEL */}
            {activeTab === 'notifications' && (
              <div className="animate-in fade-in duration-150 space-y-4 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Campus Alerts Log ({notifications.length})
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      Direct alerts, potential matches, and status updates
                    </p>
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {notifications.some(n => n.unread || n.isRead === false) && (
                        <button 
                          type="button"
                          onClick={onMarkAllNotificationsRead}
                          className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 transition-all shadow-2xs"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}

                      <button 
                        type="button"
                        onClick={onClearAllNotifications}
                        className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/60 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-all shadow-2xs"
                        title="Clear all alerts"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear all</span>
                      </button>
                    </div>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2 shadow-xs">
                    <Bell className="w-10 h-10 text-amber-500/50 mx-auto mb-2" />
                    <h4 className="text-base font-black text-slate-950 dark:text-white">All clear here</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">No new notifications or messages right now.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.map(notif => {
                      const formatted = formatNotificationContent(notif);
                      const { icon: NotifIcon, colorClass } = getNotificationIconAndColor(notif);
                      const isUnread = Boolean(notif.unread || notif.isRead === false);

                      return (
                        <div 
                          key={notif.id} 
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            handleNotificationClick({
                              notif,
                              items,
                              onSelectItem,
                              onTabChange,
                              onOpenUserModal: onActiveTabChange,
                              onCloseModal: onClose,
                              onShowToast,
                              onMarkRead: (id) => onMarkNotificationRead?.(id)
                            });
                          }}
                          className={`group p-4 rounded-2xl border flex items-start justify-between gap-3.5 transition-all cursor-pointer shadow-xs hover:shadow-sm ${
                            isUnread 
                              ? 'bg-amber-50/70 dark:bg-[#1A283B] border-amber-300 dark:border-amber-700/70 hover:border-amber-400' 
                              : 'bg-white dark:bg-[#15202D] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                              <NotifIcon className="w-4 h-4 stroke-[2.5]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p 
                                className="text-xs sm:text-sm text-slate-950 dark:text-white font-bold leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formatted.html }}
                              />
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatted.time}
                                </span>
                                {isUnread && (
                                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNotification?.(String(notif.id));
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-all cursor-pointer shrink-0"
                            title="Delete notification"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 6. LOGOUT MODAL INSIDE PANEL */}
            {activeTab === 'logout' && (
              <div className="animate-in fade-in duration-150 flex items-center justify-center py-6 sm:py-10">
                <div className="max-w-md w-full bg-white dark:bg-[#15202D] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50 shadow-sm">
                    <LogOut className="w-8 h-8 stroke-[2.5]" />
                  </div>

                  <div>
                    <h4 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white">Confirm Sign-Out</h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
                      Are you sure you want to sign out of your campus account?
                    </p>
                  </div>

                  {/* Identity Capsule */}
                  <div className="bg-slate-50 dark:bg-[#1B2635] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-left flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 overflow-hidden relative select-none ring-2 ring-amber-400/30">
                      {hasValidAvatar && !sidebarAvatarError ? (
                        <img 
                          src={activeAvatar} 
                          alt={user?.fullName || 'User Avatar'} 
                          className="w-full h-full object-cover rounded-full" 
                          referrerPolicy="no-referrer"
                          onError={() => setSidebarAvatarError(true)}
                        />
                      ) : (
                        getInitials(user?.fullName || (user?.role === 'admin' ? 'Admin' : 'User'))
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-950 dark:text-white truncate">{user?.fullName || (user?.role === 'admin' ? 'Admin' : 'Active User')}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">{user?.email || 'student@jkkniu.edu.bd'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => onActiveTabChange('profile')}
                      className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-slate-200 rounded-xl text-xs font-black cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        onClose();
                        onLogout();
                      }}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Image Crop Modal */}
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

      {/* ID Document Lightbox Modal */}
      {previewDocModalUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewDocModalUrl(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 text-white">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Student ID Verification Document
              </span>
              <button
                onClick={() => setPreviewDocModalUrl(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center max-h-[75vh] overflow-auto">
              <img 
                src={previewDocModalUrl} 
                alt="ID Document Full Preview" 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDocModalUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEDICATED DELETE ACCOUNT CONFIRMATION MODAL ── */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setConfirmStudentId('');
              setDeleteTextConfirm('');
              setDeletePasswordConfirm('');
            }
          }}
        >
          <div 
            className="bg-white dark:bg-[#15202D] border-2 border-rose-500/50 dark:border-rose-600/60 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                  Permanently Delete Account
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                  Warning: This action is irreversible!
                </p>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmStudentId('');
                  setDeleteTextConfirm('');
                  setDeletePasswordConfirm('');
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Details */}
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                <Trash2 className="w-4 h-4" /> Deleting your account will immediately:
              </p>
              <ul className="list-disc list-inside space-y-1 font-medium pl-1 text-[11.5px] leading-relaxed">
                <li>Permanently remove your student profile and verified badge</li>
                <li>Erase all active, returned, and pending lost &amp; found listings you posted</li>
                <li>Cancel all ownership claims and clear direct chat conversations</li>
              </ul>
            </div>

            {/* Form Container with Autofill Traps */}
            <form 
              autoComplete="off" 
              onSubmit={(e) => {
                e.preventDefault();
                if (deleteTextConfirm.trim().toUpperCase() === 'DELETE' && !isDeleting) {
                  handleDeleteAccount();
                }
              }}
              className="space-y-4"
            >
              {/* Hidden autofill traps to absorb browser credential manager auto-injection */}
              <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', zIndex: -1 }} aria-hidden="true">
                <input type="text" name="fake_username_remembered" tabIndex={-1} autoComplete="username" defaultValue="" />
                <input type="password" name="fake_password_remembered" tabIndex={-1} autoComplete="current-password" defaultValue="" />
              </div>

              {/* Form Fields */}
              <div className="space-y-3.5 pt-1">
                {/* Field 1: Registration ID / Email */}
                <div>
                  <label htmlFor="confirm_account_reg_id" className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>1. Student ID / Registration No. / Email</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      Account: {user?.registrationNumber || user?.studentId || user?.email}
                    </span>
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      id="confirm_account_reg_id"
                      name="confirm_account_reg_id"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      value={confirmStudentId}
                      onChange={(e) => setConfirmStudentId(e.target.value)}
                      placeholder={user?.registrationNumber ? `e.g. ${user.registrationNumber}` : "Enter your Registration Number or Email"}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#1B2635] text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
                    />
                  </div>
                </div>

                {/* Field 2: Type DELETE */}
                <div>
                  <label htmlFor="confirm_delete_phrase_action" className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>2. Type <span className="text-rose-600 dark:text-rose-400">"DELETE"</span> to confirm</span>
                    {deleteTextConfirm.trim().toUpperCase() === 'DELETE' ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Word Confirmed
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-bold">Required in uppercase</span>
                    )}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      id="confirm_delete_phrase_action"
                      name="confirm_delete_phrase_action"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      value={deleteTextConfirm}
                      onChange={(e) => setDeleteTextConfirm(e.target.value)}
                      placeholder="Type DELETE in capital letters"
                      className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-black font-mono tracking-wider border rounded-xl bg-slate-50 dark:bg-[#1B2635] text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                        deleteTextConfirm.trim().toUpperCase() === 'DELETE'
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-rose-400 dark:border-rose-700/80 focus:ring-2 focus:ring-rose-500/30'
                      }`}
                    />
                  </div>
                </div>

                {/* Field 3: Password */}
                {user?.provider !== 'google' && !user?.firebaseUid?.startsWith('google-') && (
                  <div>
                    <label htmlFor="confirm_delete_auth_token_key" className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                      3. Current Account Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showDeletePassword ? "text" : "password"}
                        id="confirm_delete_auth_token_key"
                        name="confirm_delete_auth_token_key"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        value={deletePasswordConfirm}
                        onChange={(e) => setDeletePasswordConfirm(e.target.value)}
                        placeholder="Enter your current account password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#1B2635] text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                      >
                        {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmStudentId('');
                    setDeleteTextConfirm('');
                    setDeletePasswordConfirm('');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl cursor-pointer transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || deleteTextConfirm.trim().toUpperCase() !== 'DELETE'}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting Everything...' : 'Permanently Delete My Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
