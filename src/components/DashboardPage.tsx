import React, { useState, useEffect } from 'react';
import { FileText, RotateCcw, HelpCircle, MessagesSquare, Plus, CheckCircle2, Navigation, AlertCircle, Eye, Inbox, Clock, XCircle, PlusCircle, Sparkles, Trash2, ShieldCheck, Share2, Building2, Send, MessageSquare, Users, X, Heart } from 'lucide-react';
import { Item, NotificationItem, ChatThread, User } from '../types';
import ShareModal from './ShareModal';
import { getGreeting, getGreetingEmoji } from '../utils/greeting';
import { formatPostTime } from '../utils/date';
import { hasItemReward, getRewardDetails } from '../utils/rewardUtils';
import { handleNotificationClick, getNotificationIconAndColor, formatNotificationContent } from '../utils/notificationNavigation';

interface DashboardPageProps {
  user?: User | null;
  myItems: Item[];
  allItems?: Item[];
  notifications: NotificationItem[];
  threads: ChatThread[];
  onTabChange: (tab: string) => void;
  onPostTypeToggle: (type: 'lost' | 'found') => void;
  onSelectItem: (item: Item) => void;
  onTriggerMockPost: (category: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onOpenUserModal?: (tab: 'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout') => void;
  onMarkNotificationRead?: (notifId: string) => void;
}

export default function DashboardPage({
  user,
  myItems,
  allItems = [],
  notifications,
  threads,
  onTabChange,
  onPostTypeToggle,
  onSelectItem,
  onTriggerMockPost,
  onShowToast,
  onDeleteItem,
  onOpenUserModal,
  onMarkNotificationRead
}: DashboardPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentGreeting, setCurrentGreeting] = useState(() => getGreeting());
  const [reportFilter, setReportFilter] = useState<'all' | 'lost' | 'found' | 'pending' | 'rejected' | 'reunited'>('all');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // Resolution modal state
  const [itemForResolution, setItemForResolution] = useState<Item | null>(null);
  const [resolutionMethod, setResolutionMethod] = useState<'chat' | 'admin_office' | 'meetup' | 'self_found'>('chat');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [itemToShare, setItemToShare] = useState<Item | null>(null);

  const handleOpenResolutionModal = (item: Item) => {
    setItemForResolution(item);
    setResolutionMethod('chat');
    setResolutionNotes('');
  };

