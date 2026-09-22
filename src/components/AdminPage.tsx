import { useState, useEffect } from 'react';
import { Shield, ListCheck, Users, Trash2, BarChart3, Settings, LogOut, Check, CheckCircle2, X, Eye, FileText, Hourglass, RefreshCw, RotateCcw, TrendingUp, Bell, ShieldAlert, ClipboardList, ShieldCheck, Inbox, Mail, Phone, MapPin, Calendar, Heart, Award, Clock, Facebook, Linkedin, User, GraduationCap, Building, Info, ArrowLeft, ArrowRight, Search, AlertTriangle, CheckSquare, Square, UserX, MessageSquare, Database, Server, HardDrive, Activity, SlidersHorizontal, Layers, Radio, Sparkles, Save } from 'lucide-react';
import { Item } from '../types';
import { formatPostTime } from '../utils/date';
import SearchHistoryChart from './SearchHistoryChart';
import AdminAnalyticsSection from './AdminAnalyticsSection';
import AdminNotificationsPanel from './AdminNotificationsPanel';
import ChatModerationPanel from './ChatModerationPanel';
import ActivityLogsPanel from './ActivityLogsPanel';
import ModeratorManagement from './ModeratorManagement';
import ProfilePage from './ProfilePage';
import { apiFetch, testMongoConnectivity, MongoDiagnosticResult } from '../utils/api';
import { DEPARTMENT_GROUPS } from '../data';
import { formatCaseId } from '../utils/caseFormat';

const resolveFaculty = (user: any) => {
  if (!user) return 'Not Specified';
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
  if (!faculty) {
    const userName = user.fullName || user.full_name || '';
    if (user.role === 'admin' || user.role === 'moderator' || user.role === 'staff' || userName.toLowerCase().includes('admin')) {
      return 'Central Administration';
    }
    return 'Not Specified';
  }
  return faculty;
};

const checkIsItemPending = (item: any) => {
  if (!item) return false;
  if (item.isDeleted || item.status === 'deleted') return false;
  const isApproved = item.approvalStatus === 'approved' || item.isApproved === true || item.status === 'approved' || item.status === 'active' || item.status === 'live' || item.status === 'resolved' || item.status === 'reunited';
  const isRejected = item.approvalStatus === 'rejected' || item.isRejected === true || item.status === 'rejected';
  if (isApproved || isRejected) return false;
  return item.approvalStatus === 'pending' || item.status === 'pending';
};

const checkIsItemRejected = (item: any) => {
  if (!item) return false;
  if (item.isDeleted || item.status === 'deleted') return false;
  return item.approvalStatus === 'rejected' || item.isRejected === true || item.status === 'rejected';
};

const checkIsItemReunited = (item: any) => {
  if (!item) return false;
  if (item.isDeleted || item.status === 'deleted') return false;
  return item.status === 'resolved' || item.status === 'reunited';
};

const checkIsItemLive = (item: any) => {
  if (!item) return false;
  if (item.isDeleted || item.status === 'deleted') return false;
  if (checkIsItemPending(item) || checkIsItemRejected(item) || checkIsItemReunited(item)) {
    return false;
  }
  return true;
};

interface AdminPageProps {
  pendingItems: Item[];
  deletedItems?: Item[];
  allItems?: Item[];
  onApproveItem: (id: string) => void;
  onRejectItem: (id: string, reason?: string) => void;
  onSelectItem: (item: Item) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  onRefresh?: () => void;
  user?: {
    fullName: string;
    email: string;
    role: 'student' | 'admin' | 'moderator';
    studentId?: string;
    department?: string;
    avatar?: string;
  } | null;
  onOpenUserModal?: (tab: 'profile' | 'settings' | 'reports' | 'saved') => void;
  onUpdateUser?: (updatedFields: any) => Promise<void> | any;
  onMessageUser?: (targetUser: any) => void;
}

