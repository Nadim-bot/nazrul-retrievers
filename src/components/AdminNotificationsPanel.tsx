import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { 
  Bell, 
  Check, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  User, 
  HelpCircle, 
  Package, 
  Key, 
  Clock, 
  Search,
  Filter,
  CheckCheck,
  Inbox
} from 'lucide-react';
import { AdminNotification } from '../types';

interface AdminNotificationsPanelProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshCount?: () => void;
}

export default function AdminNotificationsPanel({ onShowToast, onRefreshCount }: AdminNotificationsPanelProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const url = `/admin/notifications?category=${category}&q=${encodeURIComponent(search)}`;
      const res = await apiFetch(url);
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch (err: any) {
      console.warn('Admin notifications fetch note:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [category, search]);

  const handleMarkAsRead = async (id: string | number) => {
    // Immediate optimistic local update
    setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, isRead: true } : n));
    onShowToast('Notification marked as read.', 'success');
    if (onRefreshCount) onRefreshCount();

    try {
      await apiFetch(`/admin/notifications/${id}/read`, { method: 'PUT' });
    } catch (e) {
      console.warn('Read sync note:', e);
    }
  };

  const handleMarkAllRead = async () => {
    // Immediate optimistic local update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    onShowToast('All notifications marked as read.', 'success');
    if (onRefreshCount) onRefreshCount();

    try {
      await apiFetch('/admin/notifications/read-all', { method: 'PUT' });
    } catch (e) {
      console.warn('Read all sync note:', e);
    }
  };

  const handleDeleteNotification = async (id: string | number) => {
    // Immediate optimistic local update
    setNotifications(prev => prev.filter(n => String(n.id) !== String(id)));
    onShowToast('Notification removed.', 'info');
    if (onRefreshCount) onRefreshCount();

    try {
      await apiFetch(`/admin/notifications/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete sync note:', e);
    }
  };

  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case 'User': return <User className="w-4 h-4 text-sky-700" />;
      case 'Lost Items': return <Package className="w-4 h-4 text-rose-700" />;
      case 'Found Items': return <Package className="w-4 h-4 text-emerald-700" />;
      case 'Claims': return <Key className="w-4 h-4 text-indigo-700" />;
      case 'Messages': return <Bell className="w-4 h-4 text-amber-700" />;
      case 'Security': return <ShieldAlert className="w-4 h-4 text-red-700" />;
      default: return <HelpCircle className="w-4 h-4 text-slate-700" />;
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Just now';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const categories = ['All', 'User', 'Lost Items', 'Found Items', 'Claims', 'Messages', 'Security', 'System'];

  // Filtered list by status and search
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const isRead = n.isRead === true || (n.isRead as any) === 1;
      if (statusFilter === 'unread' && isRead) return false;
      if (statusFilter === 'read' && !isRead) return false;
      return true;
    });
  }, [notifications, statusFilter]);

  const totalUnreadCount = useMemo(() => {
    return notifications.filter(n => n.isRead !== true && (n.isRead as any) !== 1).length;
  }, [notifications]);

  return (
    <div id="admin-notifications-panel" className="bg-white border border-brand-border rounded-2xl shadow-sm p-5 sm:p-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-brand-border/40">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center shadow-xs border border-brand-gold/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-brand-navy">
                  Notification Center
                </h3>
                {totalUnreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs animate-pulse">
                    {totalUnreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-brand-ink2 mt-0.5">
                Real-time updates on ID approvals, item posts, claims, moderation, and campus alerts
              </p>
            </div>
          </div>
        </div>

        {totalUnreadCount > 0 && (
          <button 
            id="btn-mark-all-read"
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-brand-gold font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0 border border-brand-gold/30"
          >
            <CheckCheck className="w-4 h-4 text-brand-gold" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Category Tabs & Status Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-brand-gold" /> Category:
          </span>
          {categories.map(cat => {
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-brand-navy text-brand-gold shadow-xs' 
                    : 'bg-brand-cream hover:bg-slate-100 text-slate-700 border border-brand-border'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Status Filter (All / Unread / Read) */}
        <div className="flex items-center bg-brand-cream p-1 rounded-xl border border-brand-border shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-brand-navy shadow-xs' : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('unread')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'unread' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            <span>Unread</span>
            {totalUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {totalUnreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('read')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'read' ? 'bg-white text-brand-navy shadow-xs' : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications by title, details, user name, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-brand-cream border border-brand-border rounded-xl outline-none font-semibold text-brand-navy placeholder:text-slate-400 focus:border-brand-navy focus:bg-white transition-all shadow-inner"
          />
        </div>
        <button 
          onClick={() => fetchNotifications(true)}
          className="px-4 py-2.5 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy/90 transition-all cursor-pointer shadow-xs active:scale-95 border border-brand-navy"
        >
          Search
        </button>
      </div>

      {/* List Container */}
      {loading && notifications.length === 0 ? (
        <div className="text-center py-14 text-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-brand-gold border-t-transparent animate-spin"></div>
          <span className="text-xs font-bold text-slate-700">Loading notifications...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-brand-cream/50 rounded-2xl border border-dashed border-brand-border">
          <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-brand-navy">No notifications found</p>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {statusFilter === 'unread' 
              ? 'No unread notifications! You are completely caught up.' 
              : 'There are no recent notifications in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
          {filteredNotifications.map((notif) => {
            const isRead = notif.isRead === true || (notif.isRead as any) === 1;
            const priority = (notif.priority || 'medium').toLowerCase();
            const displayTitle = notif.title || 'Campus Notification';
            const displayMessage = notif.message || notif.title || '';

            return (
              <div 
                key={String(notif.id)} 
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3.5 shadow-xs hover:shadow-sm ${
                  !isRead 
                    ? 'bg-amber-50/80 hover:bg-amber-50 border-amber-300 border-l-4 border-l-amber-600' 
                    : 'bg-white hover:bg-brand-cream/40 border-brand-border border-l-4 border-l-brand-gold/50'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                    !isRead
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-brand-cream text-brand-navy border border-brand-border'
                  }`}>
                    {getCategoryIcon(notif.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-sm font-bold tracking-tight ${!isRead ? 'text-brand-navy font-black' : 'text-brand-navy'}`}>
                        {displayTitle}
                      </span>
                      
                      {!isRead && (
                        <span className="bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-2xs">
                          NEW
                        </span>
                      )}
                      
                      {notif.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-brand-cream text-brand-navy border border-brand-border">
                          {notif.category}
                        </span>
                      )}

                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
                        priority === 'high' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        priority === 'medium' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {priority}
                      </span>
                    </div>

                    {displayMessage && (
                      <p className="text-xs sm:text-[13px] font-medium text-slate-800 leading-relaxed mt-1 break-words">
                        {displayMessage}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(notif.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  {!isRead ? (
                    <button 
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                      title="Mark as Read"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                      <span className="hidden sm:inline">Mark Read</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 px-2 py-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span className="hidden sm:inline">Read</span>
                    </span>
                  )}
                  <button 
                    onClick={() => handleDeleteNotification(notif.id)}
                    className="p-1.5 rounded-lg border border-brand-border bg-brand-cream hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-500 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