  const handleConfirmResolution = async () => {
    if (!itemForResolution) return;
    setIsSubmittingResolution(true);
    try {
      const { apiFetch } = await import('../utils/api');
      await apiFetch(`/items/${itemForResolution.id}/status`, {
        method: 'PUT',
        bodyData: { 
          status: 'returned',
          resolutionMethod,
          resolutionNotes: resolutionNotes.trim() || undefined
        }
      });
      setLocalStatuses(prev => ({ ...prev, [itemForResolution.id]: 'returned' }));
      if (onShowToast) {
        onShowToast(`🎉 Listing status marked as ${itemForResolution.type === 'lost' ? 'Recovered & Reunited' : 'Returned to Owner'}!`, 'success');
      }
      setItemForResolution(null);
    } catch (err: any) {
      if (onShowToast) onShowToast(err?.message || 'Failed to update status', 'error');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const userName = user?.fullName || 'Student';

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGreeting(getGreeting());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const dashAvatar = user?.avatar || (user as any)?.profilePhoto || (user as any)?.profileImage || (user as any)?.profile_photo || (user as any)?.photoURL;
  const hasDashAvatar = Boolean(dashAvatar && (dashAvatar.startsWith('http') || dashAvatar.startsWith('data:') || dashAvatar.startsWith('/')));

  const initials = (dashAvatar && !hasDashAvatar && dashAvatar.length <= 3)
    ? dashAvatar
    : userName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'JK';

  const unreadChats = (threads || []).reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 550);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const totalPosts = myItems.length;
  
  const pendingCount = myItems.filter(i => 
    !i.isDeleted && i.status !== 'deleted' && 
    (i.approvalStatus === 'pending' || i.status === 'pending' || (i as any).approval_status === 'pending')
  ).length;

  const rejectedCount = myItems.filter(i => 
    !i.isDeleted && i.status !== 'deleted' && 
    (i.approvalStatus === 'rejected' || i.status === 'rejected' || (i as any).isRejected === true)
  ).length;

  const lostActive = myItems.filter(i => 
    i.type === 'lost' && 
    i.status !== 'returned' && i.status !== 'claimed' && i.status !== 'reunited' && i.status !== 'resolved' &&
    i.approvalStatus !== 'rejected' && i.status !== 'rejected'
  ).length;

  const foundActive = myItems.filter(i => 
    i.type === 'found' && 
    i.status !== 'returned' && i.status !== 'claimed' && i.status !== 'reunited' && i.status !== 'resolved' &&
    i.approvalStatus !== 'rejected' && i.status !== 'rejected'
  ).length;

  const returnedCount = myItems.filter(i => 
    i.status === 'returned' || i.status === 'claimed' || i.status === 'reunited' || i.status === 'resolved'
  ).length;

  const displayedItems = myItems.filter(item => {
    if (reportFilter === 'pending') {
      return (item.approvalStatus === 'pending' || item.status === 'pending' || (item as any).approval_status === 'pending');
    }
    if (reportFilter === 'rejected') {
      return (item.approvalStatus === 'rejected' || item.status === 'rejected' || (item as any).isRejected === true);
    }
    if (reportFilter === 'review') {
      return (item.approvalStatus === 'pending' || item.status === 'pending' || (item as any).approval_status === 'pending') ||
             (item.approvalStatus === 'rejected' || item.status === 'rejected' || (item as any).isRejected === true);
    }
    if (reportFilter === 'lost') {
      return item.type === 'lost' && item.status !== 'returned' && item.status !== 'claimed' && item.status !== 'reunited' && item.status !== 'resolved';
    }
    if (reportFilter === 'found') {
      return item.type === 'found' && item.status !== 'returned' && item.status !== 'claimed' && item.status !== 'reunited' && item.status !== 'resolved';
    }
    if (reportFilter === 'reunited') {
      return item.status === 'returned' || item.status === 'claimed' || item.status === 'reunited' || item.status === 'resolved';
    }
    return true;
  }).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0);
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0);
    if (timeA !== timeB) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });

  const renderStatsSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {Array(5).fill(null).map((_, i) => (
        <div key={i} className="bg-white dark:bg-brand-surface border border-brand-border p-5 rounded-2xl shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-surface2 animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-12 bg-brand-surface2 rounded animate-pulse" />
            <div className="h-3 w-20 bg-brand-surface2 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderRecentPostsSkeletons = () => (
    <div className="flex flex-col gap-3">
      {Array(Math.max(3, myItems.length)).fill(null).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-brand-surface border border-brand-border rounded-xl">
          <div className="w-12 h-12 bg-brand-surface2 rounded-xl animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-1/3 bg-brand-surface2 rounded animate-pulse" />
            <div className="h-3 w-1/4 bg-brand-surface2 rounded animate-pulse" />
          </div>
          <div className="w-20 h-6 bg-brand-surface2 rounded-full animate-pulse flex-shrink-0" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-[calc(100vh-68px)]">
      {/* Sidebar navigation */}
      <aside className="bg-brand-navy p-6 flex flex-col hidden lg:block border-r border-brand-gold/10">
        <div className="flex items-center gap-3 p-3.5 bg-white/5 rounded-xl border border-brand-gold/15 mb-6">
          {hasDashAvatar ? (
            <img 
              src={dashAvatar} 
              alt={userName} 
              className="w-10 h-10 rounded-full border border-brand-gold/20 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-bold flex items-center justify-center text-sm shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{userName}</div>
            {user?.studentId ? (
              <div className="text-[11px] text-brand-gold/80 tracking-wider font-mono truncate">
                Reg: {user.studentId}{((user as any)?.classRoll || (user as any)?.rollNumber || (user as any)?.roll) ? ` • Roll: ${(user as any).classRoll || (user as any).rollNumber || (user as any).roll}` : ''}
              </div>
            ) : (
              <div className="text-[10px] text-white/40 tracking-wider">ID: Not Setup</div>
            )}
            {user?.sessionYear ? (
              <div className="text-[10px] text-white/50 tracking-wider truncate">Session: {user.sessionYear}</div>
            ) : (
              <div className="text-[9px] text-white/30 tracking-wider">Session: Not Setup</div>
            )}
            {user?.department && (
              <div className="text-[10px] text-white/40 tracking-wider truncate" title={user.department}>Dept: {user.department}</div>
            )}
          </div>
        </div>

        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">Main Menu</div>
        <div className="flex flex-col gap-1 mb-6">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-brand-gold-mid font-semibold bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 rounded-lg border border-brand-gold/20 text-xs sm:text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-navy">
            <FileText className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => onTabChange('listing')} 
            onKeyDown={(e) => handleKeyDown(e, () => onTabChange('listing'))}
            className="flex items-center gap-3 w-full px-3 py-2 text-white/60 hover:bg-white/5 hover:text-white rounded-lg text-xs sm:text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-navy cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            Browse Items
          </button>
          <button 
            onClick={() => onTabChange('post')} 
            onKeyDown={(e) => handleKeyDown(e, () => onTabChange('post'))}
            className="flex items-center gap-3 w-full px-3 py-2 text-white/60 hover:bg-white/5 hover:text-white rounded-lg text-xs sm:text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-navy cursor-pointer"
          >
            <Plus className="w-4 h-4 text-brand-gold" />
            Post New Item
          </button>
          <button 
            onClick={() => onTabChange('chat')} 
            onKeyDown={(e) => handleKeyDown(e, () => onTabChange('chat'))}
            className="flex items-center justify-between w-full px-3 py-2 text-white/60 hover:bg-white/5 hover:text-white rounded-lg text-xs sm:text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-navy cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <MessagesSquare className="w-4 h-4" />
              Messages
            </span>
            {unreadChats > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unreadChats}</span>
            )}
          </button>
        </div>

        {/* My Reports section with Create Post Icon */}
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>My Reports</span>
            <button 
              type="button"
              onClick={() => onTabChange('post')}
              className="p-1 text-brand-gold hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Post Lost or Found Item"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          </span>
          {reportFilter !== 'all' && (
            <button 
              type="button"
              onClick={() => setReportFilter('all')} 
              className="text-[9px] text-brand-gold hover:underline cursor-pointer font-normal"
            >
              Show All
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button 
            type="button"
            onClick={() => setReportFilter('all')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold ${
              reportFilter === 'all'
                ? 'bg-white/10 text-white font-bold border border-white/20'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-brand-gold/80" />
              All Reports
            </span>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalPosts}</span>
          </button>

          <button 
            type="button"
            onClick={() => setReportFilter(prev => prev === 'pending' ? 'all' : 'pending')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold ${
              reportFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Pending Approval
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pendingCount > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-white/10 text-white/60'}`}>
              {pendingCount}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => setReportFilter(prev => prev === 'rejected' ? 'all' : 'rejected')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold ${
              reportFilter === 'rejected'
                ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 font-bold'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400" />
              Rejected Reports
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rejectedCount > 0 ? 'bg-rose-600 text-white' : 'bg-white/10 text-white/60'}`}>
              {rejectedCount}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => setReportFilter(prev => prev === 'lost' ? 'all' : 'lost')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold ${
              reportFilter === 'lost'
                ? 'bg-red-500/20 text-white border border-red-500/40 font-bold'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              Lost Reports
            </span>
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lostActive}</span>
          </button>

          <button 
            type="button"
            onClick={() => setReportFilter(prev => prev === 'found' ? 'all' : 'found')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold ${
              reportFilter === 'found'
                ? 'bg-emerald-500/20 text-white border border-emerald-500/40 font-bold'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Found Reports
            </span>
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{foundActive}</span>
          </button>

          <button 
            type="button"
            onClick={() => setReportFilter(prev => prev === 'reunited' ? 'all' : 'reunited')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs sm:text-sm text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold ${
              reportFilter === 'reunited'
                ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40 font-bold'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-brand-gold" />
              Reunited / Claimed
            </span>
            <span className="bg-brand-gold text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded-full">{returnedCount}</span>
          </button>
        </div>

        {/* Quick Post CTA in Sidebar */}
        <div className="mt-8 pt-6 border-t border-brand-gold/15">
          <button
            type="button"
            onClick={() => onTabChange('post')}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-brand-gold to-brand-gold-mid hover:from-brand-gold-mid hover:to-brand-gold text-[#0D1B2A] font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Post Item Now</span>
          </button>
        </div>
      </aside>

      {/* Main dashboard content */}
      <main className="p-4 sm:p-6 md:p-10 bg-brand-cream dark:bg-[#0B111E] min-w-0">
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-2.5xl font-bold tracking-tight text-brand-navy dark:text-white">{getGreetingEmoji(currentGreeting)} {currentGreeting}, {userName}</h2>
            <p className="text-xs sm:text-sm text-brand-ink2 dark:text-slate-400 font-light mt-1">Manage your lost & found item posts and track approval status in real time.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabChange('post')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-navy hover:bg-brand-navy-mid dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-3.5 h-3.5 text-brand-gold dark:text-slate-950" />
              <span>Post Lost/Found Item</span>
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Sub-Navigation Strip (Visible on screens < lg) */}
        <div className="lg:hidden flex items-center gap-2 p-1.5 bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl mb-6 overflow-x-auto scrollbar-none shadow-xs">
          <button
            type="button"
            onClick={() => onTabChange('listing')}
            className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5 text-brand-gold" />
            <span>Browse Items</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('chat')}
            className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <MessagesSquare className="w-3.5 h-3.5 text-brand-gold" />
            <span>Messages</span>
            {unreadChats > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">{unreadChats}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenUserModal?.('saved')}
            className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 text-brand-gold" />
            <span>Saved Bookmarks</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenUserModal?.('profile')}
            className="flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-brand-gold" />
            <span>My Profile</span>
          </button>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          renderStatsSkeletons()
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-6 sm:mb-8 animate-in fade-in duration-300">
            {/* Total Reports */}
            <div 
              onClick={() => setReportFilter('all')}
              className={`bg-white dark:bg-[#111A2E] border p-3.5 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer min-w-0 ${
                reportFilter === 'all' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-2.5 sm:mb-3 border border-amber-500/20">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="font-serif text-2xl min-[360px]:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{totalPosts}</div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-1.5 truncate">Total Reports</p>
            </div>

            {/* Active Lost */}
            <div 
              onClick={() => setReportFilter(prev => prev === 'lost' ? 'all' : 'lost')}
              className={`bg-white dark:bg-[#111A2E] border p-3.5 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer min-w-0 ${
                reportFilter === 'lost' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5 sm:mb-3 border border-rose-500/20">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="font-serif text-2xl min-[360px]:text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none">{lostActive}</div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-1.5 truncate">Active Lost</p>
            </div>

            {/* Active Found */}
            <div 
              onClick={() => setReportFilter(prev => prev === 'found' ? 'all' : 'found')}
              className={`bg-white dark:bg-[#111A2E] border p-3.5 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer min-w-0 ${
                reportFilter === 'found' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 sm:mb-3 border border-emerald-500/20">
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="font-serif text-2xl min-[360px]:text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{foundActive}</div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-1.5 truncate">Active Found</p>
            </div>

            {/* Reunited / Claimed */}
            <div 
              onClick={() => setReportFilter(prev => prev === 'reunited' ? 'all' : 'reunited')}
              className={`bg-white dark:bg-[#111A2E] border p-3.5 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer min-w-0 ${
                reportFilter === 'reunited' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 sm:mb-3 border border-amber-500/20">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="font-serif text-2xl min-[360px]:text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none">{returnedCount}</div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-1.5 truncate">Reunited</p>
            </div>

            {/* In Review / Moderation */}
            <div 
              onClick={() => setReportFilter(prev => prev === 'review' ? 'all' : 'review')}
              className={`bg-white dark:bg-[#111A2E] border p-3.5 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer col-span-2 sm:col-span-1 min-w-0 ${
                reportFilter === 'review' || reportFilter === 'pending' || reportFilter === 'rejected' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 sm:mb-3 border border-indigo-500/20">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="font-serif text-2xl min-[360px]:text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-none flex items-baseline gap-1.5">
                {pendingCount + rejectedCount}
                {(pendingCount > 0 || rejectedCount > 0) && (
                  <span className="text-[11px] font-sans font-extrabold text-slate-500 dark:text-slate-400">
                    ({pendingCount}p{rejectedCount > 0 ? `, ${rejectedCount}r` : ''})
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-1.5 truncate">In Review</p>
            </div>
          </div>
        )}

        {/* Lower layout split */}
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-8 items-start">
          {/* Left Column Stack */}
          <div className="flex flex-col gap-8 min-w-0">
            {/* Main recent posts lists */}
            <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-brand-navy dark:text-white">
                  {reportFilter === 'pending' ? '⏳ Pending Approval Reports' :
                   reportFilter === 'rejected' ? '❌ Rejected Reports' :
                   reportFilter === 'review' ? '⏳ In Review / Moderation Reports' :
                   reportFilter === 'lost' ? '🎒 My Lost Reports' :
                   reportFilter === 'found' ? '🔑 My Found Reports' :
                   reportFilter === 'reunited' ? '🎉 Reunited / Resolved Reports' :
                   '📋 My Recent Posts'}
                </h3>
                {reportFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setReportFilter('all')}
                    className="px-2.5 py-1 bg-brand-gold/20 hover:bg-brand-gold/30 text-slate-900 dark:text-amber-300 text-[11px] font-extrabold rounded-md transition-colors cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <button 
                onClick={() => onTabChange('listing')} 
                onKeyDown={(e) => handleKeyDown(e, () => onTabChange('listing'))}
                className="text-xs font-bold text-brand-gold hover:text-brand-gold-mid focus:outline-none focus:ring-2 focus:ring-brand-gold rounded px-1 cursor-pointer"
              >
                View Public Browse
              </button>
            </div>

            {/* Sub-filter tabs inside list view */}
            <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-4 border-b border-brand-border/60 dark:border-slate-800 no-scrollbar touch-scroll w-full shrink-0">
              <button
                type="button"
                onClick={() => setReportFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                  reportFilter === 'all'
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-md ring-2 ring-slate-900 dark:ring-amber-500/40'
                    : 'bg-slate-100 dark:bg-[#162232] hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700'
                }`}
              >
                <span>All Reports</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  reportFilter === 'all'
                    ? 'bg-amber-400 dark:bg-slate-950 text-slate-950 dark:text-amber-400'
                    : 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-300'
                }`}>
                  {totalPosts}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilter('lost')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                  reportFilter === 'lost'
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${reportFilter === 'lost' ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`} />
                <span>Lost Reports</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  reportFilter === 'lost'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200'
                }`}>
                  {lostActive}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilter('found')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                  reportFilter === 'found'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60'
                }`}
              >
                <HelpCircle className={`w-3.5 h-3.5 ${reportFilter === 'found' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                <span>Found Reports</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  reportFilter === 'found'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                }`}>
                  {foundActive}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilter('reunited')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                  reportFilter === 'reunited'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-500'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${reportFilter === 'reunited' ? 'text-slate-950' : 'text-amber-600 dark:text-amber-400'}`} />
                <span>Reunited</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  reportFilter === 'reunited'
                    ? 'bg-slate-950 text-amber-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200'
                }`}>
                  {returnedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFilter('review')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                  reportFilter === 'review' || reportFilter === 'pending' || reportFilter === 'rejected'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${reportFilter === 'review' || reportFilter === 'pending' || reportFilter === 'rejected' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <span>In Review</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  reportFilter === 'review' || reportFilter === 'pending' || reportFilter === 'rejected'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200'
                }`}>
                  {pendingCount + rejectedCount}
                </span>
              </button>
            </div>

            {isLoading ? (
              renderRecentPostsSkeletons()
            ) : myItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 dark:bg-[#162232]/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-brand-navy dark:text-white mb-1">You haven't posted any items yet</p>
                <p className="text-xs text-brand-ink3 dark:text-slate-400 mb-4">Post a lost or found item to get help from the campus community.</p>
                <button
                  onClick={() => onTabChange('post')}
                  className="px-4 py-2 bg-brand-navy hover:bg-brand-navy-mid dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-brand-gold dark:text-slate-950" />
                  Post Lost/Found Item
                </button>
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="text-center py-10 text-brand-ink3 dark:text-slate-400 text-xs sm:text-sm bg-slate-50/50 dark:bg-[#162232]/50 rounded-xl border border-slate-200 dark:border-slate-700">
                No reports match the <strong>"{reportFilter}"</strong> filter right now.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 animate-in fade-in duration-300">
                {displayedItems.map(item => {
                  const isPending = (item.approvalStatus === 'pending' || item.status === 'pending' || (item as any).approval_status === 'pending');
                  const isRejected = (item.approvalStatus === 'rejected' || item.status === 'rejected' || (item as any).isRejected === true);
                  const isReunited = (item.status === 'returned' || item.status === 'claimed' || item.status === 'reunited' || item.status === 'resolved');

                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 border rounded-xl transition-all duration-200 ${
                        isPending 
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 hover:border-amber-400' 
                          : isRejected 
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/60 hover:border-rose-400' 
                          : 'bg-white dark:bg-[#162232] hover:bg-slate-50 dark:hover:bg-[#1c2b3e] border-slate-200 dark:border-slate-700/80 hover:border-brand-gold shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          onClick={() => onSelectItem(item)}
                          className="w-14 h-14 bg-slate-100 dark:bg-[#111A2E] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs relative cursor-pointer"
                        >
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
                            <Inbox className="w-6 h-6 text-brand-gold opacity-85" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h4 
                              onClick={() => onSelectItem(item)}
                              className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-gold transition-colors cursor-pointer truncate"
                            >
                              {item.title}
                            </h4>

                            {/* Status Badge */}
                            {(() => {
                              const effStatus = localStatuses[item.id] || item.status;
                              if (item.isDeleted || effStatus === 'deleted') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                                    Deleted
                                  </span>
                                );
                              }
                              if (isPending) {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 animate-pulse">
                                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    Pending Approval
                                  </span>
                                );
                              }
                              if (isRejected) {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60">
                                    <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                    Rejected
                                  </span>
                                );
                              }
                              if (effStatus === 'handover_pending') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/60 animate-pulse">
                                    <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    Handover Pending
                                  </span>
                                );
                              }
                              if (effStatus === 'under_verification' || effStatus === 'claim_requested') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    In Verification
                                  </span>
                                );
                              }
                              if (effStatus === 'returned' || effStatus === 'reunited' || effStatus === 'claimed' || effStatus === 'resolved') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    {item.type === 'lost' ? 'Reunited' : 'Returned'}
                                  </span>
                                );
                              }
                              if (effStatus === 'closed') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                    <AlertCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                    Closed
                                  </span>
                                );
                              }
                              return (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                                  item.type === 'lost' 
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60' 
                                    : 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900/60'
                                }`}>
                                  {item.type === 'lost' ? 'Lost' : 'Found'}
                                </span>
                              );
                            })()}

                            {/* Reward Badge - only if user specified real reward details */}
                            {item.type === 'lost' && hasItemReward(item) && (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 bg-amber-500 text-slate-950 border border-amber-400"
                                title={`Reward Offered: ${getRewardDetails(item)}`}
                              >
                                🎁 Reward
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 font-medium">
                            <span className="truncate max-w-[180px] sm:max-w-none font-semibold text-slate-800 dark:text-slate-200">{item.location}</span>
                            <span className="text-slate-400 dark:text-slate-600">•</span>
                            <span className="shrink-0 text-slate-500 dark:text-slate-400">{formatPostTime(item.createdAt || item.date)}</span>
                          </p>

                          {/* Notice Banner for Pending / Rejected */}
                          {isPending && (
                            <div className="mt-2.5 p-2 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[11px] text-amber-950 dark:text-amber-200 flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              <span>This post is under review by campus moderators. It will appear in public search once approved.</span>
                            </div>
                          )}

                          {isRejected && (
                            <div className="mt-2.5 p-2 bg-rose-100/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-lg text-[11px] text-rose-950 dark:text-rose-200 flex items-start gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Post Rejected: </span>
                                <span>{(item as any).rejectionReason || 'Violation of campus posting guidelines or insufficient description.'}</span>
                              </div>
                            </div>
                          )}

                          {/* Notice Banner for Handover Pending */}
                          {(localStatuses[item.id] === 'handover_pending' || item.status === 'handover_pending') && (
                            <div className="mt-2.5 p-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-lg text-[11px] text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                              <span><strong>Handover in Progress:</strong> Claim has been approved. Please coordinate handover with claimant or staff.</span>
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
                              <button
                                onClick={() => onSelectItem(item)}
                                className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-brand-gold dark:hover:text-amber-400 inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 sm:bg-transparent dark:sm:bg-transparent"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Details
                              </button>
                              {(() => {
                                const effectiveStatus = localStatuses[item.id] || item.status;
                                if (effectiveStatus !== 'returned' && effectiveStatus !== 'reunited' && effectiveStatus !== 'resolved' && effectiveStatus !== 'deleted') {
                                  return (
                                    <button
                                      onClick={() => handleOpenResolutionModal(item)}
                                      className="text-[11px] sm:text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-2.5 py-1 rounded-md shadow-xs shrink-0 inline-flex items-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
                                      title="Mark as reunited or returned with resolution details"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>{item.type === 'lost' ? '🎉 I Found My Item' : '✓ Mark Returned'}</span>
                                    </button>
                                  );
                                }
                                return (
                                  <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 shrink-0 px-2 py-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Reunited & Returned
                                  </span>
                                );
                              })()}
                              <button
                                onClick={() => onTabChange('chat')}
                                className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 sm:bg-transparent dark:sm:bg-transparent"
                              >
                                <MessagesSquare className="w-3.5 h-3.5" /> Messages
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToShare(item);
                                }}
                                className="text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-amber-200/80 dark:border-amber-700/60 shadow-2xs active:scale-95"
                                title="Share on Facebook, Messenger, WhatsApp, or Copy Link"
                              >
                                <Share2 className="w-3.5 h-3.5" /> Share
                              </button>
                            </div>

                            {/* Delete Action Button */}
                            <div>
                              {itemToDelete === item.id ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-700 animate-in fade-in zoom-in-95">
                                  <span className="text-[11px] text-rose-700 dark:text-rose-300 font-extrabold">Confirm delete?</span>
                                  <button 
                                    disabled={isDeletingId === item.id}
                                    onClick={async () => {
                                      setIsDeletingId(item.id);
                                      if (onDeleteItem) {
                                        await onDeleteItem(item.id);
                                      } else {
                                        onShowToast('Delete action completed.', 'success');
                                      }
                                      setIsDeletingId(null);
                                      setItemToDelete(null);
                                    }}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black cursor-pointer transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>{isDeletingId === item.id ? 'Deleting...' : 'Yes, Delete'}</span>
                                  </button>
                                  <button 
                                    onClick={() => setItemToDelete(null)}
                                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setItemToDelete(item.id)}
                                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200/80 dark:border-rose-800/60 transition-all hover:bg-rose-100 dark:hover:bg-rose-950/70"
                                  title="Delete this report permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                  <span>Delete Report</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

          {/* Right sidebar side layout */}
          <div className="flex flex-col gap-6 min-w-0">
            <div className="bg-white dark:bg-[#111A2E] border border-brand-border dark:border-slate-800 p-6 rounded-2xl shadow-sm">
              {/* Quick Shortcuts Section */}
              <div className="mb-6">
                <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-3.5">
                  Quick Shortcuts
                </h3>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => onTabChange('listing')}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#162232] hover:bg-slate-100 dark:hover:bg-[#1c2b3e] border border-slate-200/90 dark:border-slate-700/80 text-left transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Send className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Browse All Items</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Public</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('chat')}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#162232] hover:bg-slate-100 dark:hover:bg-[#1c2b3e] border border-slate-200/90 dark:border-slate-700/80 text-left transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <MessagesSquare className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Chat Messages</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inbox</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenUserModal ? onOpenUserModal('saved') : onTabChange('listing')}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#162232] hover:bg-slate-100 dark:hover:bg-[#1c2b3e] border border-slate-200/90 dark:border-slate-700/80 text-left transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white block">Saved Items</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Your bookmarked campus listings</span>
                      </div>
                    </div>
                    <span className="text-xs text-rose-700 dark:text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60">
                      Saved
                    </span>
                  </button>
                </div>
              </div>

              {/* Recent Alerts Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Recent Alerts
                  </h4>
                  {notifications.length > 0 && onOpenUserModal && (
                    <button
                      onClick={() => onOpenUserModal('notifications')}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline cursor-pointer"
                    >
                      View all ({notifications.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {notifications.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-[#162232] rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center justify-center gap-1.5">
                      <Inbox className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        No recent alert notifications
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        You will see item matches, claim updates, and direct chats here.
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 4).map(n => {
                      const formatted = formatNotificationContent(n);
                      const { icon: NotifIcon, colorClass } = getNotificationIconAndColor(n);
                      return (
                        <div 
                          key={n.id} 
                          role="button"
                          tabIndex={0}
                          aria-label={`Alert: ${formatted.plainText}`}
                          onClick={() => {
                            handleNotificationClick({
                              notif: n,
                              items: allItems.length > 0 ? allItems : myItems,
                              onSelectItem,
                              onTabChange,
                              onOpenUserModal,
                              onShowToast,
                              onMarkRead: (id) => onMarkNotificationRead?.(id)
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleNotificationClick({
                                notif: n,
                                items: allItems.length > 0 ? allItems : myItems,
                                onSelectItem,
                                onTabChange,
                                onOpenUserModal,
                                onShowToast,
                                onMarkRead: (id) => onMarkNotificationRead?.(id)
                              });
                            }
                          }}
                          className={`text-xs p-3.5 rounded-xl border flex items-start gap-3 transition-all duration-150 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                            formatted.isUnread 
                              ? 'bg-amber-50/90 dark:bg-amber-950/30 hover:bg-amber-100/90 dark:hover:bg-amber-950/50 border-amber-300 dark:border-amber-700/70 border-l-4 border-l-amber-500' 
                              : 'bg-slate-50/90 dark:bg-[#162232] hover:bg-slate-100 dark:hover:bg-[#1c2b3e] border-slate-200 dark:border-slate-700/80 border-l-4 border-l-slate-300 dark:border-l-slate-600'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs ${colorClass}`}>
                            <NotifIcon aria-hidden="true" className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1.5">
                              <p 
                                className={`text-[12.5px] leading-relaxed break-words ${
                                  formatted.isUnread
                                    ? 'text-slate-950 dark:text-white font-bold [&_strong]:text-amber-900 dark:[&_strong]:text-amber-300 [&_strong]:font-black'
                                    : 'text-slate-800 dark:text-slate-200 font-medium [&_strong]:text-slate-950 dark:[&_strong]:text-white [&_strong]:font-bold'
                                }`} 
                                dangerouslySetInnerHTML={{ __html: formatted.html }} 
                              />
                              {formatted.isUnread && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1 shadow-xs" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">{formatted.time}</span>
                              {formatted.category && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                                  {formatted.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Resolution Confirmation Modal */}
      {itemForResolution && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-[min(calc(100vw-24px),28rem)] w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                    {itemForResolution.type === 'lost' ? 'Item Reunited & Recovered' : 'Handover & Return Completed'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Record successful recovery to update community status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemForResolution(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#162232] rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Item: <strong className="text-slate-900 dark:text-white font-bold">"{itemForResolution.title}"</strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                How was the item recovered or returned?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'chat', label: 'In-App Chat / Message', desc: 'Resolved through student chat messages', icon: MessageSquare },
                  { id: 'admin_office', label: 'Admin / Proctor Office', desc: 'Handed over via university authority', icon: Building2 },
                  { id: 'meetup', label: 'Direct Campus Meetup', desc: 'Met at library/TSC/faculty building', icon: Users },
                  { id: 'self_found', label: 'Found on My Own', desc: 'Recovered independently or retrieved safely', icon: CheckCircle2 }
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSel = resolutionMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setResolutionMethod(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSel 
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#162232] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="text-xs font-bold">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Optional Note / Gratitude Message
              </label>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Returned safely to owner! Thanks to the kind student who contacted me."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#162232] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setItemForResolution(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingResolution}
                onClick={handleConfirmResolution}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingResolution ? 'Updating...' : itemForResolution.type === 'lost' ? 'Confirm Reunited' : 'Confirm Returned'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        item={itemToShare}
        isOpen={itemToShare !== null}
        onClose={() => setItemToShare(null)}
        onShowToast={onShowToast}
      />
    </div>
  );
}