export default function AdminPage({
  pendingItems,
  deletedItems = [],
  allItems = [],
  onApproveItem,
  onRejectItem,
  onSelectItem,
  onShowToast,
  activeSubTab: externalSubTab,
  onSubTabChange,
  onRefresh,
  user,
  onOpenUserModal,
  onUpdateUser,
  onMessageUser
}: AdminPageProps) {
  const [internalSubTab, setInternalSubTab] = useState('Overview');
  const activeSubTab = externalSubTab || internalSubTab;
  const setActiveSubTab = onSubTabChange || setInternalSubTab;
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inspectedUser, setInspectedUser] = useState<any | null>(null);
  const [modReason, setModReason] = useState('');
  const [isSubmittingMod, setIsSubmittingMod] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userRefreshTrigger, setUserRefreshTrigger] = useState(0);

  // User Management & Deletion states
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [showDeleteAllUsersConfirm, setShowDeleteAllUsersConfirm] = useState(false);
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState('');
  const [isDeletingAllUsers, setIsDeletingAllUsers] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isBatchDeletingUsers, setIsBatchDeletingUsers] = useState(false);
  const [userToDeleteSingle, setUserToDeleteSingle] = useState<any | null>(null);
  const [singleDeleteReason, setSingleDeleteReason] = useState('');
  const [isDeletingSingleUser, setIsDeletingSingleUser] = useState(false);

  const [globalConfirm, setGlobalConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: undefined
  });
  const [isProcessingGlobalConfirm, setIsProcessingGlobalConfirm] = useState(false);

  const handleModeratorUserAction = async (
    targetUserId: string,
    action: 'warn' | 'suspend' | 'reactivate' | 'delete' | 'ban' | 'unban' | 'lock' | 'unlock',
    reason: string,
    skipConfirm = false
  ) => {
    if (!reason.trim()) {
      onShowToast('Please provide a reason/explanation for this action.', 'error');
      return;
    }

    const highImpactActions = ['suspend', 'ban', 'warn', 'reactivate', 'unban', 'unlock', 'lock'];
    if (highImpactActions.includes(action) && !skipConfirm) {
      const actionLabels: Record<string, string> = {
        suspend: 'SUSPEND user account',
        ban: 'BAN user account from platform',
        warn: 'issue a formal WARNING to user',
        reactivate: 'REACTIVATE user account',
        unban: 'lift BAN from user account',
        lock: 'LOCK user account',
        unlock: 'UNLOCK user account'
      };
      
      const variantMap: Record<string, 'danger' | 'warning' | 'info'> = {
        suspend: 'danger',
        ban: 'danger',
        warn: 'warning',
        reactivate: 'info',
        unban: 'info',
        lock: 'warning',
        unlock: 'info'
      };

      setGlobalConfirm({
        isOpen: true,
        title: `⚠️ Confirm Moderator Action: ${action.toUpperCase()}`,
        message: `Are you absolutely sure you want to ${actionLabels[action] || action}?\n\nReason recorded:\n"${reason}"`,
        confirmText: `Proceed with ${action.toUpperCase()}`,
        cancelText: 'Cancel',
        variant: variantMap[action] || 'danger',
        onConfirm: () => handleModeratorUserAction(targetUserId, action, reason, true)
      });
      return;
    }
    
    setIsSubmittingMod(true);
    try {
      await apiFetch('/admin/moderation/user-action', {
        method: 'POST',
        bodyData: {
          targetUserId,
          action,
          reason
        }
      });
      
      onShowToast(`Successfully applied '${action}' action to user account!`, 'success');
      setModReason('');
      
      const statusMap: Record<string, string> = {
        suspend: 'suspended',
        ban: 'banned',
        lock: 'locked',
        reactivate: 'Active',
        unban: 'Active',
        unlock: 'Active'
      };

      // Update local states immediately
      setUsers(prev => {
        if (action === 'delete') {
          return prev.filter(u => String(u.id) !== String(targetUserId));
        }
        return prev.map(u => {
          if (String(u.id) === String(targetUserId)) {
            return {
              ...u,
              status: statusMap[action] || u.status
            };
          }
          return u;
        });
      });

      setInspectedUser(prev => {
        if (!prev || String(prev.id) !== String(targetUserId)) return prev;
        if (action === 'delete') return null;
        return {
          ...prev,
          status: statusMap[action] || prev.status
        };
      });

      // Propagate cascading deletes & updates to App.tsx global listings state immediately
      if (onRefresh) {
        onRefresh();
      }

    } catch (e: any) {
      onShowToast(e.message || `Failed to apply ${action} action.`, 'error');
    } finally {
      setIsSubmittingMod(false);
    }
  };
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedVerificationRequest, setSelectedVerificationRequest] = useState<any | null>(null);
  
  const [verificationToApprove, setVerificationToApprove] = useState<{ id: string; name: string } | null>(null);
  const [verificationToReject, setVerificationToReject] = useState<{ id: string; name: string } | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState<string>('The uploaded image is blurry or illegible. Please submit a high-quality picture.');

  const [itemToReject, setItemToReject] = useState<Item | null>(null);
  const [itemRejectReason, setItemRejectReason] = useState<string>('Spam listing or policy violation.');
  const [isRejectingAll, setIsRejectingAll] = useState<boolean>(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isRejectingBulk, setIsRejectingBulk] = useState<boolean>(false);
  const [itemFilterStatus, setItemFilterStatus] = useState<string>('all');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('all');

  const handleResolveItemDirect = (item: Item) => {
    setGlobalConfirm({
      isOpen: true,
      title: '🎉 Mark Listing as Reunited / Returned',
      message: `Are you sure you want to mark "${item.title}" (ID: #084${item.id}) as Reunited / Returned?\n\nThis will update its public status to Reunited on the campus feed.`,
      confirmText: 'Mark Reunited',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/items/${item.id}/status`, {
            method: 'PATCH',
            bodyData: { status: 'reunited' }
          });
          if (res && !res.error) {
            onShowToast(`Listing "${item.title}" marked as Reunited / Returned!`, 'success');
            if (onRefresh) onRefresh();
          } else {
            onShowToast(res?.error || 'Failed to update item status.', 'error');
          }
        } catch (err: any) {
          onShowToast(err.message || 'Error updating item status.', 'error');
        }
      }
    });
  };

  const handleReactivateItem = (item: Item) => {
    setGlobalConfirm({
      isOpen: true,
      title: '🔄 Reactivate Listing',
      message: `Do you want to re-open "${item.title}" (ID: #084${item.id}) back to Live / Active status?`,
      confirmText: 'Reactivate Listing',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/items/${item.id}/status`, {
            method: 'PATCH',
            bodyData: { status: 'active' }
          });
          if (res && !res.error) {
            onShowToast(`Listing "${item.title}" reactivated back to Live feed!`, 'success');
            if (onRefresh) onRefresh();
          } else {
            onShowToast(res?.error || 'Failed to reactivate listing.', 'error');
          }
        } catch (err: any) {
          onShowToast(err.message || 'Error reactivating listing.', 'error');
        }
      }
    });
  };

  const handleSoftDeleteItem = (item: Item) => {
    setGlobalConfirm({
      isOpen: true,
      title: '🗑️ Move Listing to Deleted Archive',
      message: `Are you sure you want to delete "${item.title}" (ID: #084${item.id})?\n\nThis will remove it from public view and move it to the Deleted archive.`,
      confirmText: 'Delete Listing',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/admin/items/${item.id}`, {
            method: 'DELETE'
          });
          if (res && !res.error) {
            onShowToast(`Listing "${item.title}" moved to deleted archive.`, 'success');
            if (onRefresh) onRefresh();
          } else {
            onShowToast(res?.error || 'Failed to delete listing.', 'error');
          }
        } catch (err: any) {
          onShowToast(err.message || 'Error deleting listing.', 'error');
        }
      }
    });
  };

  useEffect(() => {
    setSelectedItemIds([]);
  }, [activeSubTab]);

  const [unreadAdminNotifsCount, setUnreadAdminNotifsCount] = useState<number>(0);
  const [inspectingImages, setInspectingImages] = useState<{ urls: string[]; activeIndex: number } | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectedUser(null);
        setInspectingImages(null);
        setGlobalConfirm(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [inspectedUser, inspectingImages, globalConfirm.isOpen]);

  const isStaffAccount = (u: any) => {
    const role = String(u.role || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    return role === 'admin' || role === 'moderator' || role === 'coordinator' || email === 'nazrulretrievers@gmail.com';
  };

  const studentVerifications = pendingVerifications.filter((v: any) => 
    !isStaffAccount(v) && 
    (v.verificationDocument || v.idVerificationStatus === 'pending' || v.idVerificationStatus === 'verified' || v.idVerificationStatus === 'rejected')
  );

  const actualPendingCount = studentVerifications.filter((v: any) => v.idVerificationStatus === 'pending').length;
  const pendingReportsCount = (reports || []).filter((r: any) => r.status === 'pending').length;
  const filteredVerifications = studentVerifications.filter((v: any) => {
    if (verificationFilter === 'all') return true;
    return v.idVerificationStatus === verificationFilter;
  });

  const fetchAdminNotificationsCount = async () => {
    try {
      const res = await apiFetch('/admin/notifications?category=All');
      if (res && res.notifications) {
        const unread = res.notifications.filter((n: any) => n.isRead !== true && n.isRead !== 1).length;
        setUnreadAdminNotifsCount(unread);
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications count:', err);
    }
  };

  useEffect(() => {
    fetchAdminNotificationsCount();
    fetchReports();
    const interval = setInterval(() => {
      fetchAdminNotificationsCount();
      fetchReports();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchVerifications = async () => {
    setLoadingVerifications(true);
    try {
      const res = await apiFetch('/admin/verifications');
      if (res && res.verifications) {
        setPendingVerifications(res.verifications);
      } else {
        setPendingVerifications([]);
      }
    } catch (err) {
      console.warn('Failed to load pending verifications:', err);
      setPendingVerifications([]);
    } finally {
      setLoadingVerifications(false);
    }
  };

  const handleApproveVerification = async (userId: string, userName: string) => {
    setVerificationToApprove({ id: userId, name: userName });
  };

  const handleApproveVerificationDirect = async (userId: string, userName: string) => {
    try {
      // Optimistically update local state immediately
      setPendingVerifications(prev => prev.map(v => {
        if (String(v.id) === String(userId) || String(v.user_id) === String(userId)) {
          return {
            ...v,
            idVerificationStatus: 'verified',
            isVerified: true,
            is_verified: true,
            idVerificationRemarks: ''
          };
        }
        return v;
      }));

      const res = await apiFetch(`/admin/verifications/${userId}/approve`, {
        method: 'POST'
      });
      if (res && !res.error) {
        onShowToast(`Student ID for ${userName} approved successfully!`, 'success');
        await fetchVerifications();
        if (onRefresh) onRefresh();
      } else {
        onShowToast(res?.error || 'Failed to approve student ID.', 'error');
        await fetchVerifications();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error approving student ID.', 'error');
      await fetchVerifications();
    } finally {
      setVerificationToApprove(null);
    }
  };

  const handleRejectVerification = async (userId: string, userName: string) => {
    setRejectRemarks('The uploaded image is blurry or illegible. Please submit a high-quality picture.');
    setVerificationToReject({ id: userId, name: userName });
  };

  const handleRejectVerificationDirect = async (userId: string, userName: string, remarks: string) => {
    try {
      // Optimistically update local state immediately
      setPendingVerifications(prev => prev.map(v => {
        if (String(v.id) === String(userId) || String(v.user_id) === String(userId)) {
          return {
            ...v,
            idVerificationStatus: 'rejected',
            isVerified: false,
            is_verified: false,
            idVerificationRemarks: remarks
          };
        }
        return v;
      }));

      const res = await apiFetch(`/admin/verifications/${userId}/reject`, {
        method: 'POST',
        bodyData: { remarks }
      });
      if (res && !res.error) {
        onShowToast(`Student ID for ${userName} rejected.`, 'info');
        await fetchVerifications();
        if (onRefresh) onRefresh();
      } else {
        onShowToast(res?.error || 'Failed to reject student ID.', 'error');
        await fetchVerifications();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error rejecting student ID.', 'error');
      await fetchVerifications();
    } finally {
      setVerificationToReject(null);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'Verifications') {
      fetchVerifications();
    }
  }, [activeSubTab]);
  
  const [mongoStatus, setMongoStatus] = useState<MongoDiagnosticResult | null>(null);
  const [checkingMongo, setCheckingMongo] = useState(false);
  
  const [autoApprovePosts, setAutoApprovePosts] = useState(true);
  const [autoSpamFilter, setAutoSpamFilter] = useState(true);
  const [maxImageSize, setMaxImageSize] = useState('5 MB per image');
  const [archiveDuration, setArchiveDuration] = useState('30 Days Active');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const role = user?.role || 'student';

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await apiFetch('/admin/settings');
      if (res && res.settings) {
        setAutoApprovePosts(res.settings.autoApprovePosts);
        setAutoSpamFilter(res.settings.autoSpamFilter);
        setMaxImageSize(res.settings.maxImageSize);
        setArchiveDuration(res.settings.archiveDuration);
      }
    } catch (err: any) {
      console.error('Failed to fetch system settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await apiFetch('/admin/settings', {
        method: 'POST',
        bodyData: {
          autoApprovePosts,
          autoSpamFilter,
          maxImageSize,
          archiveDuration
        }
      });
      onShowToast(res.message || 'Admin configurations stored and synchronized successfully.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save admin settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    setAutoApprovePosts(true);
    setAutoSpamFilter(true);
    setMaxImageSize('5 MB per image');
    setArchiveDuration('30 Days Active');
    
    setSavingSettings(true);
    try {
      const res = await apiFetch('/admin/settings', {
        method: 'POST',
        bodyData: {
          autoApprovePosts: true,
          autoSpamFilter: true,
          maxImageSize: '5 MB per image',
          archiveDuration: '30 Days Active'
        }
      });
      onShowToast('System settings reset to academic defaults and synchronized.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to reset settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCheckMongoStatus = async () => {
    setCheckingMongo(true);
    try {
      const res = await testMongoConnectivity();
      setMongoStatus(res);
    } catch (err: any) {
      console.error('Failed to run mongo connectivity check:', err);
    } finally {
      setCheckingMongo(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'AdminPanel') {
      handleCheckMongoStatus();
      fetchSettings();
    }
  }, [activeSubTab]);

  const fetchStats = async (silent = false) => {
    if (!silent && !stats) {
      setLoadingStats(true);
    }
    try {
      const res = await apiFetch('/admin/stats');
      if (res && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await apiFetch('/admin/reports');
      if (res && res.reports) {
        setReports(res.reports);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.warn('Failed to load admin reports:', err);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleReportAction = async (reportId: any, action: 'resolved' | 'reviewed') => {
    try {
      const res = await apiFetch(`/admin/reports/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: action })
      });
      if (res && !res.error) {
        onShowToast(`Report status updated to ${action}!`, 'success');
        fetchReports();
      } else {
        onShowToast(res?.error || 'Failed to update report status.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error executing report action.', 'error');
    }
  };

  const handlePermanentDelete = async (itemId: string, title: string) => {
    if (role !== 'admin') {
      onShowToast('Permission denied: Only administrators can permanently delete records.', 'error');
      return;
    }

    setGlobalConfirm({
      isOpen: true,
      title: '🚨 Permanent Listing Deletion Alert',
      message: `Are you absolutely sure you want to PERMANENTLY delete "${title}" (ID: #084${itemId})?\n\nThis action is irreversible and will completely erase the listing, its image metadata, and any associated claims from the platform database forever.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/admin/items/${itemId}/permanent`, {
            method: 'DELETE'
          });
          if (res && !res.error) {
            onShowToast(`Listing "${title}" has been permanently deleted from the database.`, 'success');
            if (onRefresh) {
              onRefresh();
            }
          } else {
            onShowToast(res?.error || 'Failed to permanently delete listing.', 'error');
          }
        } catch (err: any) {
          onShowToast(err.message || 'Error permanently deleting listing.', 'error');
        }
      }
    });
  };

  useEffect(() => {
    if (activeSubTab === 'Reports') {
      fetchReports();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSubTab === 'Users') {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await apiFetch('/admin/users');
          if (res && res.users) {
            setUsers(res.users);
          } else {
            setUsers([]);
          }
        } catch (err) {
          console.warn('Failed to load admin users registry:', err);
          setUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [activeSubTab, userRefreshTrigger]);

  const handleSyncAfterUserDelete = (deletedIds: string[]) => {
    const stringDeletedIds = deletedIds.map(d => String(d));
    setUsers(prev => prev.filter(u => {
      const uId = String(u.id || u._id || '');
      return !stringDeletedIds.includes(uId);
    }));
    setSelectedUserIds(prev => prev.filter(id => !stringDeletedIds.includes(String(id))));
    fetchStats(true);
    fetchAdminNotificationsCount();
    setUserRefreshTrigger(prev => prev + 1);
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleDeleteSingleUser = async (targetUser: any, reason?: string) => {
    if (!targetUser) return;
    const targetUserId = String(targetUser.id || targetUser._id);
    const targetUserName = targetUser.fullName || targetUser.full_name || 'User';
    setIsDeletingSingleUser(true);
    try {
      const res = await apiFetch(`/admin/users/${targetUserId}`, {
        method: 'DELETE',
        bodyData: {
          reason: reason || 'Permanent account cascade deletion by Admin.'
        }
      });

      if (res && res.error) {
        onShowToast(res.error, 'error');
        return;
      }

      onShowToast(`User "${targetUserName}" and all their posts & claims were permanently deleted!`, 'success');
      handleSyncAfterUserDelete([targetUserId, String(res?.deletedUserId || '')]);
      setUserToDeleteSingle(null);
      setSingleDeleteReason('');
      setInspectedUser(null);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to permanently delete user.', 'error');
    } finally {
      setIsDeletingSingleUser(false);
    }
  };

  const handleBatchDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    setIsBatchDeletingUsers(true);
    try {
      const res = await apiFetch('/admin/users/batch-delete', {
        method: 'POST',
        bodyData: {
          userIds: selectedUserIds,
          reason: 'Batch cascade deletion by Admin.'
        }
      });

      if (res && res.error) {
        onShowToast(res.error, 'error');
        return;
      }

      const count = res?.deletedCount ?? selectedUserIds.length;
      const deletedIds = res?.deletedUserIds ?? selectedUserIds;
      onShowToast(`Successfully deleted ${count} user(s) and all their associated posts & claims!`, 'success');
      handleSyncAfterUserDelete(deletedIds);
      setShowBatchDeleteConfirm(false);
      setSelectedUserIds([]);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to batch delete selected users.', 'error');
    } finally {
      setIsBatchDeletingUsers(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    setIsDeletingAllUsers(true);
    try {
      const res = await apiFetch('/admin/users/delete-all', {
        method: 'POST',
        bodyData: {
          reason: 'Master global purge of user accounts and posts by Admin.'
        }
      });

      if (res && res.error) {
        onShowToast(res.error, 'error');
        return;
      }

      const count = res?.deletedCount ?? 0;
      const deletedIds = res?.deletedUserIds ?? [];
      onShowToast(`Successfully purged all ${count} users and all their posts & data from the database!`, 'success');
      handleSyncAfterUserDelete(deletedIds);
      setShowDeleteAllUsersConfirm(false);
      setDeleteAllConfirmInput('');
      setSelectedUserIds([]);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete all users.', 'error');
    } finally {
      setIsDeletingAllUsers(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'Overview') {
      fetchStats();
    }
  }, [activeSubTab]);

  const handleApprove = async (item: Item) => {
    await onApproveItem(item.id);
    setTimeout(() => {
      fetchStats();
    }, 600);
  };

  const handleReject = (item: Item) => {
    setIsRejectingAll(false);
    setItemRejectReason('Spam listing or policy violation.');
    setItemToReject(item);
  };

  const handleRejectAllPending = () => {
    setIsRejectingAll(true);
    setItemRejectReason('Spam listing or policy violation.');
    setItemToReject({ id: 'batch', title: 'All Pending Posts' } as any);
  };

  const handleBulkApprove = () => {
    const pendingIds = selectedItemIds.filter(id => {
      const it = allItems.find(i => String(i.id) === String(id));
      return it && checkIsItemPending(it);
    });

    if (pendingIds.length === 0) {
      onShowToast('None of the selected listings are pending approval.', 'info');
      return;
    }
    
    setGlobalConfirm({
      isOpen: true,
      title: '✅ Confirm Bulk Approval',
      message: `Are you sure you want to approve all ${pendingIds.length} selected pending posts?\n\nThis will immediately publish them and notify the authors.`,
      confirmText: `Approve ${pendingIds.length} Posts`,
      cancelText: 'Cancel',
      variant: 'info',
      onConfirm: async () => {
        const idsToProcess = [...pendingIds];
        setSelectedItemIds(prev => prev.filter(id => !idsToProcess.includes(id)));
        
        let successCount = 0;
        let failCount = 0;
        
        for (const id of idsToProcess) {
          try {
            await onApproveItem(id);
            successCount++;
          } catch (err) {
            console.error(`Failed to bulk approve item ${id}:`, err);
            failCount++;
          }
        }
        
        if (successCount > 0) {
          onShowToast(`Successfully approved ${successCount} listings!`, 'success');
        }
        if (failCount > 0) {
          onShowToast(`Failed to approve ${failCount} listings.`, 'error');
        }
        
        setTimeout(() => {
          fetchStats();
        }, 600);
      }
    });
  };

  const handleBulkReject = () => {
    const pendingIds = selectedItemIds.filter(id => {
      const it = allItems.find(i => String(i.id) === String(id));
      return it && checkIsItemPending(it);
    });

    if (pendingIds.length === 0) {
      onShowToast('None of the selected listings are pending moderation.', 'info');
      return;
    }
    setIsRejectingAll(false);
    setIsRejectingBulk(true);
    setItemRejectReason('Spam listing or policy violation.');
    setItemToReject({ id: 'bulk', title: `${pendingIds.length} Selected Pending Posts` } as any);
  };

  const handleBulkSoftDelete = () => {
    if (selectedItemIds.length === 0) return;
    
    setGlobalConfirm({
      isOpen: true,
      title: '🗑️ Move Selected Listings to Archive',
      message: `Are you sure you want to move the ${selectedItemIds.length} selected listings to the Deleted Archive?\n\nThey will be removed from public view and search results.`,
      confirmText: `Move ${selectedItemIds.length} to Trash`,
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        const idsToProcess = [...selectedItemIds];
        setSelectedItemIds([]);
        
        try {
          const res = await apiFetch('/admin/items/batch-delete', {
            method: 'POST',
            bodyData: { itemIds: idsToProcess }
          });
          if (res && !res.error) {
            onShowToast(res.message || `Successfully moved ${idsToProcess.length} listings to deleted archive!`, 'success');
          } else {
            throw new Error(res?.error || 'Failed to batch delete items');
          }
        } catch {
          // Fallback to individual requests
          let successCount = 0;
          let failCount = 0;
          for (const id of idsToProcess) {
            try {
              const res = await apiFetch(`/admin/items/${id}`, { method: 'DELETE' });
              if (res && !res.error) successCount++;
              else failCount++;
            } catch {
              failCount++;
            }
          }
          if (successCount > 0) onShowToast(`Successfully moved ${successCount} listings to deleted archive!`, 'success');
          if (failCount > 0) onShowToast(`Failed to archive ${failCount} listings.`, 'error');
        }
        
        if (onRefresh) {
          onRefresh();
        }
        setTimeout(() => {
          fetchStats();
        }, 600);
      }
    });
  };

  const handleBulkPermanentDelete = () => {
    if (role !== 'admin') {
      onShowToast('Permission denied: Only administrators can permanently delete records.', 'error');
      return;
    }

    if (selectedItemIds.length === 0) return;
    
    setGlobalConfirm({
      isOpen: true,
      title: '🚨 Confirm Bulk Permanent Deletion',
      message: `Are you absolutely sure you want to PERMANENTLY delete the ${selectedItemIds.length} selected listings?\n\nThis action is irreversible and will completely erase these listings, their image metadata, and associated claims from the platform database forever.`,
      confirmText: `Delete ${selectedItemIds.length} Listings`,
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        const idsToProcess = [...selectedItemIds];
        setSelectedItemIds([]);
        
        try {
          const res = await apiFetch('/admin/items/batch-permanent-delete', {
            method: 'POST',
            bodyData: { itemIds: idsToProcess }
          });
          if (res && !res.error) {
            onShowToast(res.message || `Successfully permanently deleted ${idsToProcess.length} listings!`, 'success');
          } else {
            throw new Error(res?.error || 'Failed to batch permanently delete items');
          }
        } catch {
          // Fallback to individual requests
          let successCount = 0;
          let failCount = 0;
          for (const id of idsToProcess) {
            try {
              const res = await apiFetch(`/admin/items/${id}/permanent`, { method: 'DELETE' });
              if (res && !res.error) successCount++;
              else failCount++;
            } catch {
              failCount++;
            }
          }
          if (successCount > 0) onShowToast(`Successfully permanently deleted ${successCount} listings!`, 'success');
          if (failCount > 0) onShowToast(`Failed to delete ${failCount} listings.`, 'error');
        }
        
        if (onRefresh) {
          onRefresh();
        }
        setTimeout(() => {
          fetchStats();
        }, 600);
      }
    });
  };

  const handleConfirmReject = async () => {
    if (!itemToReject) return;
    if (isRejectingBulk) {
      const pendingIds = selectedItemIds.filter(id => {
        const it = allItems.find(i => String(i.id) === String(id));
        return it && checkIsItemPending(it);
      });
      const idsToProcess = pendingIds.length > 0 ? pendingIds : [...selectedItemIds];
      setSelectedItemIds(prev => prev.filter(id => !idsToProcess.includes(id)));
      setItemToReject(null);
      setIsRejectingBulk(false);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const id of idsToProcess) {
        try {
          await onRejectItem(id, itemRejectReason);
          successCount++;
        } catch (err) {
          console.error(`Failed to bulk reject item ${id}:`, err);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        onShowToast(`Successfully rejected ${successCount} listings!`, 'info');
      }
      if (failCount > 0) {
        onShowToast(`Failed to reject ${failCount} listings.`, 'error');
      }
      
      setTimeout(() => {
        fetchStats();
      }, 600);
    } else if (isRejectingAll) {
      const pendingCopy = [...pendingItems];
      setItemToReject(null);
      setIsRejectingAll(false);
      // Run batch rejection
      for (const item of pendingCopy) {
        await onRejectItem(item.id, itemRejectReason);
      }
      onShowToast(`All ${pendingCopy.length} pending posts have been batch rejected.`, 'info');
      setTimeout(() => {
        fetchStats();
      }, 600);
    } else {
      const targetItem = itemToReject;
      setItemToReject(null);
      await onRejectItem(targetItem.id, itemRejectReason);
      setTimeout(() => {
        fetchStats();
      }, 600);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-68px)] bg-slate-50 dark:bg-brand-navy-dark">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold-mid"></div>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'moderator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-68px)] bg-slate-50 dark:bg-brand-navy-dark p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-2xl font-bold text-brand-navy mb-2">Access Denied</h3>
        <p className="text-sm text-brand-ink2 font-light max-w-md">
          You do not have the required administrative or coordinator permissions to access this page.
        </p>
      </div>
    );
  }

  const adminName = user?.fullName || (role === 'admin' ? 'Admin' : 'Staff Moderator');
  const adminEmail = user?.email || 'admin@jkkniu.edu.bd';
  const adminAvatar = user?.avatar || (user as any)?.profilePhoto || (user as any)?.profileImage || (user as any)?.profile_photo || (user as any)?.photoURL || '';
  const [adminAvatarError, setAdminAvatarError] = useState(false);

  useEffect(() => {
    setAdminAvatarError(false);
  }, [adminAvatar]);

  const hasAdminAvatar = Boolean(
    !adminAvatarError &&
    adminAvatar &&
    typeof adminAvatar === 'string' &&
    adminAvatar.trim() !== '' &&
    !adminAvatar.includes('default-avatar') &&
    (adminAvatar.startsWith('data:') || adminAvatar.startsWith('http') || adminAvatar.startsWith('/') || adminAvatar.startsWith('blob:'))
  );

  const getAdminInitials = (name: string) => {
    if (!name || !name.trim()) return 'A';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 1) {
      return parts[0][0].toUpperCase();
    }
    return role === 'admin' ? 'A' : 'M';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-[calc(100vh-68px)] bg-brand-cream dark:bg-[#070C14] transition-colors duration-300">
      {/* Sidebar Admin options */}
      <aside className="bg-brand-navy dark:bg-[#090E1A] p-6 flex flex-col hidden lg:block border-r border-brand-gold/10 dark:border-slate-800/80">
        {/* Admin Card */}
        <div 
          onClick={() => setActiveSubTab('MyProfile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveSubTab('MyProfile');
            }
          }}
          className="flex items-center gap-3 p-3.5 bg-white/5 hover:bg-white/10 rounded-xl border border-brand-gold/15 hover:border-brand-gold/35 transition-all mb-6 cursor-pointer group"
          title="Click to view and edit profile"
        >
          {hasAdminAvatar ? (
            <img 
              src={adminAvatar} 
              alt={adminName} 
              className="w-10 h-10 rounded-full border border-brand-gold/20 object-cover shrink-0 group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
              onError={() => setAdminAvatarError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-black flex items-center justify-center text-sm shrink-0 shadow-xs border border-brand-gold/30 select-none group-hover:scale-105 transition-transform">
              {getAdminInitials(adminName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate group-hover:text-brand-gold-mid transition-colors">{adminName}</div>
            <div className="text-[11px] text-white/50 truncate">{adminEmail}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] bg-brand-gold text-brand-navy px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                {role === 'moderator' ? 'Coordinator' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">Institutional Account</div>
        <div className="flex flex-col gap-1 mb-6">
          <button 
            onClick={() => setActiveSubTab('MyProfile')}
            className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'MyProfile' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <User aria-hidden="true" className="w-4 h-4 text-brand-gold" />
            <span>My Profile &amp; Info</span>
          </button>
        </div>

        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">Administration</div>
        <div className="flex flex-col gap-1 mb-6">
          <button 
            onClick={() => setActiveSubTab('Overview')}
            className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'Overview' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <BarChart3 aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'Overview' ? 'text-brand-gold' : ''}`} />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('Analytics')}
            className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'Analytics' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <TrendingUp aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'Analytics' ? 'text-brand-gold' : ''}`} />
            <span>Analytics</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('Pending')}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'Pending' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <span className="flex items-center gap-3">
              <ListCheck aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'Pending' ? 'text-brand-gold' : ''}`} />
              Item Management
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              pendingItems.length > 0 ? 'bg-rose-500 text-white shadow-xs' : 'bg-white/10 text-white/60'
            }`}>
              {pendingItems.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveSubTab('Users')}
            className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'Users' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <Users aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'Users' ? 'text-brand-gold' : ''}`} />
            <span>User Management</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('Reports')}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'Reports' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <span className="flex items-center gap-3">
              <Trash2 aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'Reports' ? 'text-brand-gold' : ''}`} />
              System Reports
            </span>
            {pendingReportsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                {pendingReportsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('Deleted')}
            className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'Deleted' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <Trash2 aria-hidden="true" className="w-4 h-4 text-rose-400" />
            <span>Deleted Listings</span>
          </button>
        </div>

        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">Security &amp; Moderation</div>
        <div className="flex flex-col gap-1 mb-6">
          <button 
            onClick={() => setActiveSubTab('AdminNotifications')}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'AdminNotifications' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'AdminNotifications' ? 'text-brand-gold' : ''}`} />
              Notification Center
            </span>
            {unreadAdminNotifsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                {unreadAdminNotifsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('ChatsModeration')}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'ChatsModeration' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <span className="flex items-center gap-3">
              <ShieldAlert aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'ChatsModeration' ? 'text-brand-gold' : ''}`} />
              Conversation Review
            </span>
            {pendingReportsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('Verifications')}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'Verifications' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <span className="flex items-center gap-3">
              <ShieldCheck aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'Verifications' ? 'text-brand-gold' : ''}`} />
              ID Verifications
            </span>
            {actualPendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                {actualPendingCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('ActivityLogs')}
            className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeSubTab === 'ActivityLogs' 
                ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
            }`}
          >
            <ClipboardList aria-hidden="true" className={`w-4 h-4 ${activeSubTab === 'ActivityLogs' ? 'text-brand-gold' : ''}`} />
            <span>Activity Audit Logs</span>
          </button>
        </div>

        {role === 'admin' && (
          <>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">System</div>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => setActiveSubTab('ModeratorManagement')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                  activeSubTab === 'ModeratorManagement' 
                    ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${activeSubTab === 'ModeratorManagement' ? 'text-brand-gold' : 'text-brand-gold-mid'}`} />
                <span>Moderator Management</span>
              </button>
              <button 
                onClick={() => setActiveSubTab('AdminPanel')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                  activeSubTab === 'AdminPanel' 
                    ? 'bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-brand-gold-mid font-semibold' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white rounded-lg'
                }`}
              >
                <Settings className={`w-4 h-4 ${activeSubTab === 'AdminPanel' ? 'text-brand-gold' : ''}`} />
                <span>Admin Panel</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Admin Content Area */}
      <main className="p-4 sm:p-6 md:p-10 bg-brand-cream dark:bg-[#070C14] overflow-y-auto min-w-0 flex-1 transition-colors duration-300">
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-serif text-xl sm:text-2xl md:text-2.5xl font-bold tracking-tight text-brand-navy dark:text-white">
                {role === 'moderator' ? 'Moderator Control Panel' : 'System Administration Console'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-brand-gold/20 text-brand-gold-mid border border-brand-gold/30">
                {role === 'moderator' ? 'Coordinator' : 'Admin'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-brand-ink2 dark:text-slate-400 font-light mt-1">
              Campus lost &amp; found administrative overview — <span className="text-amber-700 dark:text-amber-400 font-bold">{pendingItems.length} items awaiting coordinator review</span>
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-white dark:bg-[#0C1322] hover:bg-brand-cream dark:hover:bg-slate-800 text-brand-navy dark:text-white border border-brand-border dark:border-slate-800 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Synchronize all admin data"
              >
                <RefreshCw className="w-3.5 h-3.5 text-brand-navy dark:text-amber-400" />
                <span>Sync System</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveSubTab('Pending')}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-brand-navy hover:bg-brand-navy-mid text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <ListCheck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Review Queue ({pendingItems.length})</span>
            </button>
          </div>
        </div>

        {/* Mobile/Responsive Sub-tabs Navigation */}
        <div className="flex lg:hidden bg-white dark:bg-[#0C1322] p-1.5 rounded-2xl mb-6 border border-brand-border dark:border-slate-800 shadow-xs gap-1.5 overflow-x-auto no-scrollbar touch-scroll">
          <button
            type="button"
            onClick={() => setActiveSubTab('MyProfile')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'MyProfile'
                ? 'bg-brand-navy text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <User className={`w-3.5 h-3.5 ${activeSubTab === 'MyProfile' ? 'text-brand-gold' : ''}`} />
            My Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Overview')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'Overview'
                ? 'bg-brand-navy text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className={`w-3.5 h-3.5 ${activeSubTab === 'Overview' ? 'text-brand-gold' : ''}`} />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Analytics')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'Analytics'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${activeSubTab === 'Analytics' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Pending')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'Pending'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ListCheck className={`w-3.5 h-3.5 ${activeSubTab === 'Pending' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Item Management ({allItems.filter(i => !i.isDeleted && i.status !== 'deleted').length})
            {pendingItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {pendingItems.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Users')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'Users'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeSubTab === 'Users' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Users
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Reports')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'Reports'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Trash2 className={`w-3.5 h-3.5 ${activeSubTab === 'Reports' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Reports
            {pendingReportsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {pendingReportsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Deleted')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'Deleted'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Deleted
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('AdminNotifications')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'AdminNotifications'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${activeSubTab === 'AdminNotifications' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Notifications
            {unreadAdminNotifsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {unreadAdminNotifsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ChatsModeration')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'ChatsModeration'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${activeSubTab === 'ChatsModeration' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Conversation Review
            {pendingReportsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ActivityLogs')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'ActivityLogs'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className={`w-3.5 h-3.5 ${activeSubTab === 'ActivityLogs' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Audit Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Verifications')}
            className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'Verifications'
                ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeSubTab === 'Verifications' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
            Verifications
            {actualPendingCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            )}
          </button>
          {role === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('ModeratorManagement')}
                className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                  activeSubTab === 'ModeratorManagement'
                    ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${activeSubTab === 'ModeratorManagement' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
                Moderators
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('AdminPanel')}
                className={`flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                  activeSubTab === 'AdminPanel'
                    ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className={`w-3.5 h-3.5 ${activeSubTab === 'AdminPanel' ? 'text-brand-gold dark:text-slate-950' : ''}`} />
                Settings &amp; Database
              </button>
            </>
          )}
        </div>

        {activeSubTab === 'Overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubTab('Users')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSubTab('Users'); } }}
                className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-brand-navy/30 dark:hover:border-slate-700 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-gold"
                title="Click to view User Registry"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-cream dark:bg-slate-800 border border-brand-border dark:border-slate-700 text-brand-navy dark:text-amber-400 flex items-center justify-center group-hover:bg-brand-navy group-hover:text-white dark:group-hover:bg-amber-400 dark:group-hover:text-slate-950 transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-brand-gold-mid uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    View Registry &rarr;
                  </span>
                </div>
                <div className="font-serif text-3xl font-black text-brand-navy dark:text-white tracking-tight">
                  {loadingStats ? <span className="text-sm font-sans font-medium text-slate-400">Loading...</span> : (stats?.totalUsers ?? '0')}
                </div>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center justify-between">
                  <span>Total Users</span>
                </p>
                {stats?.totalStaff !== undefined && (
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                    {stats.totalStudents || 0} Students · {stats.totalStaff || 0} Staff
                  </p>
                )}
              </div>

              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubTab('Analytics')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSubTab('Analytics'); } }}
                className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-amber-400/60 dark:hover:border-amber-500/50 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500"
                title="Click to view Posts Analytics"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white dark:group-hover:bg-amber-400 dark:group-hover:text-slate-950 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Analytics &rarr;
                  </span>
                </div>
                <div className="font-serif text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight transition-colors">
                  {loadingStats ? <span className="text-sm font-sans font-medium text-slate-400">Loading...</span> : (stats?.totalItems ?? '0')}
                </div>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Total Posts
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Active listings &amp; archived
                </p>
              </div>

              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubTab('Pending')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSubTab('Pending'); } }}
                className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-rose-400/60 dark:hover:border-rose-500/50 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500"
                title="Click to review Pending Approvals"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <Hourglass className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Review &rarr;
                  </span>
                </div>
                <div className="font-serif text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight transition-colors">
                  {pendingItems.length}
                </div>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Pending Approval
                </p>
                <p className="text-[11px] font-medium text-rose-600/90 dark:text-rose-400/90 mt-1 font-semibold">
                  Awaiting coordinator verification
                </p>
              </div>

              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubTab('Analytics')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSubTab('Analytics'); } }}
                className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-emerald-400/60 dark:hover:border-emerald-500/50 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Click to view Reunited & Returned Analytics"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Stats &rarr;
                  </span>
                </div>
                <div className="font-serif text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight transition-colors">
                  {loadingStats ? <span className="text-sm font-sans font-medium text-slate-400">Loading...</span> : (stats?.returnedItems ?? '0')}
                </div>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Returned Items
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Successfully matched &amp; returned
                </p>
              </div>
            </div>

            {/* Additional Admin Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubTab('Users')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSubTab('Users'); } }}
                className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-teal-400/60 dark:hover:border-teal-500/50 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-teal-500"
                title="Click to view Active Users in User Registry"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/50 text-teal-700 dark:text-teal-400 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    View &rarr;
                  </span>
                </div>
                <div className="font-serif text-3xl font-black text-teal-700 dark:text-teal-400 tracking-tight transition-colors">
                  {loadingStats ? <span className="text-sm font-sans font-medium text-slate-400">Loading...</span> : (stats?.activeUsers ?? '0')}
                </div>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Active Users
                </p>
                {stats?.activeStudents !== undefined && (
                  <p className="text-[11px] font-medium text-teal-700/80 dark:text-teal-400/80 mt-1">
                    {stats.activeStudents || 0} Active Students
                  </p>
                )}
              </div>

              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubTab('Users')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSubTab('Users'); } }}
                className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-amber-400/60 dark:hover:border-amber-500/50 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500"
                title="Click to view Suspended Users in User Registry"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    View &rarr;
                  </span>
                </div>
                <div className="font-serif text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight transition-colors">
                  {loadingStats ? <span className="text-sm font-sans font-medium text-slate-400">Loading...</span> : (stats?.suspendedUsers ?? '0')}
                </div>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Suspended Users
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Access restricted accounts
                </p>
              </div>

              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveSubTab('Deleted')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSubTab('Deleted'); } }}
                className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-rose-400/60 dark:hover:border-rose-500/50 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500"
                title="Click to view Deleted Listings archive"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Archive &rarr;
                  </span>
                </div>
                <div className="font-serif text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight transition-colors">
                  {loadingStats ? <span className="text-sm font-sans font-medium text-slate-400">Loading...</span> : (stats?.deletedListings ?? '0')}
                </div>
                <p className="text-xs text-brand-ink2 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Deleted Listings
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Archived removal history
                </p>
              </div>
            </div>

            {/* D3 Search History Chart Card */}
            <div className="grid grid-cols-1 gap-6">
              <SearchHistoryChart />
            </div>
          </div>
        )}

        {activeSubTab === 'Analytics' && (
          <AdminAnalyticsSection items={allItems} />
        )}

        {activeSubTab === 'Pending' && (() => {
          // Exclude deleted items
          const nonDeletedItems = allItems.filter(i => !i.isDeleted && i.status !== 'deleted');

          // Count numbers for filter pills
          const pendingCount = nonDeletedItems.filter(checkIsItemPending).length;
          const approvedCount = nonDeletedItems.filter(checkIsItemLive).length;
          const lostCount = nonDeletedItems.filter(i => i.type === 'lost').length;
          const foundCount = nonDeletedItems.filter(i => i.type === 'found').length;
          const reunitedCount = nonDeletedItems.filter(checkIsItemReunited).length;
          const rejectedCount = nonDeletedItems.filter(checkIsItemRejected).length;

          const filteredItems = nonDeletedItems.filter(item => {
            const isItemPending = checkIsItemPending(item);
            const isItemLive = checkIsItemLive(item);
            const isItemReunited = checkIsItemReunited(item);
            const isItemRejected = checkIsItemRejected(item);

            // 1. Status / Type Filter
            if (itemFilterStatus === 'pending' && !isItemPending) return false;
            if (itemFilterStatus === 'approved' && !isItemLive) return false;
            if (itemFilterStatus === 'lost' && item.type !== 'lost') return false;
            if (itemFilterStatus === 'found' && item.type !== 'found') return false;
            if (itemFilterStatus === 'reunited' && !isItemReunited) return false;
            if (itemFilterStatus === 'rejected' && !isItemRejected) return false;

            // 2. Category Filter
            if (itemCategoryFilter !== 'all' && item.category !== itemCategoryFilter) {
              return false;
            }

            // 3. Search Query
            if (itemSearchQuery.trim()) {
              const q = itemSearchQuery.toLowerCase().trim();
              const matchTitle = item.title?.toLowerCase().includes(q);
              const matchDesc = item.description?.toLowerCase().includes(q);
              const matchId = String(item.id).toLowerCase().includes(q);
              const matchLoc = item.location?.toLowerCase().includes(q);
              const matchReporter = item.postedBy?.name?.toLowerCase().includes(q) || item.postedBy?.email?.toLowerCase().includes(q);
              const matchCategory = item.category?.toLowerCase().includes(q);
              if (!matchTitle && !matchDesc && !matchId && !matchLoc && !matchReporter && !matchCategory) {
                return false;
              }
            }

            return true;
          });

          const isAllItemsSelected = filteredItems.length > 0 && filteredItems.every(i => selectedItemIds.includes(String(i.id)));

          const toggleSelectAllItems = () => {
            if (isAllItemsSelected) {
              const filteredIds = filteredItems.map(i => String(i.id));
              setSelectedItemIds(prev => prev.filter(id => !filteredIds.includes(id)));
            } else {
              const filteredIds = filteredItems.map(i => String(i.id));
              setSelectedItemIds(prev => Array.from(new Set([...prev, ...filteredIds])));
            }
          };

          const toggleItemSelection = (id: string) => {
            setSelectedItemIds(prev =>
              prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
          };

          const selectedPendingInBatch = selectedItemIds.filter(id => {
            const it = nonDeletedItems.find(i => String(i.id) === id);
            return it && checkIsItemPending(it);
          });

          return (
            <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 overflow-hidden animate-in fade-in duration-200 space-y-6">
              {/* Header & Main Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                    <ListCheck className="w-5 h-5 text-brand-gold" />
                    Item Management &amp; Listings Moderation
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage, review, approve, update, and moderate all lost &amp; found listings across the university.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="px-3.5 py-2 text-brand-navy hover:bg-brand-cream bg-white rounded-xl border border-brand-border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Fetch Latest Listings from Database"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync Listings
                    </button>
                  )}
                  {pendingItems.length > 0 && (
                    <>
                      <button 
                        onClick={async () => {
                          const itemsToApprove = [...pendingItems];
                          for (const item of itemsToApprove) {
                            await onApproveItem(item.id);
                          }
                          onShowToast('All pending posts batch approved successfully!', 'success');
                          if (onRefresh) onRefresh();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-brand-gold to-brand-gold-mid hover:brightness-105 text-brand-navy font-bold text-xs rounded-xl shadow cursor-pointer"
                      >
                        Approve All Pending ({pendingItems.length})
                      </button>
                      <button 
                        type="button"
                        onClick={handleRejectAllPending}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
                      >
                        Reject All Pending
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-brand-border/40">
                <button
                  type="button"
                  onClick={() => setItemFilterStatus('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    itemFilterStatus === 'all'
                      ? 'bg-brand-navy text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <span>All Listings</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${itemFilterStatus === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {nonDeletedItems.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemFilterStatus('pending')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    itemFilterStatus === 'pending'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Hourglass className="w-3.5 h-3.5 shrink-0" />
                  <span>Pending Approval</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-black">
                    {pendingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemFilterStatus('approved')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    itemFilterStatus === 'approved'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                  <span>Live &amp; Approved</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${itemFilterStatus === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                    {approvedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemFilterStatus('lost')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    itemFilterStatus === 'lost'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span>🔍 Lost Items</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${itemFilterStatus === 'lost' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'}`}>
                    {lostCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemFilterStatus('found')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    itemFilterStatus === 'found'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  <span>📦 Found Items</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${itemFilterStatus === 'found' ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-900'}`}>
                    {foundCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemFilterStatus('reunited')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    itemFilterStatus === 'reunited'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <span>✓ Reunited</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${itemFilterStatus === 'reunited' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {reunitedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemFilterStatus('rejected')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
                    itemFilterStatus === 'rejected'
                      ? 'bg-rose-800 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <span>✕ Rejected</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${itemFilterStatus === 'rejected' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {rejectedCount}
                  </span>
                </button>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Search by Title, ID, Student Name, Location, Description..."
                    className="w-full pl-9 pr-4 py-2.5 bg-brand-cream border border-brand-border rounded-xl text-xs font-medium text-brand-navy focus:outline-none focus:border-amber-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                  {itemSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setItemSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={itemCategoryFilter}
                    onChange={(e) => setItemCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-brand-cream border border-brand-border rounded-xl text-xs font-semibold text-brand-navy focus:outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Wallets & Cards">Wallets &amp; Cards</option>
                    <option value="Keys & Locks">Keys &amp; Locks</option>
                    <option value="Documents & Books">Documents &amp; Books</option>
                    <option value="Bags & Accessories">Bags &amp; Accessories</option>
                    <option value="Clothing & Wearables">Clothing &amp; Wearables</option>
                    <option value="Jewelry & Watches">Jewelry &amp; Watches</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Single Consolidated Batch Action Toolbar */}
              {selectedItemIds.length > 0 && (
                <div className="bg-slate-900 text-white rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-gold text-brand-navy text-xs font-black shrink-0 shadow-xs">
                      {selectedItemIds.length}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-bold text-white">
                        {selectedItemIds.length} selected
                      </span>
                      <span className="text-white/30 hidden sm:inline">|</span>
                      <button
                        type="button"
                        onClick={toggleSelectAllItems}
                        className="text-brand-gold hover:underline cursor-pointer font-semibold"
                      >
                        {isAllItemsSelected ? 'Deselect all' : `Select all (${filteredItems.length})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIds([])}
                        className="text-white/60 hover:text-white underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                    {selectedPendingInBatch.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleBulkApprove}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          title="Approve selected pending posts"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          Approve ({selectedPendingInBatch.length})
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkReject}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          title="Reject selected pending posts"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          Reject ({selectedPendingInBatch.length})
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleBulkSoftDelete}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                      title="Move to Deleted Archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete ({selectedItemIds.length})
                    </button>
                    {role === 'admin' && (
                      <button
                        type="button"
                        onClick={handleBulkPermanentDelete}
                        className="px-2.5 py-1.5 bg-red-950 hover:bg-black text-rose-300 border border-rose-800/60 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        title="Permanently erase from database"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        Purge
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Items List / Table */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-brand-cream rounded-xl border border-dashed border-brand-border">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-base font-bold text-brand-navy">No listings match your search / filter</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try switching filters or clearing your search keywords to view all platform items.
                  </p>
                  {(itemSearchQuery || itemCategoryFilter !== 'all' || itemFilterStatus !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemSearchQuery('');
                        setItemCategoryFilter('all');
                        setItemFilterStatus('all');
                      }}
                      className="mt-3 px-3 py-1.5 bg-white border border-brand-border rounded-lg text-xs font-bold text-brand-navy hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-brand-border/80 shadow-sm bg-white overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-left min-w-[1100px]">
                      <thead>
                        <tr className="bg-brand-navy text-left text-xs font-bold text-white/90 uppercase tracking-wider">
                          <th className="p-3 w-12 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isAllItemsSelected}
                              onChange={toggleSelectAllItems}
                              className="w-4 h-4 rounded border-white/30 text-brand-gold focus:ring-brand-gold cursor-pointer"
                            />
                          </th>
                          <th className="p-3 w-16 text-center whitespace-nowrap">ID</th>
                          <th className="p-3 min-w-[300px]">Item Details</th>
                          <th className="p-3 w-24 text-center whitespace-nowrap">Type</th>
                          <th className="p-3 min-w-[220px]">Student Reporter</th>
                          <th className="p-3 w-32 whitespace-nowrap">Date / Time</th>
                          <th className="p-3 w-36 text-center whitespace-nowrap">Status</th>
                          <th className="p-3 w-40 text-right whitespace-nowrap pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-surface2 text-xs">
                        {filteredItems.map(item => {
                          const isChecked = selectedItemIds.includes(String(item.id));
                          const isItemPending = checkIsItemPending(item);
                          const isItemReunited = checkIsItemReunited(item);
                          const isItemRejected = checkIsItemRejected(item);
                          const isItemLive = checkIsItemLive(item);

                          return (
                            <tr key={item.id} className={`transition-colors ${isChecked ? 'bg-amber-50/90 hover:bg-amber-100/80' : 'hover:bg-slate-50/80'}`}>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleItemSelection(String(item.id))}
                                  className="w-4 h-4 rounded border-brand-border text-brand-gold focus:ring-brand-gold cursor-pointer"
                                />
                              </td>
                              <td className="p-3 font-mono text-xs font-black text-brand-navy text-center whitespace-nowrap">
                                #{item.id}
                              </td>
                              <td className="p-3 min-w-[300px]">
                                <div className="flex items-start gap-3">
                                  <span className="w-11 h-11 rounded-xl bg-brand-cream flex items-center justify-center text-xl select-none overflow-hidden border border-brand-border/80 relative shrink-0 shadow-2xs mt-0.5">
                                    {item.image || item.coverImage || (item.images && item.images[0]?.url) ? (
                                      <>
                                        <img 
                                          src={item.image || item.coverImage || (item.images && item.images[0]?.url)} 
                                          alt={item.title} 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer"
                                        />
                                        {item.images && item.images.length > 1 && (
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[9px] font-black text-white">
                                            +{item.images.length - 1}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-lg">{item.emoji || (item.type === 'lost' ? '🔍' : '📦')}</span>
                                    )}
                                  </span>
                                  <div className="flex flex-col min-w-0 pr-2">
                                    <span 
                                      className="font-serif font-bold text-brand-navy text-sm leading-snug break-words" 
                                      title={item.title}
                                    >
                                      {item.title}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                        {item.category || 'General'}
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-600 font-medium" title={item.location}>
                                        {item.location || 'Campus'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs ${
                                  item.type === 'lost' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                                  {item.type === 'lost' ? 'Lost' : 'Found'}
                                </span>
                              </td>
                              <td className="p-3 min-w-[220px]">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-brand-navy text-xs block leading-tight break-words" title={item.postedBy?.name || 'Student'}>
                                    {item.postedBy?.name || 'Student'}
                                  </span>
                                  <span className="text-[11px] text-slate-700 font-medium block leading-tight break-words" title={item.postedBy?.department || 'JKKNIU'}>
                                    {item.postedBy?.department || 'JKKNIU'}
                                  </span>
                                  {item.postedBy?.email && (
                                    <span className="text-[10px] text-slate-500 font-mono block leading-tight truncate max-w-[200px]" title={item.postedBy?.email}>
                                      {item.postedBy?.email}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-[11px] text-slate-600 whitespace-nowrap">
                                <span className="font-medium" title={item.createdAt ? new Date(item.createdAt).toLocaleString() : (item.date || '')}>
                                  {formatPostTime(item.createdAt || item.date)}
                                </span>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {isItemPending ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 font-black text-[10px] uppercase rounded-full tracking-wide shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                                    <span>Pending</span>
                                  </span>
                                ) : isItemReunited ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-950 border border-teal-300 font-black text-[10px] uppercase rounded-full tracking-wide shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                    <span>Reunited</span>
                                  </span>
                                ) : isItemRejected ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-950 border border-rose-300 font-black text-[10px] uppercase rounded-full tracking-wide shadow-2xs">
                                    <X className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                                    <span>Rejected</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-[10px] uppercase rounded-full tracking-wide shadow-2xs">
                                    <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3] shrink-0" />
                                    <span>Live</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3 pr-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isItemPending && (
                                    <>
                                      <button 
                                        onClick={() => handleApprove(item)}
                                        className="w-7 h-7 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-emerald-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                        title="Approve Listing"
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                      </button>
                                      <button 
                                        onClick={() => handleReject(item)}
                                        className="w-7 h-7 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-600 hover:text-white flex items-center justify-center text-rose-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                        title="Reject Listing"
                                      >
                                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                      </button>
                                    </>
                                  )}
                                  
                                  {isItemLive && (
                                    <button 
                                      onClick={() => handleResolveItemDirect(item)}
                                      className="w-7 h-7 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-600 hover:text-white flex items-center justify-center text-teal-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                      title="Mark as Reunited / Returned"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {isItemReunited && (
                                    <button 
                                      onClick={() => handleReactivateItem(item)}
                                      className="w-7 h-7 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-600 hover:text-white flex items-center justify-center text-amber-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                      title="Reactivate / Re-open Listing"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {isItemRejected && (
                                    <button 
                                      onClick={() => handleApprove(item)}
                                      className="w-7 h-7 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-emerald-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                      title="Re-approve Listing"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => onSelectItem(item)}
                                    className="w-7 h-7 rounded-lg border border-brand-border bg-white hover:bg-brand-cream hover:border-amber-500 hover:text-amber-800 flex items-center justify-center text-brand-navy transition-colors cursor-pointer shadow-2xs shrink-0"
                                    title="View Full Listing Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button 
                                    onClick={() => handleSoftDeleteItem(item)}
                                    className="w-7 h-7 rounded-lg border border-brand-border bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 flex items-center justify-center text-slate-400 transition-colors cursor-pointer shadow-2xs shrink-0"
                                    title="Delete Listing (Move to Archive)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeSubTab === 'Users' && (() => {
          const filteredUsers = users.filter((u: any) => {
            if (userSearchQuery.trim()) {
              const q = userSearchQuery.toLowerCase().trim();
              const name = String(u.fullName || u.full_name || '').toLowerCase();
              const email = String(u.email || '').toLowerCase();
              const studentId = String(u.studentId || u.student_id || '').toLowerCase();
              const dept = String(u.department || '').toLowerCase();
              const roll = String(u.rollNumber || u.classRoll || u.roll || '').toLowerCase();
              const roleStr = String(u.role || '').toLowerCase();
              if (!name.includes(q) && !email.includes(q) && !studentId.includes(q) && !dept.includes(q) && !roll.includes(q) && !roleStr.includes(q)) {
                return false;
              }
            }

            if (userRoleFilter !== 'all') {
              if (userRoleFilter === 'verified') {
                const isStaff = u.role === 'admin' || u.role === 'moderator' || u.role === 'coordinator' || String(u.email || '').toLowerCase() === 'nazrulretrievers@gmail.com';
                const isVer = !isStaff && !!(u.isVerified || u.is_verified || u.idVerificationStatus === 'verified');
                if (!isVer) return false;
              } else if (userRoleFilter === 'student') {
                if (u.role && u.role !== 'student') return false;
              } else if (userRoleFilter === 'moderator') {
                if (u.role !== 'moderator' && u.role !== 'coordinator') return false;
              } else if (userRoleFilter === 'admin') {
                if (u.role !== 'admin') return false;
              } else if (u.role !== userRoleFilter) {
                return false;
              }
            }

            if (userStatusFilter !== 'all') {
              const status = String(u.status || u.accountStatus || 'active').toLowerCase();
              if (userStatusFilter === 'active') {
                if (status === 'suspended' || status === 'banned' || status === 'locked' || u.isSuspended || u.isBanned) return false;
              } else if (userStatusFilter === 'suspended') {
                if (status !== 'suspended' && status !== 'locked' && !u.isSuspended) return false;
              } else if (userStatusFilter === 'banned') {
                if (status !== 'banned' && !u.isBanned) return false;
              } else if (userStatusFilter === 'flagged') {
                if (status !== 'flagged' && !u.isFlagged && !(u.warningCount && u.warningCount > 0)) return false;
              } else if (status !== userStatusFilter.toLowerCase()) {
                return false;
              }
            }

            return true;
          });

          const isUserProtected = (u: any) => {
            if (!u) return false;
            const isSuperAdminEmail = String(u.email || '').toLowerCase().trim() === 'nazrulretrievers@gmail.com';
            const isSuperAdminId = String(u.id || u._id || '') === '2';
            const isAdminRole = u.role === 'admin';

            const myId = String((user as any)?.id || (user as any)?._id || '');
            const myEmail = String(user?.email || '').toLowerCase().trim();
            const myStudentId = String(user?.studentId || '').trim();
            
            const uId = String(u.id || u._id || '');
            const uEmail = String(u.email || '').toLowerCase().trim();
            const uStudentId = String(u.studentId || u.student_id || '').trim();

            const isSelf = Boolean(
              (myId && uId && myId === uId) ||
              (myEmail && uEmail && myEmail === uEmail) ||
              (myStudentId && uStudentId && myStudentId !== '-' && myStudentId !== 'Not Setup' && myStudentId === uStudentId)
            );

            return isSuperAdminEmail || isSuperAdminId || isAdminRole || isSelf;
          };

          const selectableUsers = filteredUsers.filter(u => !isUserProtected(u));
          const isAllSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedUserIds.includes(String(u.id || u._id)));

          const toggleSelectAll = () => {
            if (isAllSelected) {
              const selectableIds = selectableUsers.map(u => String(u.id || u._id));
              setSelectedUserIds(prev => prev.filter(id => !selectableIds.includes(id)));
            } else {
              const selectableIds = selectableUsers.map(u => String(u.id || u._id));
              setSelectedUserIds(prev => Array.from(new Set([...prev, ...selectableIds])));
            }
          };

          const toggleUserSelection = (userId: string) => {
            setSelectedUserIds(prev =>
              prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
            );
          };

          return (
            <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 animate-in fade-in duration-200 space-y-6">
              {/* Header & Main Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-brand-border/40">
                <div>
                  <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-gold" />
                    User Management (Real-Time Student Registry)
                  </h3>
                  <p className="text-xs text-brand-ink2 font-light mt-1">
                    Search, filter, inspect, and moderate registered accounts. Includes Students, Campus Coordinators/Moderators, Admins, and Verified ID holders.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  {user?.role === 'admin' && selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBatchDeleteConfirm(true)}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer animate-in zoom-in-95 duration-150"
                      title="Delete all selected user accounts & associated data"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Selected ({selectedUserIds.length})
                    </button>
                  )}

                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteAllConfirmInput('');
                        setShowDeleteAllUsersConfirm(true);
                      }}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Purge all registered users and their posts from database"
                    >
                      <UserX className="w-3.5 h-3.5 text-rose-600" />
                      Delete All Users
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      setLoadingUsers(true);
                      try {
                        const res = await apiFetch('/admin/users');
                        if (res && res.users) {
                          setUsers(res.users);
                          onShowToast('Real-time database synced successfully!', 'success');
                        }
                      } catch (e) {
                        onShowToast('Failed to sync users database.', 'error');
                      } finally {
                        setLoadingUsers(false);
                      }
                    }}
                    disabled={loadingUsers}
                    className="px-3 py-1.5 bg-brand-cream border border-brand-border hover:border-brand-gold text-brand-navy rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                    Sync Database
                  </button>
                  
                  <span className="text-xs bg-brand-navy text-white px-3 py-1.5 rounded-xl font-bold whitespace-nowrap">
                    {users.length} Registered Accounts
                  </span>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-brand-cream/40 p-4 rounded-xl border border-brand-border/60 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-brand-ink3 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, Reg/Student ID, email, role, or department..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-brand-border rounded-xl text-xs text-brand-navy placeholder:text-brand-ink3 focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-ink3 hover:text-brand-navy p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-white border border-brand-border rounded-xl p-1 overflow-x-auto max-w-full">
                    {[
                      { key: 'all', label: 'All Roles', count: users.length },
                      { key: 'student', label: 'Students', count: users.filter(u => u.role === 'student' || !u.role || u.role === '').length },
                      { key: 'moderator', label: 'Coordinators / Mods', count: users.filter(u => u.role === 'moderator' || u.role === 'coordinator').length },
                      { key: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin').length },
                      { key: 'verified', label: 'Verified ID', count: users.filter(u => u.role !== 'admin' && u.role !== 'moderator' && u.role !== 'coordinator' && String(u.email || '').toLowerCase() !== 'nazrulretrievers@gmail.com' && (u.isVerified || u.is_verified || u.idVerificationStatus === 'verified')).length }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setUserRoleFilter(tab.key)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          userRoleFilter === tab.key
                            ? 'bg-brand-navy text-brand-gold shadow-xs border border-brand-gold/30'
                            : 'text-brand-ink2 hover:text-brand-navy hover:bg-brand-cream/50'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          userRoleFilter === tab.key
                            ? 'bg-brand-gold/20 text-brand-gold'
                            : 'bg-brand-cream text-brand-ink3'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="bg-white border border-brand-border text-brand-navy text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-navy cursor-pointer"
                  >
                    <option value="all">All Status ({users.length})</option>
                    <option value="active">Active ({users.filter(u => {
                      const s = String(u.status || u.accountStatus || 'active').toLowerCase();
                      return s !== 'suspended' && s !== 'banned' && s !== 'locked' && !u.isSuspended && !u.isBanned;
                    }).length})</option>
                    <option value="suspended">Suspended ({users.filter(u => {
                      const s = String(u.status || u.accountStatus || '').toLowerCase();
                      return s === 'suspended' || s === 'locked' || u.isSuspended;
                    }).length})</option>
                    <option value="banned">Banned ({users.filter(u => {
                      const s = String(u.status || u.accountStatus || '').toLowerCase();
                      return s === 'banned' || u.isBanned;
                    }).length})</option>
                    <option value="flagged">Flagged ({users.filter(u => {
                      const s = String(u.status || u.accountStatus || '').toLowerCase();
                      return s === 'flagged' || u.isFlagged || (u.warningCount && u.warningCount > 0);
                    }).length})</option>
                  </select>
                </div>
              </div>

              {/* Bulk Selection Notification Bar (Admin Only) */}
              {user?.role === 'admin' && selectedUserIds.length > 0 && (
                <div className="bg-brand-navy text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs shadow-md border border-brand-border/40 animate-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-brand-gold" />
                    <span className="font-bold">{selectedUserIds.length}</span> user(s) selected across registry
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBatchDeleteConfirm(true)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete {selectedUserIds.length} Selected
                    </button>
                  </div>
                </div>
              )}
              
              {/* Users Table */}
              <div className="overflow-x-auto rounded-xl border border-brand-border/60">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-brand-cream/50 border-b border-brand-border/60 text-slate-500 text-left text-xs">
                      {user?.role === 'admin' && (
                        <th className="p-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                            disabled={selectableUsers.length === 0}
                            className="w-4 h-4 rounded text-brand-navy accent-brand-navy cursor-pointer disabled:opacity-40"
                            title={selectableUsers.length === 0 ? "No selectable accounts in this view" : "Select all modifiable users"}
                          />
                        </th>
                      )}
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Reg No. / ID</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Student Name</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Department</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Access Rights</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 text-sm text-brand-ink">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={user?.role === 'admin' ? 7 : 6} className="p-8 text-center text-brand-ink3">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-gold" />
                          Loading registry accounts...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'admin' ? 7 : 6} className="p-8 text-center text-brand-ink3">
                          {userSearchQuery || userRoleFilter !== 'all' || userStatusFilter !== 'all' ? (
                            <div className="space-y-1.5">
                              <p className="font-bold text-brand-navy">No matching users found</p>
                              <p className="text-xs text-brand-ink3">Try clearing search filters to see all accounts.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setUserSearchQuery('');
                                  setUserRoleFilter('all');
                                  setUserStatusFilter('all');
                                }}
                                className="mt-2 text-xs font-bold text-brand-navy underline cursor-pointer"
                              >
                                Reset Filters
                              </button>
                            </div>
                          ) : (
                            'No registered accounts found in database.'
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(userItem => {
                        const userId = String(userItem.id || userItem._id);
                        const isSelected = selectedUserIds.includes(userId);
                        const isProtected = isUserProtected(userItem);
                        const isSuperAdmin = userItem.email === 'nazrulretrievers@gmail.com' || userId === '2';
                        const isSelf = user && (
                          userId === String((user as any).id || (user as any)._id) ||
                          (userItem.email && user.email && String(userItem.email).toLowerCase() === String(user.email).toLowerCase())
                        );

                        return (
                          <tr
                            key={userId}
                            className={`hover:bg-brand-cream/30 transition-colors ${isSelected ? 'bg-amber-50/50' : ''}`}
                          >
                            {user?.role === 'admin' && (
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isProtected}
                                  onChange={() => toggleUserSelection(userId)}
                                  className="w-4 h-4 rounded text-brand-navy accent-brand-gold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={isSelf ? "Your account cannot be selected for deletion" : isProtected ? "Protected administrative account" : "Select user"}
                                />
                              </td>
                            )}
                            <td className="p-3.5 font-mono text-xs text-brand-ink3">
                              {userItem.studentId || userItem.student_id || userItem.rollNumber || 'Not Setup'}
                            </td>
                            <td className="p-3.5 font-bold flex items-center gap-2">
                              {userItem.avatar && (userItem.avatar.startsWith('data:') || userItem.avatar.startsWith('http')) ? (
                                <img src={userItem.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-brand-navy text-brand-gold text-[10px] flex items-center justify-center font-bold shrink-0">
                                  {(userItem.fullName || userItem.full_name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                              )}
                              <span className="truncate max-w-[180px]">{userItem.fullName || userItem.full_name}</span>
                              {(userItem.role === 'admin' || String(userItem.email || '').toLowerCase() === 'nazrulretrievers@gmail.com') ? (
                                <span className="inline-flex items-center text-[10px] bg-rose-600 text-white font-extrabold uppercase px-1.5 py-0.5 rounded ml-1 shrink-0" title="Official System Administrator">
                                  <Shield className="w-2.5 h-2.5 mr-0.5" /> Admin
                                </span>
                              ) : (userItem.role === 'moderator' || userItem.role === 'coordinator') ? (
                                <span className="inline-flex items-center text-[10px] bg-amber-500 text-[#0D1B2A] font-extrabold uppercase px-1.5 py-0.5 rounded ml-1 shrink-0" title="Official Staff Moderator">
                                  <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Staff
                                </span>
                              ) : (userItem.isVerified || userItem.is_verified || userItem.idVerificationStatus === 'verified') ? (
                                <span className="inline-flex items-center text-[10px] bg-emerald-500 text-white font-extrabold uppercase px-1.5 py-0.5 rounded ml-1 shrink-0" title="JKKNIU Verified Student ID">
                                  <Check className="w-2.5 h-2.5 mr-0.5 stroke-[3px]" /> Verified
                                </span>
                              ) : null}
                            </td>
                            <td className="p-3.5 text-xs">
                              <div>{userItem.department || 'Not Specified'}</div>
                              {userItem.faculty && <div className="text-[10px] text-brand-ink3 font-normal">{userItem.faculty}</div>}
                            </td>
                            <td className="p-3.5">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                userItem.role === 'admin' ? 'bg-red-100 text-red-700 border border-red-200 font-bold' :
                                userItem.role === 'moderator' ? 'bg-brand-navy text-brand-gold-mid px-2 py-0.5 rounded font-bold' :
                                'bg-brand-cream border border-brand-border text-brand-ink'
                              }`}>
                                {userItem.role === 'admin' ? 'Admin' : userItem.role === 'moderator' ? 'Coordinator' : 'Standard Student'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                userItem.status === 'suspended' ? 'bg-red-50 text-red-600' :
                                userItem.status === 'banned' ? 'bg-rose-100 text-rose-700' :
                                userItem.status === 'flagged' ? 'bg-amber-50 text-amber-600' :
                                'bg-emerald-50 text-emerald-600'
                              }`}>
                                {userItem.status || 'Active'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => {
                                    if (isSelf) {
                                      onShowToast('You cannot send a message to yourself.', 'error');
                                      return;
                                    }
                                    if (onMessageUser) {
                                      onMessageUser(userItem);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                                    isSelf
                                      ? 'opacity-35 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-[#0D1B2A] border border-amber-600/30 hover:shadow-sm'
                                  }`}
                                  title={isSelf ? 'Cannot message yourself' : `Send message to ${userItem.fullName || userItem.full_name || 'user'}`}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                  <span>Message</span>
                                </button>

                                <button 
                                  type="button"
                                  onClick={() => setInspectedUser(userItem)} 
                                  className="text-xs text-brand-navy hover:text-brand-gold font-bold hover:underline transition-colors cursor-pointer px-2 py-1"
                                >
                                  Inspect &rarr;
                                </button>
                                
                                {user?.role === 'admin' && (
                                  <button
                                    type="button"
                                    disabled={isProtected}
                                    onClick={() => {
                                      setUserToDeleteSingle(userItem);
                                      setSingleDeleteReason('');
                                    }}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      isProtected
                                        ? 'opacity-30 border-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'border-rose-200 hover:bg-rose-50 text-rose-600 hover:border-rose-400 hover:text-rose-700'
                                    }`}
                                    title={isSelf ? 'Your active session account is protected' : isProtected ? 'Administrative accounts are protected from deletion' : 'Permanently delete user, posts, claims and chat'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Direct Single User Delete Confirmation Modal */}
              {userToDeleteSingle && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                    <div className="p-5 bg-red-950 text-white flex justify-between items-center">
                      <h3 className="font-serif text-base font-bold text-red-300 flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-400 animate-pulse" />
                        Delete User Permanently (Cascade)
                      </h3>
                      <button
                        type="button"
                        disabled={isDeletingSingleUser}
                        onClick={() => setUserToDeleteSingle(null)}
                        className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4 text-left">
                      <div className="flex items-center gap-3 p-3 bg-brand-cream/50 dark:bg-slate-800 rounded-xl border border-brand-border/60">
                        {userToDeleteSingle.avatar && (userToDeleteSingle.avatar.startsWith('data:') || userToDeleteSingle.avatar.startsWith('http')) ? (
                          <img src={userToDeleteSingle.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-brand-navy text-brand-gold flex items-center justify-center font-bold text-sm">
                            {(userToDeleteSingle.fullName || userToDeleteSingle.full_name || 'U').substring(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-bold text-sm text-brand-navy dark:text-slate-100">
                            {userToDeleteSingle.fullName || userToDeleteSingle.full_name}
                          </p>
                          <p className="text-xs text-brand-ink3 dark:text-slate-400">
                            {userToDeleteSingle.email || 'No email'} &bull; {userToDeleteSingle.studentId || userToDeleteSingle.student_id || 'No Reg No'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-2xl border border-red-100 dark:border-red-900/50">
                        <p className="text-xs font-bold text-red-900 dark:text-red-300 mb-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          Complete Cascading Database Removal:
                        </p>
                        <ul className="list-disc list-inside text-xs text-red-800 dark:text-red-300 space-y-1">
                          <li>User account profile and credentials</li>
                          <li>All lost & found listings/posts submitted by this user</li>
                          <li>All claims submitted or received on their items</li>
                          <li>Chat messages and threads</li>
                          <li>Notifications and uploaded images</li>
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-brand-navy dark:text-slate-200">
                          Audit Log Reason (Optional):
                        </label>
                        <input
                          type="text"
                          disabled={isDeletingSingleUser}
                          value={singleDeleteReason}
                          onChange={(e) => setSingleDeleteReason(e.target.value)}
                          placeholder="E.g., User requested account deletion / policy violation..."
                          className="w-full text-xs p-3 border border-brand-border/80 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 bg-white dark:bg-slate-800 text-brand-navy dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-brand-cream dark:bg-slate-800/80 border-t border-brand-border/40 dark:border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={isDeletingSingleUser}
                        onClick={() => setUserToDeleteSingle(null)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-cream border border-brand-border text-brand-navy text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingSingleUser}
                        onClick={() => handleDeleteSingleUser(userToDeleteSingle, singleDeleteReason)}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isDeletingSingleUser ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Deleting User & Posts...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Permanently
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Batch Delete Confirmation Modal */}
              {showBatchDeleteConfirm && selectedUserIds.length > 0 && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                    <div className="p-5 bg-red-950 text-white flex justify-between items-center">
                      <h3 className="font-serif text-base font-bold text-red-300 flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-400 animate-pulse" />
                        Batch Delete ({selectedUserIds.length}) Users
                      </h3>
                      <button
                        type="button"
                        disabled={isBatchDeletingUsers}
                        onClick={() => setShowBatchDeleteConfirm(false)}
                        className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4 text-left">
                      <p className="text-sm text-brand-navy dark:text-slate-200 font-bold">
                        Are you sure you want to permanently delete {selectedUserIds.length} selected user accounts?
                      </p>

                      <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-2xl border border-red-100 dark:border-red-900/50">
                        <p className="text-xs font-bold text-red-900 dark:text-red-300 mb-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          Database Cascading Deletion Notice:
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                          This will immediately erase all {selectedUserIds.length} users and permanently cascade-delete all their lost & found listings, claims, chat threads, and uploaded files from the database.
                        </p>
                      </div>

                      <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-brand-cream/40 dark:bg-slate-800 rounded-xl border border-brand-border/60 text-xs">
                        {users.filter(u => selectedUserIds.includes(String(u.id || u._id))).map(u => (
                          <div key={u.id || u._id} className="text-brand-navy dark:text-slate-200 font-medium truncate">
                            &bull; {u.fullName || u.full_name} ({u.studentId || u.student_id || u.email || 'User'})
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-brand-cream dark:bg-slate-800/80 border-t border-brand-border/40 dark:border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={isBatchDeletingUsers}
                        onClick={() => setShowBatchDeleteConfirm(false)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-cream border border-brand-border text-brand-navy text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isBatchDeletingUsers}
                        onClick={handleBatchDeleteUsers}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isBatchDeletingUsers ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Deleting {selectedUserIds.length} Users...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            Confirm Batch Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete All Users Global Purge Confirmation Modal */}
              {showDeleteAllUsersConfirm && (
                <div className="fixed inset-0 bg-black/70 dark:bg-black/90 flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                    <div className="p-5 bg-rose-950 text-white flex justify-between items-center">
                      <h3 className="font-serif text-base font-bold text-red-300 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
                        CRITICAL: Delete All Users & Listings
                      </h3>
                      <button
                        type="button"
                        disabled={isDeletingAllUsers}
                        onClick={() => setShowDeleteAllUsersConfirm(false)}
                        className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4 text-left">
                      <div className="bg-red-50 dark:bg-red-950/60 p-4 rounded-2xl border border-red-200 dark:border-red-900 text-left">
                        <p className="text-sm font-extrabold text-red-900 dark:text-red-200 mb-2">
                          ⚠️ Extreme Caution: Database Purge
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed mb-3">
                          You are about to delete <strong>ALL {users.length} registered student accounts</strong> from the database.
                        </p>
                        <ul className="list-disc list-inside text-xs text-red-800 dark:text-red-300 space-y-1 font-medium">
                          <li>Every registered student profile will be erased</li>
                          <li>All lost & found listings posted by students will be deleted</li>
                          <li>All claim records, threads, chat messages, and images will be wiped</li>
                          <li>Your active administrator session is protected</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-red-600 dark:text-red-400">
                          To confirm, please type <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded text-red-800 dark:text-red-200">DELETE ALL</span> below:
                        </label>
                        <input
                          type="text"
                          disabled={isDeletingAllUsers}
                          value={deleteAllConfirmInput}
                          onChange={(e) => setDeleteAllConfirmInput(e.target.value)}
                          placeholder="Type DELETE ALL..."
                          className="w-full text-xs p-3 border border-red-300 dark:border-red-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50/40 dark:bg-slate-800 text-brand-navy dark:text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-brand-cream dark:bg-slate-800/80 border-t border-brand-border/40 dark:border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={isDeletingAllUsers}
                        onClick={() => {
                          setShowDeleteAllUsersConfirm(false);
                          setDeleteAllConfirmInput('');
                        }}
                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-cream border border-brand-border text-brand-navy text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingAllUsers || deleteAllConfirmInput.trim().toUpperCase() !== 'DELETE ALL'}
                        onClick={handleDeleteAllUsers}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-950 text-white text-xs font-black rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isDeletingAllUsers ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Purging Database...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Purge All Users & Posts
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeSubTab === 'Verifications' && (
          <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 animate-in fade-in duration-200 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-gold" />
                  Institutional Student ID Verifications
                </h3>
                <p className="text-xs text-brand-ink2 font-light mt-1">Review physical student ID uploads to grant JKKNIU Institutional Verification status.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchVerifications}
                  disabled={loadingVerifications}
                  className="px-3.5 py-1.5 bg-brand-cream border border-brand-border hover:border-brand-gold text-brand-navy rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingVerifications ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <span className="text-xs bg-brand-navy text-white px-3 py-1.5 rounded-xl font-bold">{actualPendingCount} Pending Review</span>
              </div>
            </div>

            {/* Filter Tabs / Pills */}
            <div className="flex flex-wrap gap-1.5 bg-brand-cream/60 p-1.5 rounded-xl border border-brand-border w-fit">
              <button
                type="button"
                onClick={() => setVerificationFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  verificationFilter === 'pending'
                    ? 'bg-brand-navy text-brand-gold shadow-xs border border-brand-gold/30'
                    : 'text-brand-ink2 hover:text-brand-navy hover:bg-brand-cream'
                }`}
              >
                Pending ({studentVerifications.filter((v: any) => v.idVerificationStatus === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setVerificationFilter('verified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  verificationFilter === 'verified'
                    ? 'bg-brand-navy text-brand-gold shadow-xs border border-brand-gold/30'
                    : 'text-brand-ink2 hover:text-brand-navy hover:bg-brand-cream'
                }`}
              >
                Verified ({studentVerifications.filter((v: any) => v.idVerificationStatus === 'verified').length})
              </button>
              <button
                type="button"
                onClick={() => setVerificationFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  verificationFilter === 'rejected'
                    ? 'bg-brand-navy text-brand-gold shadow-xs border border-brand-gold/30'
                    : 'text-brand-ink2 hover:text-brand-navy hover:bg-brand-cream'
                }`}
              >
                Rejected ({studentVerifications.filter((v: any) => v.idVerificationStatus === 'rejected').length})
              </button>
              <button
                type="button"
                onClick={() => setVerificationFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  verificationFilter === 'all'
                    ? 'bg-brand-navy text-brand-gold shadow-xs border border-brand-gold/30'
                    : 'text-brand-ink2 hover:text-brand-navy hover:bg-brand-cream'
                }`}
              >
                All ({studentVerifications.length})
              </button>
            </div>

            {loadingVerifications ? (
              <div className="p-12 text-center text-brand-ink3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-gold" />
                Retrieving pending verification submissions...
              </div>
            ) : filteredVerifications.length === 0 ? (
              <div className="p-12 text-center text-brand-ink2 border border-dashed border-brand-border rounded-xl bg-brand-cream/30">
                <ShieldCheck className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
                <p className="font-bold text-sm text-brand-navy">No requests found</p>
                <p className="text-xs font-light mt-1">
                  {verificationFilter === 'pending'
                    ? 'There are no pending student ID verification requests at this moment.'
                    : verificationFilter === 'verified'
                    ? 'There are no verified student ID verification requests yet.'
                    : verificationFilter === 'rejected'
                    ? 'There are no rejected student ID verification requests.'
                    : 'No student ID verification requests found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredVerifications.map((request) => (
                  <div key={request.id || request._id} className="border border-brand-border rounded-2xl p-5 bg-white space-y-4 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-brand-border/40">
                      <div className="flex items-center gap-3">
                        {request.avatar ? (
                          <img src={request.avatar} className="w-10 h-10 rounded-full object-cover border border-brand-border" alt={request.fullName} />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-brand-navy text-brand-gold font-extrabold text-sm flex items-center justify-center border border-brand-border">
                            {request.fullName ? request.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'U'}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm text-brand-navy">{request.fullName || 'Unknown Student'}</h4>
                          <p className="text-[11px] text-brand-ink3">{request.email}</p>
                        </div>
                      </div>
                      {request.idVerificationStatus === 'verified' ? (
                        <span className="text-[10px] bg-emerald-500 text-white font-extrabold uppercase px-2.5 py-1 rounded-xl border border-emerald-600 flex items-center gap-1 shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3px]" /> VERIFIED ID
                        </span>
                      ) : request.idVerificationStatus === 'rejected' ? (
                        <span className="text-[10px] bg-rose-500 text-white font-extrabold uppercase px-2.5 py-1 rounded-xl border border-rose-600 flex items-center gap-1 shrink-0 shadow-sm">
                          <X className="w-3.5 h-3.5 text-white stroke-[3px]" /> REJECTED ID
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500 text-white font-extrabold uppercase px-2.5 py-1 rounded-xl border border-amber-600 flex items-center gap-1 shrink-0 animate-pulse shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-white" /> PENDING REVIEW
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-[10px] text-brand-ink3 font-bold uppercase tracking-wider">Student ID</span>
                        <span className="block font-semibold text-brand-navy mt-0.5 font-mono">{request.studentId || 'Not Setup'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-brand-ink3 font-bold uppercase tracking-wider">Department</span>
                        <span className="block font-semibold text-brand-navy mt-0.5">{request.department || 'Not Specified'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-brand-ink3 font-bold uppercase tracking-wider">Academic Session</span>
                        <span className="block font-semibold text-brand-navy mt-0.5">{request.academicSession || request.sessionYear || 'Not Specified'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-brand-ink3 font-bold uppercase tracking-wider">Submitted At</span>
                        <span className="block font-semibold text-brand-navy mt-0.5">
                          {request.idVerificationSubmittedAt ? new Date(request.idVerificationSubmittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                      </div>
                    </div>

                    {request.verificationDocument && (() => {
                      const docs = request.verificationDocument.split(',').filter(Boolean);
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {docs.map((docUrl, dIdx) => (
                            <div 
                              key={dIdx}
                              onClick={() => {
                                setSelectedDocUrl(docUrl);
                                setSelectedVerificationRequest(request);
                              }}
                              className="relative rounded-xl overflow-hidden border border-brand-border/60 bg-black/5 group cursor-pointer h-36"
                            >
                              <img src={docUrl} className="w-full h-full object-cover" alt={`Student ID Part ${dIdx + 1}`} />
                              <div className="absolute top-2 left-2">
                                <span className="bg-brand-navy/85 text-brand-gold text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">
                                  {docs.length > 1 ? (dIdx === 0 ? 'Front Side' : 'Back Side') : 'Student ID'}
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDocUrl(docUrl);
                                    setSelectedVerificationRequest(request);
                                  }}
                                  className="px-2.5 py-1.5 bg-white text-brand-navy rounded-lg text-[10px] font-bold shadow hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Enlarge Image
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {request.idVerificationStatus === 'verified' ? (
                      <div className="space-y-2 pt-2">
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400/60 dark:border-emerald-700/60 rounded-xl p-3.5 space-y-2 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black tracking-wide uppercase shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Approved &amp; Verified JKKNIU Student
                            </span>
                          </div>
                          {request.idVerificationRemarks && (
                            <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-lg p-2.5 text-xs">
                              <span className="font-extrabold text-emerald-900 dark:text-emerald-300 uppercase text-[11px] tracking-wider block mb-0.5">
                                Approval Remarks:
                              </span>
                              <p className="text-slate-900 dark:text-slate-100 font-bold text-xs leading-relaxed">
                                {request.idVerificationRemarks}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRejectVerification(request.id, request.fullName)}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="Revoke and reject this verification"
                          >
                            <X className="w-3.5 h-3.5" /> Revoke Verification
                          </button>
                        </div>
                      </div>
                    ) : request.idVerificationStatus === 'rejected' ? (
                      <div className="space-y-2 pt-2">
                        <div className="bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400/80 dark:border-rose-700 rounded-xl p-3.5 space-y-2 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-black tracking-wide uppercase shadow-xs">
                              <X className="w-3.5 h-3.5 stroke-[3]" /> ID Verification Rejected
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg p-2.5 text-xs">
                            <span className="font-extrabold text-rose-900 dark:text-rose-300 uppercase text-[11px] tracking-wider block mb-0.5">
                              Remarks / Reason:
                            </span>
                            <p className="text-slate-950 dark:text-white font-bold text-xs leading-relaxed">
                              {request.idVerificationRemarks || 'The uploaded image is blurry or illegible. Please submit a high-quality picture.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-xs text-black dark:text-black font-bold">
                            Awaiting student resubmission
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApproveVerification(request.id, request.fullName)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="Re-evaluate and approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Re-approve ID
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        {request.idVerificationRemarks && (
                          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-2.5 rounded-lg text-xs">
                            <span className="font-extrabold text-amber-900 dark:text-amber-300 uppercase text-[10px] tracking-wider block mb-0.5">Previous Remarks:</span>
                            <p className="text-slate-900 dark:text-slate-100 font-bold text-xs leading-relaxed">{request.idVerificationRemarks}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveVerification(request.id, request.fullName)}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve ID
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectVerification(request.id, request.fullName)}
                            className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject ID
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Fullscreen Document Viewer Modal */}
            {selectedDocUrl && (
              <div className="fixed inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
                <div className="relative max-w-4xl w-full bg-brand-cream dark:bg-slate-900 rounded-2xl overflow-hidden border border-brand-border/40 dark:border-slate-800 shadow-2xl flex flex-col max-h-[95vh] text-slate-800 dark:text-slate-100">
                  <div className="p-4 bg-brand-navy dark:bg-slate-950 text-white flex justify-between items-center shrink-0">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">Review Student ID Document</span>
                      {selectedVerificationRequest && (
                        <span className="text-sm font-semibold text-white/90">
                          {selectedVerificationRequest.fullName} — {selectedVerificationRequest.studentId || 'No Student ID'} ({selectedVerificationRequest.department || 'General'})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocUrl(null);
                        setSelectedVerificationRequest(null);
                      }}
                      className="text-white/75 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-auto flex items-center justify-center bg-black/95 flex-1 min-h-[350px]">
                    <img src={selectedDocUrl} className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md" alt="Enlarged Student ID" />
                  </div>

                  {selectedVerificationRequest && (
                    <div className="p-5 bg-white dark:bg-slate-900 border-t border-brand-border/50 dark:border-slate-800 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 text-left">
                        <p className="text-xs text-brand-ink3 dark:text-slate-400 font-medium">Student Registry Information:</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span className="text-brand-navy dark:text-slate-200"><strong>Email:</strong> {selectedVerificationRequest.email}</span>
                          <span className="text-brand-navy dark:text-slate-200"><strong>Session:</strong> {selectedVerificationRequest.academicSession || 'N/A'}</span>
                          <span className="text-brand-navy dark:text-slate-200"><strong>Roll:</strong> {selectedVerificationRequest.rollNumber || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedVerificationRequest.idVerificationStatus === 'verified' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-emerald-600 text-white font-extrabold uppercase px-4 py-2.5 rounded-xl border border-emerald-700 flex items-center gap-1.5 shadow-sm">
                              <Check className="w-4 h-4 text-white stroke-[3px]" /> APPROVED &amp; VERIFIED JKKNIU STUDENT
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                const id = selectedVerificationRequest.id;
                                const name = selectedVerificationRequest.fullName;
                                setSelectedDocUrl(null);
                                setSelectedVerificationRequest(null);
                                await handleRejectVerification(id, name);
                              }}
                              className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Revoke
                            </button>
                          </div>
                        ) : selectedVerificationRequest.idVerificationStatus === 'rejected' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-rose-600 text-white font-extrabold uppercase px-4 py-2.5 rounded-xl border border-rose-700 flex items-center gap-1.5 shadow-sm">
                              <X className="w-4 h-4 text-white stroke-[3px]" /> REJECTED ID VERIFICATION
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                const id = selectedVerificationRequest.id;
                                const name = selectedVerificationRequest.fullName;
                                setSelectedDocUrl(null);
                                setSelectedVerificationRequest(null);
                                await handleApproveVerification(id, name);
                              }}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" /> Re-approve ID
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                const id = selectedVerificationRequest.id;
                                const name = selectedVerificationRequest.fullName;
                                setSelectedDocUrl(null);
                                setSelectedVerificationRequest(null);
                                await handleApproveVerification(id, name);
                              }}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer animate-none"
                            >
                              <Check className="w-4 h-4" />
                              Approve ID
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const id = selectedVerificationRequest.id;
                                const name = selectedVerificationRequest.fullName;
                                setSelectedDocUrl(null);
                                setSelectedVerificationRequest(null);
                                await handleRejectVerification(id, name);
                              }}
                              className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer animate-none"
                            >
                              <X className="w-4 h-4" />
                              Reject ID
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="px-5 py-2.5 bg-brand-cream/60 dark:bg-slate-800/80 border-t border-brand-border/40 dark:border-slate-800 text-center text-[10px] text-brand-ink3 dark:text-slate-400 shrink-0">
                    Verify that the Name, Department, and Student ID match the registry details before approving.
                  </div>
                </div>
              </div>
            )}

            {/* Custom Approve Confirmation Modal (iFrame Friendly) */}
            {verificationToApprove && (
              <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                  <div className="p-5 bg-brand-navy dark:bg-slate-950 text-white flex justify-between items-center">
                    <h3 className="font-serif text-base font-bold text-brand-gold flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      Approve Student ID
                    </h3>
                    <button
                      type="button"
                      onClick={() => setVerificationToApprove(null)}
                      className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-brand-navy dark:text-slate-200 leading-relaxed text-left">
                      Are you sure you want to approve the Institutional Student ID verification for <strong>{verificationToApprove.name}</strong>?
                    </p>
                    <p className="text-xs text-brand-ink3 dark:text-slate-400 leading-relaxed text-left">
                      This will grant JKKNIU Institutional Verification status to the user and mark their profile and posted items as verified.
                    </p>
                  </div>
                  <div className="p-4 bg-brand-cream dark:bg-slate-800/80 border-t border-brand-border/40 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setVerificationToApprove(null)}
                      className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-cream dark:hover:bg-slate-700 border border-brand-border dark:border-slate-700 text-brand-navy dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveVerificationDirect(verificationToApprove.id, verificationToApprove.name)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Confirm &amp; Approve
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Reject Confirmation Modal (iFrame Friendly) */}
            {verificationToReject && (
              <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                  <div className="p-5 bg-rose-950 text-white flex justify-between items-center">
                    <h3 className="font-serif text-base font-bold text-red-300 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                      Reject Student ID
                    </h3>
                    <button
                      type="button"
                      onClick={() => setVerificationToReject(null)}
                      className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-brand-navy dark:text-slate-200 leading-relaxed text-left">
                      Please enter a rejection reason/remarks for <strong>{verificationToReject.name}</strong>'s Student ID verification:
                    </p>
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[10px] text-brand-ink3 dark:text-slate-400 font-bold uppercase tracking-wider">Rejection Remarks</label>
                      <textarea
                        rows={4}
                        value={rejectRemarks}
                        onChange={(e) => setRejectRemarks(e.target.value)}
                        placeholder="E.g., The uploaded image is blurry or illegible. Please submit a high-quality picture."
                        className="w-full text-xs p-3 border border-brand-border/80 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-navy/30 bg-white dark:bg-slate-800 text-brand-navy dark:text-slate-100 dark:placeholder-slate-500 resize-none"
                      />
                    </div>
                    <p className="text-[11px] text-brand-ink3 dark:text-slate-400 leading-relaxed text-left">
                      The user will be notified of this rejection and they will need to upload a valid ID document again.
                    </p>
                  </div>
                  <div className="p-4 bg-brand-cream dark:bg-slate-800/80 border-t border-brand-border/40 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setVerificationToReject(null)}
                      className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-cream dark:hover:bg-slate-700 border border-brand-border dark:border-slate-700 text-brand-navy dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectVerificationDirect(verificationToReject.id, verificationToReject.name, rejectRemarks)}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Reject ID
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Delete Confirmation Modal (iFrame Friendly) */}
            {showDeleteConfirm && inspectedUser && (
              <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
                  <div className="p-5 bg-red-950 text-white flex justify-between items-center">
                    <h3 className="font-serif text-base font-bold text-red-400 flex items-center gap-2">
                      <Trash2 className="w-5 h-5 animate-pulse" />
                      Permanently Delete User Cascades
                    </h3>
                    <button
                      type="button"
                      disabled={isDeletingUser}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-brand-navy dark:text-slate-200 leading-relaxed text-left">
                      Are you sure? This action <strong>cannot be undone</strong>.
                    </p>
                    <p className="text-sm text-brand-navy dark:text-slate-200 leading-relaxed text-left">
                      It will permanently remove <strong>{inspectedUser.fullName || inspectedUser.full_name || 'User'}</strong> and delete all their:
                    </p>
                    <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 text-left">
                      <ul className="list-disc list-inside text-xs text-red-900 dark:text-red-300 space-y-1">
                        <li>Account & Profile</li>
                        <li>Lost & Found Reports / Posts</li>
                        <li>Chats & Thread Messages</li>
                        <li>Claims & Request History</li>
                        <li>Notifications & Settings</li>
                        <li>Uploaded Images & Attachments</li>
                        <li>All user activity logs</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 text-left">
                        Deletion Reason/Explanation (Optional)
                      </label>
                      <textarea
                        disabled={isDeletingUser}
                        value={modReason}
                        onChange={(e) => setModReason(e.target.value)}
                        placeholder="Provide reason for this permanent cascade deletion audit record..."
                        className="w-full text-xs p-3 border border-brand-border/80 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 bg-brand-cream/20 dark:bg-slate-800 text-brand-navy dark:text-slate-100 dark:placeholder-slate-500 h-20 resize-none"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="block text-xs font-bold text-red-600 dark:text-red-400">
                        Type "{inspectedUser.fullName || inspectedUser.full_name || inspectedUser.email || 'User'}" or "DELETE" to confirm:
                      </label>
                      <input
                        type="text"
                        disabled={isDeletingUser}
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        placeholder={`Type "${inspectedUser.fullName || inspectedUser.full_name || 'User'}" or "DELETE"...`}
                        className="w-full text-xs p-3 border border-red-200 dark:border-red-900/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 bg-red-50/50 dark:bg-slate-800 text-brand-navy dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-brand-cream dark:bg-slate-800/80 border-t border-brand-border/40 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isDeletingUser}
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmInput('');
                      }}
                      className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-cream dark:hover:bg-slate-700 border border-brand-border dark:border-slate-700 text-brand-navy dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    {(() => {
                      const nameToMatch = (inspectedUser.fullName || inspectedUser.full_name || inspectedUser.email || 'User').trim().toLowerCase();
                      const typedInput = deleteConfirmInput.trim().toLowerCase();
                      const isConfirmValid =
                        typedInput === 'delete' ||
                        typedInput === nameToMatch ||
                        (inspectedUser.email && typedInput === inspectedUser.email.trim().toLowerCase()) ||
                        (inspectedUser.username && typedInput === inspectedUser.username.trim().toLowerCase()) ||
                        (inspectedUser.studentId && typedInput === String(inspectedUser.studentId).trim().toLowerCase()) ||
                        (inspectedUser.student_id && typedInput === String(inspectedUser.student_id).trim().toLowerCase());

                      return (
                        <button
                          type="button"
                          disabled={isDeletingUser || !isConfirmValid}
                          onClick={async () => {
                            if (isDeletingUser) return;
                            setIsDeletingUser(true);
                            try {
                              const targetUserId = inspectedUser.id || inspectedUser._id;
                              const reasonToSend = modReason.trim() || 'Permanent account cascade deletion requested by Admin.';
                              const res = await apiFetch(`/admin/users/${targetUserId}`, {
                                method: 'DELETE',
                                bodyData: {
                                  reason: reasonToSend
                                }
                              });

                              if (res && res.error) {
                                onShowToast(res.error, 'error');
                                return;
                              }

                              const deletedId = res?.deletedUserId || targetUserId;
                              onShowToast('User and all associated data permanently deleted!', 'success');
                              setUsers(prev => prev.filter(u => 
                                String(u.id) !== String(deletedId) && 
                                String(u._id) !== String(deletedId) &&
                                String(u.id) !== String(targetUserId) &&
                                String(u._id) !== String(targetUserId)
                              ));
                              setInspectedUser(null);
                              setModReason('');
                              setDeleteConfirmInput('');
                              setShowDeleteConfirm(false);
                              
                              // Trigger real-time statistical updates
                              fetchStats(true);
                              fetchAdminNotificationsCount();
                              setUserRefreshTrigger(prev => prev + 1);
                              if (onRefresh) {
                                onRefresh();
                              }
                            } catch (err: any) {
                              onShowToast(err.message || 'Failed to permanently delete user.', 'error');
                            } finally {
                              setIsDeletingUser(false);
                            }
                          }}
                          className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-950 text-white text-xs font-black rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isDeletingUser ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Deleting Forever...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Delete Forever
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}





        {activeSubTab === 'Reports' && (
          <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-brand-gold" />
                Flagged Content &amp; Spam Reports
              </h3>
              {reports.length > 0 && (
                <span className="text-xs bg-rose-500 text-white px-3 py-1 rounded-full font-bold">
                  {reports.filter(r => r.status === 'pending').length} Pending
                </span>
              )}
            </div>

            {loadingReports ? (
              <div className="text-center py-12 text-brand-ink3">
                <span className="font-semibold text-sm">Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16 text-brand-ink2">
                <p className="text-base font-semibold text-brand-navy">No active reports</p>
                <p className="text-xs text-brand-ink3 mt-1">There are no reported conversations or flagged items at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-brand-border/60">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-brand-cream/50 border-b border-brand-border/60 text-slate-500 text-xs text-left">
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Alert ID</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Flagged Chat</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Reported By</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Reason Selected</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Resolution Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 text-sm text-brand-ink">
                    {reports.map((report: any) => (
                      <tr key={report.reportId} className="hover:bg-brand-cream/30 transition-colors">
                        <td className="p-3.5 font-mono text-xs text-brand-navy font-bold">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-mono text-[11px]">
                            {formatCaseId(report.reportId)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-brand-navy">Chat with {report.reportedUserName || 'Student'}</div>
                          <div className="text-[10px] text-brand-ink3 font-mono">Convo ID: {report.conversationId}</div>
                        </td>
                        <td className="p-3.5 font-medium text-brand-navy">{report.reportedByName || 'Student'}</td>
                        <td className="p-3.5">
                          <div className="text-xs text-brand-navy font-semibold">{report.reason}</div>
                          {report.description && (
                            <div className="text-[11px] text-brand-ink2 mt-0.5">{report.description}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            report.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            report.status === 'reviewed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {report.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleReportAction(report.reportId, 'reviewed')}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleReportAction(report.reportId, 'resolved')}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                Resolve
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-brand-ink3 font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'Deleted' && (
          <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 overflow-hidden animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  Deleted Listings Archive (Admin Deleted List)
                </h3>
                <p className="text-xs text-brand-ink3 mt-1">
                  Listings below have been soft-deleted by users or coordinators. They are removed from all public screens but retained here for compliance, audit, and potential restoration.
                </p>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-3 py-2 text-brand-navy hover:bg-brand-navy/5 bg-white rounded-xl border border-brand-border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                  title="Sync Database"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Listings
                </button>
              )}
            </div>

            {deletedItems.length === 0 ? (
              <div className="text-center py-16 text-brand-ink2">
                <p className="text-base font-semibold">No soft-deleted listings found</p>
                <p className="text-xs text-brand-ink3 mt-1">All deleted posts are completely cleared or none exist.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Admin-only Batch Action Toolbar for Deleted Archive */}
                {role === 'admin' && selectedItemIds.length > 0 && (
                  <div className="bg-slate-900 text-white rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-black shrink-0 shadow-xs">
                        {selectedItemIds.length}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-bold text-white">
                          {selectedItemIds.length} deleted listing(s) selected
                        </span>
                        <span className="text-white/30 hidden sm:inline">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedItemIds.length === deletedItems.length) {
                              setSelectedItemIds([]);
                            } else {
                              setSelectedItemIds(deletedItems.map(item => String(item.id)));
                            }
                          }}
                          className="text-brand-gold hover:underline cursor-pointer font-semibold"
                        >
                          {selectedItemIds.length === deletedItems.length ? 'Deselect all' : `Select all (${deletedItems.length})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedItemIds([])}
                          className="text-white/60 hover:text-white underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                      <button
                        type="button"
                        onClick={handleBulkPermanentDelete}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="Permanently purge selected listings from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Purge Selected Permanently ({selectedItemIds.length})
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-brand-border/60">
                  <table className="w-full border-collapse min-w-[860px]">
                    <thead>
                      <tr className="bg-brand-cream/50 border-b border-brand-border/60 text-slate-500 text-left text-xs">
                        {role === 'admin' && (
                          <th className="p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">
                            <input
                              type="checkbox"
                              checked={deletedItems.length > 0 && selectedItemIds.length === deletedItems.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItemIds(deletedItems.map(item => String(item.id)));
                                } else {
                                  setSelectedItemIds([]);
                                }
                              }}
                              className="w-4 h-4 rounded text-brand-navy accent-brand-navy cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] w-20">ID</th>
                        <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] min-w-[260px]">Item Details</th>
                        <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] w-24">Type</th>
                        <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] min-w-[160px]">Student Reporter</th>
                        <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] w-36">Deletion Status</th>
                        <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] text-right min-w-[200px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30 text-sm text-brand-ink">
                      {deletedItems.map(item => {
                        const isChecked = selectedItemIds.includes(String(item.id));
                        return (
                          <tr key={item.id} className={`transition-colors ${isChecked ? 'bg-red-50/10 hover:bg-red-50/20' : 'hover:bg-red-50/20'}`}>
                            {role === 'admin' && (
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const strId = String(item.id);
                                    if (e.target.checked) {
                                      setSelectedItemIds(prev => [...prev, strId]);
                                    } else {
                                      setSelectedItemIds(prev => prev.filter(id => id !== strId));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-brand-border text-brand-gold focus:ring-brand-gold cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="p-3.5 font-mono text-xs text-brand-ink3">#084{item.id}</td>
                          <td className="p-3.5">
                            <div className="flex items-start gap-3">
                              <span className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-xl select-none overflow-hidden border border-brand-border/40 relative flex-shrink-0">
                                {item.image ? (
                                  <>
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    {item.images && item.images.length > 1 && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-black text-white">
                                        +{item.images.length - 1}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <Inbox className="w-4 h-4 text-brand-gold opacity-80" />
                                )}
                              </span>
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="block font-bold text-brand-navy text-sm truncate">{item.title}</span>
                                <span className="block text-xs text-brand-ink3">{item.location}</span>
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {(item.images && item.images.length > 0 
                                    ? item.images 
                                    : (item.image ? [{ url: item.image, isCover: true }] : [])
                                  ).map((img: any, idx: number, arr: any[]) => (
                                    <button
                                      key={img.url + '-' + idx}
                                      type="button"
                                      onClick={() => setInspectingImages({ urls: arr.map((im: any) => im.url), activeIndex: idx })}
                                      className="w-10 h-10 rounded-lg overflow-hidden border border-brand-border hover:border-brand-gold hover:scale-105 transition-all cursor-pointer relative shadow-sm"
                                      title="Click to inspect image"
                                    >
                                      <img src={img.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      {img.isCover && (
                                        <div className="absolute bottom-0 inset-x-0 bg-brand-gold/95 text-brand-navy text-[6px] font-extrabold text-center uppercase tracking-wider py-0.5 leading-none">
                                          Cover
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="block font-semibold text-brand-navy text-sm">{item.postedBy.name}</span>
                            <span className="block text-[11px] text-brand-ink3">{item.postedBy.department}</span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] uppercase rounded-md tracking-wider">
                                <Trash2 className="w-3 h-3 text-rose-500" />
                                Deleted
                              </span>
                              {(item as any).deletedBy && (
                                <span className="text-[10px] text-brand-ink3">
                                  By: {(item as any).deletedBy}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex justify-end items-center gap-2">
                              <button 
                                type="button"
                                onClick={() => onSelectItem(item)}
                                className="px-3 py-1.5 bg-brand-cream border border-brand-border hover:border-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5 shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5 text-brand-navy" />
                                <span>Inspect Details</span>
                              </button>
                              {role === 'admin' && (
                                <button 
                                  type="button"
                                  onClick={() => handlePermanentDelete(item.id, item.title)}
                                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 font-bold text-xs rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm shrink-0"
                                  title="Permanently erase from database"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Permanently</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'MyProfile' && (
          <div className="animate-in fade-in duration-200">
            <ProfilePage 
              userName={user?.fullName || (role === 'admin' ? 'System Administrator' : 'Staff Moderator')}
              userEmail={user?.email || 'staff@jkkniu.edu'}
              user={user as any}
              onTabChange={() => {}}
              onShowToast={onShowToast}
              onUpdateUser={onUpdateUser}
              onOpenUserModal={onOpenUserModal}
            />
          </div>
        )}

        {activeSubTab === 'ModeratorManagement' && (
          role !== 'admin' ? (
            <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-8 animate-in fade-in duration-200 text-center max-w-xl mx-auto my-12">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-brand-navy mb-2">Access Restricted</h3>
              <p className="text-sm text-brand-ink2 font-light">
                Only Administrators are permitted to access Moderator Management tools. Please contact the Admin for administrative role changes.
              </p>
            </div>
          ) : (
            <ModeratorManagement onShowToast={onShowToast} />
          )
        )}

        {activeSubTab === 'AdminPanel' && (
          role !== 'admin' ? (
            <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-8 animate-in fade-in duration-200 text-center max-w-xl mx-auto my-12">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-brand-navy mb-2">Access Restricted</h3>
              <p className="text-sm text-brand-ink2 font-light">
                Only Administrators are permitted to edit sensitive system preferences or clear administrative databases. Please contact Admin for changes.
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
              {/* Header Card */}
              <div className="bg-white border border-brand-border rounded-2xl p-5 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center shrink-0 shadow-sm border border-brand-gold/20">
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-navy">
                          Platform Administration &amp; Engine Settings
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold-mid border border-brand-gold/30">
                          <ShieldCheck className="w-3 h-3" />
                          Master Controls
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-brand-ink2 font-light mt-0.5">
                        Manage automated moderation queues, safety heuristics, storage quotas, and MongoDB cluster diagnostics.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-cream/60 text-slate-700 border border-brand-border/60 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      System Live
                    </span>
                  </div>
                </div>
              </div>

              {loadingSettings ? (
                <div className="bg-white border border-brand-border rounded-2xl p-12 text-center shadow-xs">
                  <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mb-3 mx-auto" />
                  <p className="text-xs font-bold text-brand-navy">Loading platform settings...</p>
                  <p className="text-[11px] text-brand-ink3 mt-0.5">Synchronizing environment state</p>
                </div>
              ) : (
                <>
                  {/* Top 2-Column Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Card 1: Moderation Automation */}
                    <div className="bg-white border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center justify-between pb-3.5 border-b border-brand-border/30 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
                              <ShieldAlert className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">Moderation Automation</h4>
                              <p className="text-[11px] text-brand-ink3">Algorithmic and rule-based posting policies</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-cream text-brand-ink2 border border-brand-border/40">
                            2 Rules Active
                          </span>
                        </div>

                        <div className="space-y-3.5">
                          {/* Toggle 1: Auto-Approve */}
                          <div 
                            onClick={() => setAutoApprovePosts(!autoApprovePosts)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-4 ${
                              autoApprovePosts 
                                ? 'bg-amber-500/5 border-amber-500/30' 
                                : 'bg-brand-cream/30 border-brand-border/30 hover:bg-brand-cream/60'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-brand-navy">Auto-Approve Verified Member Posts</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  autoApprovePosts 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {autoApprovePosts ? 'Instant Publish' : 'Queued for Review'}
                                </span>
                              </div>
                              <p className="text-xs text-brand-ink2 font-light leading-relaxed">
                                Posts submitted by ID-verified student profiles bypass coordinator approval and publish live immediately.
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={autoApprovePosts}
                              onClick={(e) => { e.stopPropagation(); setAutoApprovePosts(!autoApprovePosts); }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 ${
                                autoApprovePosts ? 'bg-brand-navy' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  autoApprovePosts ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Toggle 2: Spam Content Filter */}
                          <div 
                            onClick={() => setAutoSpamFilter(!autoSpamFilter)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-4 ${
                              autoSpamFilter 
                                ? 'bg-amber-500/5 border-amber-500/30' 
                                : 'bg-brand-cream/30 border-brand-border/30 hover:bg-brand-cream/60'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-brand-navy">Automatic Spam Content Filtering</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  autoSpamFilter 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {autoSpamFilter ? 'AI Protected' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-brand-ink2 font-light leading-relaxed">
                                Scans item titles, descriptions, and chats for prohibited content, unauthorized ads, and spam phone patterns.
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={autoSpamFilter}
                              onClick={(e) => { e.stopPropagation(); setAutoSpamFilter(!autoSpamFilter); }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 ${
                                autoSpamFilter ? 'bg-brand-navy' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  autoSpamFilter ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: System & Storage Thresholds */}
                    <div className="bg-white border border-brand-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center justify-between pb-3.5 border-b border-brand-border/30 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-700 flex items-center justify-center">
                              <HardDrive className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">Storage &amp; Lifecycle Thresholds</h4>
                              <p className="text-[11px] text-brand-ink3">Image quotas and automatic archival cycles</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-cream text-brand-ink2 border border-brand-border/40">
                            Enforced
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* Select 1: Max Image Size */}
                          <div className="p-3.5 bg-brand-cream/30 border border-brand-border/30 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-brand-navy flex items-center gap-1.5">
                                <HardDrive className="w-3.5 h-3.5 text-brand-gold" />
                                Maximum Image Upload Limit
                              </label>
                              <span className="text-[10px] text-brand-ink3">Per Photo</span>
                            </div>
                            <div className="relative">
                              <select
                                value={maxImageSize}
                                onChange={(e) => setMaxImageSize(e.target.value)}
                                className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-brand-border rounded-xl text-xs font-bold text-brand-navy outline-none focus:ring-2 focus:ring-brand-gold/30 cursor-pointer shadow-2xs"
                              >
                                <option value="5 MB per image">5 MB per image (Recommended for high speed)</option>
                                <option value="10 MB per image">10 MB per image (High quality)</option>
                                <option value="Unlimited">Unlimited (Uncompressed Original)</option>
                              </select>
                            </div>
                            <p className="text-[11px] text-brand-ink3 font-light">
                              Higher limits require more bandwidth during CDN image compression and mobile preview rendering.
                            </p>
                          </div>

                          {/* Select 2: Auto Archive Duration */}
                          <div className="p-3.5 bg-brand-cream/30 border border-brand-border/30 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-brand-navy flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-brand-gold" />
                                Auto-Archive Inactive Duration
                              </label>
                              <span className="text-[10px] text-brand-ink3">Lifecycle</span>
                            </div>
                            <div className="relative">
                              <select
                                value={archiveDuration}
                                onChange={(e) => setArchiveDuration(e.target.value)}
                                className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-brand-border rounded-xl text-xs font-bold text-brand-navy outline-none focus:ring-2 focus:ring-brand-gold/30 cursor-pointer shadow-2xs"
                              >
                                <option value="30 Days Active">30 Days Active (Campus Standard)</option>
                                <option value="60 Days Active">60 Days Active (Extended Semester)</option>
                                <option value="90 Days Active">90 Days Active (Full Academic Term)</option>
                              </select>
                            </div>
                            <p className="text-[11px] text-brand-ink3 font-light">
                              Items past this duration are automatically moved to historical logs while remaining searchable by staff.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Full-Width MongoDB Diagnostics */}
                  <div className="bg-white border border-brand-border rounded-2xl p-5 sm:p-7 shadow-xs hover:shadow-md transition-shadow">
                    {/* Diagnostic Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-brand-navy flex items-center gap-2">
                            MongoDB Cluster Telemetry &amp; Diagnostics
                          </h4>
                          <p className="text-xs text-brand-ink2 font-light">
                            Real-time cluster connectivity verification of <code className="text-[11px] font-mono bg-brand-cream px-1.5 py-0.5 rounded text-brand-navy font-semibold">process.env.MONGODB_URI</code>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-start sm:self-center">
                        {checkingMongo ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            Testing Connectivity...
                          </span>
                        ) : mongoStatus?.connected ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Connected &amp; Operational
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Disconnected (JSON Failover)
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={handleCheckMongoStatus}
                          disabled={checkingMongo}
                          className="px-3.5 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-gold hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${checkingMongo ? 'animate-spin' : ''}`} />
                          <span>{checkingMongo ? 'Diagnosing...' : 'Check Cluster'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Metric Tiles Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
                      {/* Metric 1 */}
                      <div className="p-3.5 rounded-xl bg-brand-cream/30 border border-brand-border/30 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-brand-ink3 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider">Catalog Name</span>
                          <Database className="w-3.5 h-3.5 text-brand-gold" />
                        </div>
                        <div className="font-bold text-sm text-brand-navy truncate" title={mongoStatus?.databaseName || 'nazrul_retrievers'}>
                          {mongoStatus?.databaseName || 'nazrul_retrievers'}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Primary Database
                        </div>
                      </div>

                      {/* Metric 2 */}
                      <div className="p-3.5 rounded-xl bg-brand-cream/30 border border-brand-border/30 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-brand-ink3 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider">Cluster Endpoint</span>
                          <Server className="w-3.5 h-3.5 text-brand-gold" />
                        </div>
                        <div className="font-mono text-xs font-bold text-brand-navy truncate" title={mongoStatus ? mongoStatus.mongodb_uri : 'Localhost/Atlas'}>
                          {mongoStatus ? mongoStatus.mongodb_uri : 'Configured via ENV'}
                        </div>
                        <div className="text-[10px] text-brand-ink2 font-medium mt-1">
                          {mongoStatus?.connected ? 'TLS/SSL Handshake Valid' : 'Failover Ready'}
                        </div>
                      </div>

                      {/* Metric 3 */}
                      <div className="p-3.5 rounded-xl bg-brand-cream/30 border border-brand-border/30 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-brand-ink3 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider">Mongoose Driver</span>
                          <Activity className="w-3.5 h-3.5 text-brand-gold" />
                        </div>
                        <div className="font-bold text-xs text-brand-navy">
                          {mongoStatus ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                mongoStatus.readyState === 1 ? 'bg-emerald-500' :
                                mongoStatus.readyState === 2 ? 'bg-blue-500' : 'bg-rose-500'
                              }`} />
                              {mongoStatus.readyState === 1 ? 'State 1 (Connected)' :
                               mongoStatus.readyState === 2 ? 'State 2 (Connecting)' :
                               mongoStatus.readyState === 3 ? 'State 3 (Disconnecting)' : 'State 0 (Disconnected)'}
                            </span>
                          ) : 'State 1 (Ready)'}
                        </div>
                        <div className="text-[10px] text-brand-ink2 font-medium mt-1">
                          Pool connection driver
                        </div>
                      </div>

                      {/* Metric 4 */}
                      <div className="p-3.5 rounded-xl bg-brand-cream/30 border border-brand-border/30 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-brand-ink3 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider">Last Health Sync</span>
                          <Clock className="w-3.5 h-3.5 text-brand-gold" />
                        </div>
                        <div className="font-bold text-xs text-brand-navy">
                          {mongoStatus?.timestamp ? new Date(mongoStatus.timestamp).toLocaleTimeString() : 'Auto-Verified'}
                        </div>
                        <div className="text-[10px] text-brand-ink2 font-medium mt-1">
                          Telemetry Heartbeat
                        </div>
                      </div>
                    </div>

                    {/* If error logs exist */}
                    {mongoStatus && !mongoStatus.connected && mongoStatus.error && (
                      <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-mono space-y-1">
                        <div className="flex items-center gap-2 font-bold text-rose-900 text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          Cluster Connection Diagnostic Output:
                        </div>
                        <p className="whitespace-pre-wrap text-[11px] bg-white/80 p-2.5 rounded-lg border border-rose-200/60 overflow-x-auto">
                          {mongoStatus.error}
                        </p>
                      </div>
                    )}

                    {/* Failover Note */}
                    <div className="mt-4 pt-3 border-t border-brand-border/30 flex items-center gap-2 text-[11px] text-brand-ink2 font-light">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Institutional Resilience Guarantee:</strong> In case of remote cluster downtime or IP restriction, Nazrul Retrievers automatically routes transactions to atomic local JSON storage without user downtime.
                      </span>
                    </div>
                  </div>

                  {/* Action Footer Card */}
                  <div className="bg-white border border-brand-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-brand-ink2">
                      <Info className="w-4 h-4 text-brand-gold shrink-0" />
                      <span>Configuration updates take effect platform-wide across all active student &amp; moderator sessions immediately.</span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button 
                        type="button"
                        disabled={savingSettings}
                        onClick={handleResetSettings} 
                        className="px-4 py-2.5 border border-brand-border hover:border-brand-navy text-xs font-bold rounded-xl text-brand-navy hover:bg-brand-cream/40 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-brand-ink3" />
                        <span>Reset Defaults</span>
                      </button>
                      <button 
                        type="button"
                        disabled={savingSettings}
                        onClick={handleSaveSettings} 
                        className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/95 text-brand-gold hover:text-white text-xs font-black rounded-xl transition-all shadow-md shadow-brand-navy/20 disabled:opacity-50 cursor-pointer flex items-center gap-2 active:scale-95"
                      >
                        {savingSettings ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 text-brand-gold" />
                            <span>Save Admin Settings</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        )}

        {activeSubTab === 'AdminNotifications' && (
          <AdminNotificationsPanel onShowToast={onShowToast} onRefreshCount={fetchAdminNotificationsCount} />
        )}

        {activeSubTab === 'ChatsModeration' && (
          <ChatModerationPanel onShowToast={onShowToast} onRefreshCount={fetchReports} />
        )}

        {activeSubTab === 'ActivityLogs' && (
          <ActivityLogsPanel onShowToast={onShowToast} />
        )}

        {/* Real-time Detailed User Profile Modal */}
        {inspectedUser && (() => {
          const isInspectedUserSelf = Boolean(
            user && (
              String(inspectedUser.id || inspectedUser._id) === String((user as any).id || (user as any)._id) ||
              (inspectedUser.studentId && user.studentId && String(inspectedUser.studentId) === String(user.studentId)) ||
              (inspectedUser.email && user.email && String(inspectedUser.email).toLowerCase() === String(user.email).toLowerCase())
            )
          );
          const isInspectedUserAdmin = Boolean(
            inspectedUser.role === 'admin' ||
            String(inspectedUser.email || '').toLowerCase() === 'nazrulretrievers@gmail.com' ||
            String(inspectedUser.id || inspectedUser._id) === '2'
          );
          const isInspectedUserStaff = inspectedUser.role === 'moderator' || inspectedUser.role === 'coordinator';
          const isInspectedUserVerified = Boolean(inspectedUser.is_verified || inspectedUser.isVerified || inspectedUser.idVerificationStatus === 'verified');

          return (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-navy/65 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-brand-gold/25 dark:border-slate-700/80 flex flex-col text-slate-800 dark:text-slate-100">
                
                {/* Header */}
                <div className="p-6 bg-brand-navy dark:bg-slate-950 border-b border-brand-gold/15 dark:border-slate-800 text-white flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-serif text-2xl font-black flex items-center justify-center shadow-md shrink-0 overflow-hidden select-none">
                      {inspectedUser.avatar ? (
                        <img 
                          src={inspectedUser.avatar} 
                          alt="" 
                          className="w-full h-full object-cover rounded-2xl" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const span = document.createElement('span');
                              span.className = 'text-[#0D1B2A] font-serif text-2xl font-black';
                              const name = inspectedUser.fullName || inspectedUser.full_name || inspectedUser.name || 'Admin';
                              span.innerText = name.split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'A';
                              parent.appendChild(span);
                            }
                          }}
                        />
                      ) : (
                        (inspectedUser.fullName || inspectedUser.full_name || inspectedUser.name || 'Admin')
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((n: string) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase() || 'A'
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
                        {inspectedUser.fullName || inspectedUser.full_name}
                        {isInspectedUserAdmin ? (
                          <span className="text-[10px] bg-red-600 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-400/40">
                            System Administrator
                          </span>
                        ) : isInspectedUserStaff ? (
                          <span className="text-[10px] bg-brand-gold text-brand-navy px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Campus Coordinator
                          </span>
                        ) : isInspectedUserVerified ? (
                          <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Verified Student
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-xs text-white/70 font-light mt-0.5">{inspectedUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isInspectedUserSelf && onMessageUser && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = inspectedUser;
                          setInspectedUser(null);
                          setModReason('');
                          onMessageUser(target);
                        }}
                        className="px-3.5 py-2 bg-brand-gold hover:bg-amber-400 active:scale-95 text-[#0D1B2A] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        title={`Send direct message to ${inspectedUser.fullName || inspectedUser.full_name || 'user'}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>Message User</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setInspectedUser(null);
                        setModReason('');
                      }}
                      className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                      title="Close Profile Modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 md:p-8 space-y-8 flex-1">
                  
                  {/* Visual Metadata Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-brand-cream dark:bg-slate-800/80 border border-brand-border/65 dark:border-slate-700/60 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-brand-ink3 dark:text-slate-400 block uppercase tracking-wider font-semibold">Account Role</span>
                      <span className="text-xs font-bold text-brand-navy dark:text-slate-100 capitalize">
                        {isInspectedUserAdmin ? 'Administrator' : isInspectedUserStaff ? 'Coordinator' : 'Student'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-ink3 dark:text-slate-400 block uppercase tracking-wider font-semibold">Verification Status</span>
                      {isInspectedUserAdmin ? (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Admin Authorized
                        </span>
                      ) : isInspectedUserStaff ? (
                        <span className="text-xs font-bold text-brand-gold-mid dark:text-amber-400 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Staff Verified
                        </span>
                      ) : (
                        <span className={`text-xs font-bold ${isInspectedUserVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} flex items-center gap-1 mt-0.5`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {isInspectedUserVerified ? 'JKKNIU Verified' : 'Unverified ID'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-ink3 dark:text-slate-400 block uppercase tracking-wider font-semibold">Reputation Score</span>
                      <span className="text-xs font-bold text-brand-navy dark:text-slate-100">{inspectedUser.reputationScore ?? 100} / 100</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-ink3 dark:text-slate-400 block uppercase tracking-wider font-semibold">Account Status</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold capitalize ${
                        inspectedUser.status === 'suspended' ? 'text-orange-600 dark:text-orange-400' :
                        inspectedUser.status === 'banned' ? 'text-rose-600 dark:text-rose-400' :
                        inspectedUser.status === 'locked' ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          inspectedUser.status === 'suspended' ? 'bg-orange-500 animate-pulse' :
                          inspectedUser.status === 'banned' ? 'bg-rose-600 animate-pulse' :
                          inspectedUser.status === 'locked' ? 'bg-amber-500 animate-pulse' :
                          'bg-emerald-500'
                        }`}></span>
                        {inspectedUser.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-slate-100 pb-2 border-b border-brand-border/40 dark:border-slate-700/60 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-brand-gold" />
                        Academic &amp; Institutional Profile
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Registration Number</span>
                          <span className="font-mono font-bold text-brand-navy dark:text-slate-200">{inspectedUser.studentId || inspectedUser.student_id || 'Not Setup'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Class Roll Number</span>
                          <span className="font-mono font-bold text-brand-navy dark:text-slate-200">{inspectedUser.rollNumber || 'Not Specified'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Department</span>
                          <span className="font-semibold text-brand-navy dark:text-slate-200">{inspectedUser.department || 'Not Specified'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Faculty</span>
                          <span className="font-semibold text-brand-navy dark:text-slate-200">{resolveFaculty(inspectedUser)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Academic Session</span>
                          <span className="font-semibold text-brand-navy dark:text-slate-200">{inspectedUser.sessionYear || inspectedUser.session_year || 'Not Specified'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Residential Hall</span>
                          <span className="font-semibold text-brand-navy dark:text-slate-200">{inspectedUser.residentialHall || 'Not Specified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Personal & Contact Details */}
                    <div className="space-y-4">
                      <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-slate-100 pb-2 border-b border-brand-border/40 dark:border-slate-700/60 flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-gold" />
                        Personal &amp; Contact Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Phone Number</span>
                          <span className="font-bold text-brand-navy dark:text-slate-200">{inspectedUser.phone || 'Not Shared'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Gender</span>
                          <span className="font-semibold text-brand-navy dark:text-slate-200 capitalize">{inspectedUser.gender || 'Not Shared'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Date of Birth</span>
                          <span className="font-semibold text-brand-navy dark:text-slate-200">{inspectedUser.dateOfBirth || 'Not Shared'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Blood Group</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{inspectedUser.bloodGroup || 'Not Shared'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Present/Permanent Address</span>
                          <span className="font-semibold text-brand-navy dark:text-slate-200 truncate max-w-[200px]" title={inspectedUser.address}>
                            {inspectedUser.address || 'Not Shared'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-brand-border/20 dark:border-slate-800 text-xs">
                          <span className="text-brand-ink3 dark:text-slate-400 font-medium">Last Sign In</span>
                          <span className="font-mono text-brand-navy dark:text-slate-200 font-semibold">
                            {inspectedUser.lastLogin ? new Date(inspectedUser.lastLogin).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-brand-border/30 dark:border-slate-800">
                    
                    {/* Platform Engagement Metrics */}
                    <div className="space-y-4">
                      <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-slate-100 pb-2 border-b border-brand-border/40 dark:border-slate-700/60 flex items-center gap-2">
                        <Award className="w-4 h-4 text-brand-gold" />
                        Platform Contributions &amp; Engagement
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-center">
                          <span className="text-2xl font-black text-red-600 dark:text-red-400 block">{inspectedUser.totalLostPosts ?? 0}</span>
                          <span className="text-[9px] text-brand-ink3 dark:text-slate-400 block uppercase font-bold tracking-wider mt-1">Lost Posts</span>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-center">
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{inspectedUser.totalFoundPosts ?? 0}</span>
                          <span className="text-[9px] text-brand-ink3 dark:text-slate-400 block uppercase font-bold tracking-wider mt-1">Found Posts</span>
                        </div>
                        <div className="p-3 bg-brand-gold-light/30 dark:bg-amber-950/40 border border-brand-gold/15 dark:border-amber-900/50 rounded-xl text-center">
                          <span className="text-2xl font-black text-brand-gold-mid dark:text-amber-400 block">{inspectedUser.successfulReturns ?? 0}</span>
                          <span className="text-[9px] text-brand-ink3 dark:text-slate-400 block uppercase font-bold tracking-wider mt-1">Returns</span>
                        </div>
                      </div>
                      {inspectedUser.bio && (
                        <div className="p-3.5 bg-brand-cream dark:bg-slate-800/60 border border-brand-border/50 dark:border-slate-700/60 rounded-xl">
                          <span className="text-[10px] text-brand-ink3 dark:text-slate-400 block uppercase tracking-wider font-semibold mb-1">User Bio</span>
                          <p className="text-xs text-brand-navy dark:text-slate-200 font-light leading-relaxed italic">"{inspectedUser.bio}"</p>
                        </div>
                      )}
                      {inspectedUser.emergencyContact && (
                        <div className="p-3.5 bg-rose-50/40 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl space-y-1">
                          <span className="text-[10px] text-rose-800 dark:text-rose-300 block uppercase tracking-wider font-bold">Emergency Contact Detail</span>
                          <div className="text-xs flex justify-between">
                            <span className="text-brand-ink3 dark:text-slate-400 font-medium">{inspectedUser.emergencyContactName || 'Guardian'}</span>
                            <span className="font-bold text-brand-navy dark:text-slate-200">{inspectedUser.emergencyContact}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Account Verification Document & Direct Moderator Controls */}
                    <div className="space-y-4">
                      <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-slate-100 pb-2 border-b border-brand-border/40 dark:border-slate-700/60 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-brand-gold" />
                        Verification Documents &amp; Admin Controls
                      </h4>

                      {inspectedUser.verificationDocument ? (() => {
                        const docs = inspectedUser.verificationDocument.split(',').filter(Boolean);
                        return (
                          <div className="p-3.5 bg-brand-cream dark:bg-slate-800/60 border border-brand-border/60 dark:border-slate-700/60 rounded-xl space-y-3">
                            <span className="text-[10px] text-brand-ink3 dark:text-slate-400 block uppercase font-bold tracking-wider">Uploaded Student ID Documents</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {docs.map((docUrl, idx) => (
                                <div key={idx} className="relative aspect-[4/3] bg-brand-navy/5 dark:bg-slate-900 rounded-lg overflow-hidden border border-brand-border dark:border-slate-700">
                                  <img 
                                    src={docUrl} 
                                    alt={`Student ID document part ${idx + 1}`} 
                                    className="w-full h-full object-contain cursor-pointer hover:scale-[1.02] transition-transform" 
                                    onClick={() => window.open(docUrl, '_blank')}
                                  />
                                  <div className="absolute top-2 left-2">
                                    <span className="bg-brand-navy/90 dark:bg-slate-950 text-brand-gold text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm border border-brand-gold/20">
                                      {docs.length > 1 ? (idx === 0 ? 'Front Side' : 'Back Side') : 'Student ID'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-brand-ink3 dark:text-slate-400 italic text-center">Click any image to inspect or verify in a new tab.</p>
                          </div>
                        );
                      })() : isInspectedUserAdmin ? (
                        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200 rounded-xl text-xs flex items-start gap-2.5">
                          <Shield className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                          <div>
                            <span className="font-bold block">Institutional Administrator Authority</span>
                            <p className="text-[11px] font-light mt-0.5 text-red-800/80 dark:text-red-300/80">Central system administration account with elevated platform management access.</p>
                          </div>
                        </div>
                      ) : isInspectedUserStaff ? (
                        <div className="p-3.5 bg-brand-gold/10 dark:bg-amber-950/40 border border-brand-gold/30 dark:border-amber-900/50 text-brand-navy dark:text-amber-200 rounded-xl text-xs flex items-start gap-2.5">
                          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-gold-mid dark:text-amber-400" />
                          <div>
                            <span className="font-bold block">Campus Coordinator / Staff Account</span>
                            <p className="text-[11px] font-light mt-0.5 text-brand-ink2 dark:text-amber-300/80">Authorized university coordinator responsible for campus moderation and claim verification.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 rounded-xl text-xs flex items-start gap-2.5">
                          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <div>
                            <span className="font-bold block">No Physical ID Document Uploaded</span>
                            <p className="text-[11px] font-light mt-0.5 text-amber-900/80 dark:text-amber-200/80">This user has not submitted a photo of their physical student ID for JKKNIU institutional verification status.</p>
                          </div>
                        </div>
                      )}

                      {/* Moderation actions or Protected status banner */}
                      {isInspectedUserSelf ? (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2 text-left">
                          <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-xs">
                            <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Your Active Account (Protected Session)</span>
                          </div>
                          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                            You are currently logged into this administrator account. Moderation actions (warnings, suspensions, locks, bans, and cascade deletion) cannot be executed on your own active session.
                          </p>
                        </div>
                      ) : isInspectedUserAdmin ? (
                        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl space-y-2 text-left">
                          <div className="flex items-center gap-2 font-bold text-red-900 dark:text-red-300 text-xs">
                            <Shield className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                            <span>System Administrator Account (Protected)</span>
                          </div>
                          <p className="text-[11px] text-red-800/80 dark:text-red-300/80 leading-relaxed">
                            System administrator accounts are protected against moderation actions and cascade deletion. Administrative roles and privileges are managed centrally in the Administration tab.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-brand-navy/5 dark:bg-slate-800/80 border border-brand-border dark:border-slate-700/80 rounded-2xl space-y-3.5">
                          <span className="text-[10px] text-brand-navy dark:text-brand-gold block uppercase font-bold tracking-wider">Issue Moderation Action</span>
                          
                          <div className="space-y-2">
                            <label className="text-[11px] text-brand-ink2 dark:text-slate-300 font-medium block">Action Reason / Warning Remarks:</label>
                            <input
                              type="text"
                              value={modReason}
                              onChange={(e) => setModReason(e.target.value)}
                              placeholder="Provide context or rules violated..."
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-gold text-brand-navy dark:text-slate-100 dark:placeholder-slate-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* WARNING */}
                            <button
                              type="button"
                              disabled={isSubmittingMod}
                              onClick={() => handleModeratorUserAction(inspectedUser.id, 'warn', modReason || 'Issued formal warning for campus policy review.')}
                              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                              Send Warning
                            </button>

                            {/* SUSPEND / REACTIVATE */}
                            {inspectedUser.status !== 'suspended' ? (
                              <button
                                type="button"
                                disabled={isSubmittingMod}
                                onClick={() => handleModeratorUserAction(inspectedUser.id, 'suspend', modReason || 'Account suspended for policy violations.')}
                                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Suspend Account
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isSubmittingMod}
                                onClick={() => handleModeratorUserAction(inspectedUser.id, 'reactivate', modReason || 'Account suspension has been lifted.')}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Unsuspend
                              </button>
                            )}

                            {/* BAN / UNBAN */}
                            {inspectedUser.status !== 'banned' ? (
                              <button
                                type="button"
                                disabled={isSubmittingMod}
                                onClick={() => handleModeratorUserAction(inspectedUser.id, 'ban', modReason || 'Temporarily banned for critical platform abuse.')}
                                className="px-3 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Ban Account
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isSubmittingMod}
                                onClick={() => handleModeratorUserAction(inspectedUser.id, 'reactivate', modReason || 'Ban lifted by moderator review.')}
                                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Unban
                              </button>
                            )}

                            {/* LOCK / UNLOCK */}
                            {inspectedUser.status !== 'locked' ? (
                              <button
                                type="button"
                                disabled={isSubmittingMod}
                                onClick={() => handleModeratorUserAction(inspectedUser.id, 'lock', modReason || 'Security lock applied due to suspicious activity.')}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Lock Account
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isSubmittingMod}
                                onClick={() => handleModeratorUserAction(inspectedUser.id, 'reactivate', modReason || 'Account unlocked securely.')}
                                className="px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Unlock Account
                              </button>
                            )}

                            {/* SEND DIRECT MESSAGE */}
                            {onMessageUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  const target = inspectedUser;
                                  setInspectedUser(null);
                                  setModReason('');
                                  onMessageUser(target);
                                }}
                                className="col-span-2 px-3 py-2.5 bg-brand-gold hover:bg-amber-400 active:scale-95 text-[#0D1B2A] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <MessageSquare className="w-4 h-4 shrink-0" />
                                <span>Send Direct Message to User</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-brand-border/40 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 z-10 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectedUser(null);
                      setModReason('');
                    }}
                    className="px-4 py-2 border border-brand-border dark:border-slate-700 hover:border-brand-navy dark:hover:border-brand-gold rounded-xl text-xs font-bold text-brand-navy dark:text-slate-200 hover:text-brand-navy dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Close Inspection
                  </button>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Custom Reject Listing Confirmation Modal (iFrame Friendly) */}
        {itemToReject && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-brand-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-5 bg-rose-950 text-white flex justify-between items-center">
                <h3 className="font-serif text-base font-bold text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  {isRejectingBulk ? "Bulk Reject Selected Listings" : isRejectingAll ? "Reject All Pending Listings" : "Reject Listing Post"}
                </h3>
                <button
                  type="button"
                  onClick={() => setItemToReject(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-brand-navy leading-relaxed text-left">
                  {isRejectingBulk ? (
                    <>Please enter a rejection reason/remarks for the <strong>{selectedItemIds.length} selected listings</strong>:</>
                  ) : isRejectingAll ? (
                    <>Please enter a rejection reason/remarks for <strong>ALL pending listings</strong> awaiting moderation:</>
                  ) : (
                    <>Please enter a rejection reason/remarks for the listing <strong>"{itemToReject.title}"</strong>:</>
                  )}
                </p>
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] text-brand-ink3 font-bold uppercase tracking-wider">Rejection Reason</label>
                  <textarea
                    rows={4}
                    value={itemRejectReason}
                    onChange={(e) => setItemRejectReason(e.target.value)}
                    placeholder="E.g., Spam listing, contains inappropriate language, or community policy violation."
                    className="w-full text-xs p-3 border border-brand-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-navy/30 bg-white text-brand-navy resize-none"
                  />
                </div>
                <p className="text-[11px] text-brand-ink3 leading-relaxed text-left">
                  {isRejectingBulk ? (
                    <>All authors of the selected listings will be notified of their respective rejections, and these posts will be marked as rejected.</>
                  ) : isRejectingAll ? (
                    <>All authors of the pending listings will be notified of their respective rejections, and these posts will be updated with the rejection status.</>
                  ) : (
                    <>The author of this post will be notified of this rejection, and the post status will be marked as rejected.</>
                  )}
                </p>
              </div>
              <div className="p-4 bg-brand-cream border-t border-brand-border/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setItemToReject(null)}
                  className="px-4 py-2 bg-white hover:bg-brand-cream border border-brand-border text-brand-navy text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  {isRejectingAll ? "Reject All" : "Reject Post"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Admin Image Inspection Lightbox */}
        {inspectingImages && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[11000] p-4 animate-in fade-in duration-200">
            {/* Top Toolbar */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white z-50">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
                Image {inspectingImages.activeIndex + 1} of {inspectingImages.urls.length}
              </span>
              <button
                type="button"
                onClick={() => setInspectingImages(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Stage */}
            <div className="relative w-full max-w-4xl aspect-video sm:aspect-square flex items-center justify-center">
              {inspectingImages.urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => setInspectingImages(prev => {
                    if (!prev) return null;
                    const nextIdx = prev.activeIndex === 0 ? prev.urls.length - 1 : prev.activeIndex - 1;
                    return { ...prev, activeIndex: nextIdx };
                  })}
                  className="absolute left-2 sm:left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50 cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <img
                src={inspectingImages.urls[inspectingImages.activeIndex]}
                alt=""
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all duration-300"
                referrerPolicy="no-referrer"
              />

              {inspectingImages.urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => setInspectingImages(prev => {
                    if (!prev) return null;
                    const nextIdx = prev.activeIndex === prev.urls.length - 1 ? 0 : prev.activeIndex + 1;
                    return { ...prev, activeIndex: nextIdx };
                  })}
                  className="absolute right-2 sm:right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50 cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Thumbnails strip */}
            {inspectingImages.urls.length > 1 && (
              <div className="flex gap-2 mt-6 overflow-x-auto max-w-full pb-2">
                {inspectingImages.urls.map((url, idx) => (
                  <button
                    key={url + '-' + idx}
                    type="button"
                    onClick={() => setInspectingImages(prev => prev ? { ...prev, activeIndex: idx } : null)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                      idx === inspectingImages.activeIndex ? 'border-brand-gold scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Global High-Impact Action Confirmation Dialog */}
        {globalConfirm.isOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[12000] p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-brand-border/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
              {/* Header based on variant */}
              <div className={`p-5 flex items-center gap-3 text-white ${
                globalConfirm.variant === 'danger' ? 'bg-rose-950 text-rose-200 border-b border-rose-800' :
                globalConfirm.variant === 'warning' ? 'bg-amber-950 text-amber-200 border-b border-amber-800' :
                'bg-slate-900 text-slate-100 border-b border-slate-800'
              }`}>
                <ShieldAlert className={`w-5 h-5 shrink-0 ${
                  globalConfirm.variant === 'danger' ? 'text-rose-400 animate-pulse' :
                  globalConfirm.variant === 'warning' ? 'text-amber-400' :
                  'text-brand-gold'
                }`} />
                <h3 className="font-serif text-base font-bold tracking-tight">
                  {globalConfirm.title || 'Are you absolutely sure?'}
                </h3>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-xs sm:text-sm text-brand-navy leading-relaxed whitespace-pre-wrap">
                  {globalConfirm.message}
                </p>
                
                {globalConfirm.variant === 'danger' && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-800 font-semibold flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>Warning: This is an administrative, high-impact action that modifies critical system records. Please double-check your authorization.</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-brand-cream/60 border-t border-brand-border/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isProcessingGlobalConfirm}
                  onClick={() => setGlobalConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-white hover:bg-brand-cream border border-brand-border text-brand-navy text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {globalConfirm.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isProcessingGlobalConfirm}
                  onClick={async () => {
                    if (isProcessingGlobalConfirm) return;
                    setIsProcessingGlobalConfirm(true);
                    try {
                      if (globalConfirm.onConfirm) {
                        await globalConfirm.onConfirm();
                      }
                    } catch (err: any) {
                      onShowToast(err.message || 'Action failed.', 'error');
                    } finally {
                      setIsProcessingGlobalConfirm(false);
                      setGlobalConfirm(prev => ({ ...prev, isOpen: false }));
                    }
                  }}
                  className={`px-5 py-2 text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    globalConfirm.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 text-white' :
                    globalConfirm.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                    'bg-brand-navy hover:bg-brand-navy-light text-white'
                  }`}
                >
                  {isProcessingGlobalConfirm ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : null}
                  {globalConfirm.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
