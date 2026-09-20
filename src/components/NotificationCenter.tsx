import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { 
  Bell, ShieldAlert, Check, CheckSquare, Trash2, Shield, 
  UserCheck, AlertTriangle, Info, Settings, Clock, RefreshCw 
} from 'lucide-react';

interface AdminNotification {
  id: string | number;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  relatedUserId?: string | number;
  relatedItemId?: string | number;
  relatedConversationId?: string | number;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function NotificationCenter({ onShowToast }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Security' | 'User' | 'System'>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/notifications');
      if (res && res.notifications) {
        // Display only unread notifications as requested
        const unread = res.notifications.filter((n: any) => n.isRead !== true && n.isRead !== 1);
        setNotifications(unread);
      }
    } catch (err) {
      console.warn('API notification fetch failed.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Refresh notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string | number) => {
    try {
      await apiFetch(`/admin/notifications/${id}/read`, {
        method: 'PUT'
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      onShowToast('Notification cleared.', 'success');
    } catch (err) {
      // Sandbox fallback
      setNotifications(prev => prev.filter(n => n.id !== id));
      onShowToast('Notification cleared (sandbox).', 'success');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0) return;
    try {
      await apiFetch('/admin/notifications/read-all', {
        method: 'PUT'
      });
      setNotifications([]);
      onShowToast('All notifications marked as read.', 'success');
      setIsOpen(false);
    } catch (err) {
      // Sandbox fallback
      setNotifications([]);
      onShowToast('All notifications marked as read (sandbox).', 'success');
      setIsOpen(false);
    }
  };

  // Map backend categories to User's specific categories: Security, User, System
  const getMappedCategory = (notif: AdminNotification): 'Security' | 'User' | 'System' => {
    const cat = (notif?.category || '').toLowerCase();
    if (cat === 'security' || cat === 'messages' || cat === 'conversation_reported') {
      return 'Security';
    }
    if (cat === 'user' || cat === 'claims' || cat === 'lost items' || cat === 'found items') {
      return 'User';
    }
    return 'System';
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'All') return true;
    return getMappedCategory(n) === activeFilter;
  });

  const getNotificationIcon = (notif: AdminNotification) => {
    const cat = getMappedCategory(notif);
    if (cat === 'Security') return <ShieldAlert className="w-4 h-4 text-rose-600" />;
    if (cat === 'User') return <UserCheck className="w-4 h-4 text-amber-600" />;
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  const getPriorityStyle = (priority: string) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'high':
        return 'border-l-4 border-rose-500 bg-rose-50/10';
      case 'medium':
        return 'border-l-4 border-amber-500 bg-amber-50/10';
      default:
        return 'border-l-4 border-slate-300';
    }
  };

  const getRelativeTime = (isoStr: string) => {
    if (!isoStr) return 'Just now';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Just now';
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white border border-brand-border rounded-xl hover:bg-brand-gold-light/10 text-brand-navy transition-all focus:outline-none focus:ring-2 focus:ring-brand-gold cursor-pointer flex items-center justify-center shadow-sm"
        aria-label="Admin Notifications"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-extrabold flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in duration-200">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-brand-border rounded-2xl shadow-2xl z-[500] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-brand-navy border-b border-brand-gold/15 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-gold" />
              <span className="font-serif text-sm font-bold">Coordinator Notifications</span>
              <span className="bg-brand-gold/20 text-brand-gold text-[10px] px-2 py-0.5 rounded-full font-bold">
                {notifications.length} unread
              </span>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-brand-gold hover:text-brand-gold-mid font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          {/* Filters Tab Row */}
          <div className="flex bg-brand-surface2/50 p-1 border-b border-brand-border/40 text-xs font-bold text-brand-ink2">
            {(['All', 'Security', 'User', 'System'] as const).map(filter => {
              const count = filter === 'All' 
                ? notifications.length 
                : notifications.filter(n => getMappedCategory(n) === filter).length;

              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    activeFilter === filter
                      ? 'bg-white text-brand-navy shadow-sm'
                      : 'hover:text-brand-navy'
                  }`}
                >
                  {filter}
                  {count > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-[8px] px-1.5 py-0.2 rounded-full font-extrabold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notifications List Container */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-brand-surface2 bg-brand-cream/5">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-brand-ink3 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-gold-mid" />
                <span className="text-xs">Updating security logs...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-brand-ink3">
                <Shield className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-xs font-semibold">No unread {activeFilter !== 'All' ? `${activeFilter} ` : ''}notifications</p>
                <p className="text-[10px] text-brand-ink3 mt-0.5">Everything looks verified and secure on campus.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3.5 flex gap-3 transition-colors hover:bg-brand-gold-light/5 relative group ${getPriorityStyle(notif.priority)}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {getNotificationIcon(notif)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-[#0F172A] truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-[#475569] font-bold flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {getRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#1E293B] font-semibold leading-normal break-words">
                      {notif.message}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-all"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
