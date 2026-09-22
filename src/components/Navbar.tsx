import { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, Menu, LogIn, UserPlus, Home, 
  MessageSquare, LogOut, LayoutDashboard, X, 
  User, Shield, PlusCircle, Database, Folder, Lock,
  Users, ListCheck, Settings, FileText, Check, Navigation,
  GraduationCap, Heart, Sparkles, CheckCircle2, Compass,
  Sun, Moon, Trash2
} from 'lucide-react';
import { NotificationItem, Item } from '../types';
import { handleNotificationClick, getNotificationIconAndColor, formatNotificationContent, isNotificationUnread } from '../utils/notificationNavigation';
import { isDarkActive, toggleThemeQuick, subscribeToTheme } from '../utils/theme';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onDeleteNotification?: (id: string | number) => void;
  onClearAllNotifications?: () => void;
  onShowNotificationToast?: (msg: string) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  user?: { 
    fullName: string; 
    email: string; 
    role: 'student' | 'admin' | 'moderator';
    studentId?: string;
    department?: string;
    sessionYear?: string;
    phone?: string;
    avatar?: string;
    verified?: boolean;
    idVerificationStatus?: string;
  } | null;
  onSetAdminSubTab?: (tab: string) => void;
  onOpenUserModal?: (tab: 'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout') => void;
  onCloseUserModal?: () => void;
  isUserModalOpen?: boolean;
  allItems?: Item[];
  onSelectItem?: (item: Item) => void;
  unreadMessagesCount?: number;
}

export default function Navbar({
  activeTab,
  onTabChange,
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onDeleteNotification,
  onClearAllNotifications,
  onShowNotificationToast,
  isLoggedIn,
  onLogout,
  user,
  onSetAdminSubTab,
  onOpenUserModal,
  onCloseUserModal,
  isUserModalOpen,
  allItems = [],
  onSelectItem,
  unreadMessagesCount = 0
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isDark, setIsDark] = useState(() => isDarkActive());

  const notifRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => isNotificationUnread(n)).length;

  // Track theme changes across window / tabs / modals with unified subscriber
  useEffect(() => {
    return subscribeToTheme((_mode, isDarkActiveNow) => {
      setIsDark(isDarkActiveNow);
    });
  }, []);

  const toggleTheme = () => {
    toggleThemeQuick();
  };

  // Click outside to close notifications and user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // keyboard interaction for dropdowns closing on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowUserDropdown(false);
        setShowMobileMenu(false);
        if (onCloseUserModal) onCloseUserModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCloseUserModal]);

  const handleNav = (tab: string) => {
    setShowNotifications(false);
    setShowUserDropdown(false);
    setShowMobileMenu(false);
    if (onCloseUserModal) onCloseUserModal();
    onTabChange(tab);
  };

  const getNavLinks = () => {
    if (!isLoggedIn) {
      return [
        { id: 'landing', label: 'Home', icon: Home },
        { id: 'listing', label: 'Browse Items', icon: Search },
      ];
    }

    const role = user?.role || 'student';
    if (role === 'admin') {
      return [
        { id: 'landing', label: 'Home', icon: Home },
        { id: 'listing', label: 'Browse Items', icon: Search },
        { id: 'post', label: 'Report Item', icon: PlusCircle },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
        { id: 'admin', label: 'Admin Dashboard', icon: Shield },
      ];
    }

    if (role === 'moderator') {
      return [
        { id: 'landing', label: 'Home', icon: Home },
        { id: 'listing', label: 'Browse Items', icon: Search },
        { id: 'post', label: 'Report Item', icon: PlusCircle },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
        { id: 'admin', label: 'Moderator Dashboard', icon: Shield },
      ];
    }

    return [
      { id: 'landing', label: 'Home', icon: Home },
      { id: 'listing', label: 'Browse Items', icon: Search },
      { id: 'post', label: 'Report Item', icon: PlusCircle },
      { id: 'chat', label: 'Messages', icon: MessageSquare },
      { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    ];
  };

  const initials = user?.fullName
    ? user.fullName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user?.role === 'admin'
    ? 'AD'
    : user?.role === 'moderator'
    ? 'MD'
    : 'JK';

  const navAvatar = user?.avatar || (user as any)?.profilePhoto || (user as any)?.profileImage || (user as any)?.profile_photo || (user as any)?.photoURL;
  const hasNavAvatar = Boolean(navAvatar && (navAvatar.startsWith('data:') || navAvatar.startsWith('http') || navAvatar.startsWith('/')));

  return (
    <nav 
      aria-label="Main Campus Navigation"
      className="sticky top-0 z-50 bg-brand-navy/95 backdrop-blur-md border-b border-brand-gold/20 px-4 md:px-8 h-[68px] flex items-center justify-between shadow-lg"
    >
      {/* Brand Logo & Title */}
      <div 
        className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none focus:outline-none focus:ring-2 focus:ring-brand-gold rounded-lg p-1 min-w-0" 
        onClick={() => handleNav('landing')}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNav('landing');
          }
        }}
        aria-label="Nazrul Retrievers Home Page"
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-brand-gold to-brand-gold-mid flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
          <Search aria-hidden="true" className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D1B2A]" />
        </div>
        <div className="flex flex-col leading-none min-w-0">
          <span className="font-serif text-[13px] min-[360px]:text-[15px] sm:text-base md:text-lg font-black text-white tracking-tight leading-none truncate">Nazrul Retrievers</span>
          <span className="font-sans text-[7.5px] min-[360px]:text-[8px] sm:text-[10px] font-semibold text-brand-gold-mid/80 uppercase tracking-widest mt-0.5 sm:mt-1 hidden min-[360px]:block truncate">Campus Lost &amp; Found</span>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <div className="hidden lg:flex items-center gap-1.5" role="menubar">
        {getNavLinks().map(link => {
          const LinkIcon = link.icon;
          const isActive = activeTab === link.id;
          const isChat = link.id === 'chat';
          const hasChatUnread = isChat && unreadMessagesCount > 0;

          return (
            <button 
              key={link.id}
              onClick={() => handleNav(link.id)}
              role="menuitem"
              aria-current={isActive ? 'page' : undefined}
              className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                isActive 
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 font-black transform scale-[1.02] border border-amber-300/40' 
                  : 'text-slate-200 hover:bg-white/10 hover:text-white hover:translate-y-[-1px]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <LinkIcon aria-hidden="true" className="w-4 h-4" />
              </div>
              <span>{link.label}</span>
              {hasChatUnread && (
                <span 
                  aria-label={`${unreadMessagesCount} unread messages`}
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full shadow-sm animate-pulse transition-transform ${
                    isActive 
                      ? 'bg-slate-950 text-amber-300 border border-slate-900' 
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action panel (right side) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

        {/* Quick Theme Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/20 flex items-center justify-center text-white/80 hover:border-amber-400 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all relative cursor-pointer bg-white/5 active:scale-95 shrink-0"
        >
          {isDark ? (
            <Sun className="w-[15px] h-[15px] sm:w-[17px] sm:h-[17px] text-amber-300 animate-in spin-in-180 duration-300" />
          ) : (
            <Moon className="w-[15px] h-[15px] sm:w-[17px] sm:h-[17px] text-slate-200 animate-in spin-in-180 duration-300" />
          )}
        </button>

        {/* Notification Bell */}
        {isLoggedIn && (
          <div ref={notifRef} className="relative shrink-0">
            <button 
              onClick={() => {
                const nextShow = !showNotifications;
                setShowNotifications(nextShow);
                setShowUserDropdown(false);
                if (onCloseUserModal) onCloseUserModal();
                if (nextShow && unreadCount > 0) {
                  onMarkAllNotificationsRead();
                }
              }}
              aria-haspopup="true"
              aria-expanded={showNotifications}
              aria-controls="notifications-dropdown-menu"
              aria-label={`Notifications, ${unreadCount} unread items`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/20 flex items-center justify-center text-white/80 hover:border-amber-400 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all relative cursor-pointer bg-white/5"
              title="Notifications"
            >
              <Bell aria-hidden="true" className="w-[15px] h-[15px] sm:w-[17px] sm:h-[17px]" />
              {unreadCount > 0 && (
                <div aria-hidden="true" className="absolute top-[4px] right-[4px] sm:top-[6px] sm:right-[6px] w-[7px] h-[7px] sm:w-[8px] sm:h-[8px] bg-rose-500 rounded-full ring-2 ring-[#0D1B2A]" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div 
                id="notifications-dropdown-menu"
                role="region"
                aria-label="Campus Notifications Panel"
                className="fixed sm:absolute top-[68px] sm:top-auto sm:mt-3 left-3 sm:left-auto right-3 sm:right-0 w-[calc(100vw-24px)] sm:w-[410px] max-w-[410px] bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/90 dark:bg-[#162232] rounded-t-[20px] gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-serif text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-wide flex items-center gap-1.5 truncate">
                      <Bell aria-hidden="true" className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" /> Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => {
                            onMarkAllNotificationsRead();
                          }}
                          aria-label="Mark all notifications as read"
                          className="text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                        >
                          Mark read
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          onClearAllNotifications?.();
                        }}
                        aria-label="Clear all notifications"
                        className="text-[10.5px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                        title="Clear all alerts"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear all</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="max-h-[380px] overflow-y-auto p-2.5 space-y-2 bg-white dark:bg-[#111A2E] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#162232] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                        <Bell aria-hidden="true" className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">No Notifications Yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">You're all caught up with alerts.</p>
                      </div>
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const formatted = formatNotificationContent(notif);
                      const { icon: NotifIcon, colorClass } = getNotificationIconAndColor(notif);
                      return (
                        <div 
                          key={notif.id} 
                          role="button"
                          tabIndex={0}
                          aria-label={`Notification: ${formatted.plainText}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleNotificationClick({
                                notif,
                                items: allItems,
                                onSelectItem,
                                onTabChange: handleNav,
                                onOpenUserModal,
                                onSetAdminSubTab,
                                onCloseModal: () => setShowNotifications(false),
                                onShowToast: onShowNotificationToast,
                                onMarkRead: (id) => onMarkNotificationRead?.(id)
                              });
                            }
                          }}
                          className={`group p-3 rounded-[14px] flex items-start justify-between gap-2.5 transition-all duration-200 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                            formatted.isUnread 
                              ? 'border-amber-300 dark:border-amber-700/80 border-l-4 border-l-amber-500 bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 shadow-2xs' 
                              : 'border-slate-200 dark:border-slate-700/80 border-l-4 border-l-slate-300 dark:border-l-slate-600 bg-slate-50/80 dark:bg-[#162232] hover:bg-slate-100 dark:hover:bg-[#1c2b3e]'
                          }`}
                          onClick={() => {
                            handleNotificationClick({
                              notif,
                              items: allItems,
                              onSelectItem,
                              onTabChange: handleNav,
                              onOpenUserModal,
                              onSetAdminSubTab,
                              onCloseModal: () => setShowNotifications(false),
                              onShowToast: onShowNotificationToast,
                              onMarkRead: (id) => onMarkNotificationRead?.(id)
                            });
                          }}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Icon wrapper */}
                            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs ${colorClass}`}>
                              <NotifIcon aria-hidden="true" className="w-3.5 h-3.5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <p 
                                  className={`text-xs leading-relaxed break-words ${
                                    formatted.isUnread 
                                      ? 'text-slate-950 dark:text-white font-bold [&_strong]:text-amber-900 dark:[&_strong]:text-amber-300 [&_strong]:font-black' 
                                      : 'text-slate-800 dark:text-slate-200 font-medium [&_strong]:text-slate-950 dark:[&_strong]:text-white [&_strong]:font-bold'
                                  }`} 
                                  dangerouslySetInnerHTML={{ __html: formatted.html }} 
                                />
                                {formatted.isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1 shadow-[0_0_8px_rgba(245,158,11,0.6)]" aria-label="Unread notification marker" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{formatted.time}</span>
                                {formatted.category && (
                                  <span className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                                    {formatted.category}
                                  </span>
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer shrink-0 mt-0.5"
                            title="Delete notification"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Account Menu with Modern Dropdown */}
        {isLoggedIn ? (
          <div ref={userDropdownRef} className="relative shrink-0">
            <button 
              onClick={() => {
                const nextShow = !showUserDropdown;
                setShowUserDropdown(nextShow);
                setShowNotifications(false);
                if (isUserModalOpen && onCloseUserModal) {
                  onCloseUserModal();
                }
              }}
              aria-haspopup="true"
              aria-expanded={showUserDropdown}
              aria-controls="user-dropdown-menu"
              aria-label="User account navigation menu"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-black text-xs flex items-center justify-center border border-brand-gold hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-gold transition-all duration-200 cursor-pointer shadow-md select-none overflow-hidden"
              title="User menu"
            >
              {hasNavAvatar ? (
                <img src={navAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div 
                id="user-dropdown-menu"
                role="menu"
                aria-label="User Account Options Menu"
                className="absolute right-0 mt-3 w-[min(calc(100vw-24px),20rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              >
                {/* PROFILE HEADER */}
                <div className="flex items-start gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80">
                  {/* AVATAR */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-md border-2 border-amber-300 select-none overflow-hidden">
                      {hasNavAvatar ? (
                        <img src={navAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        initials
                      )}
                    </div>
                    {/* Active indicators */}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" aria-label="User is online"></span>
                  </div>

                  {/* USER INFO & BADGE */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-slate-950 dark:text-white truncate tracking-tight flex items-center gap-1.5">
                      {user?.fullName || (user?.role === 'admin' ? 'System Administrator' : user?.role === 'moderator' ? 'Staff Moderator' : 'Student Member')}
                      {((user as any)?.idVerificationStatus === 'verified' || !!user?.verified || user?.role === 'admin' || user?.role === 'moderator') && (
                        <CheckCircle2 
                          className={`w-4 h-4 shrink-0 ${
                            user?.role === 'admin' 
                              ? 'text-rose-600 fill-rose-100 dark:fill-rose-950' 
                              : user?.role === 'moderator' 
                                ? 'text-amber-600 fill-amber-100 dark:fill-amber-950' 
                                : 'text-emerald-600 fill-emerald-100 dark:fill-emerald-950'
                          }`} 
                          title={
                            user?.role === 'admin' 
                              ? 'System Administrator (Authorized Official)' 
                              : user?.role === 'moderator' 
                                ? 'Staff Moderator (Authorized Official)' 
                                : 'Verified JKKNIU Student'
                          } 
                        />
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate mt-0.5 font-semibold">{user?.email || 'student@jkkniu.edu'}</p>
                    
                    <div className="mt-2 flex">
                      {user?.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-wider uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                          <Shield aria-hidden="true" className="w-2.5 h-2.5" />
                          ADMINISTRATOR
                        </span>
                      ) : user?.role === 'moderator' ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-wider uppercase text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                          <Shield aria-hidden="true" className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                          MODERATOR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-wider uppercase text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                          <GraduationCap aria-hidden="true" className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                          STUDENT
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* MENU ITEMS */}
                <div className="p-2 flex flex-col gap-1 max-h-[400px] overflow-y-auto">
                  {user?.role === 'admin' || user?.role === 'moderator' ? (
                    <>
                      {/* Personal Staff Profile & Settings */}
                      <div className="px-3 py-1.5 text-[10px] font-black tracking-wider uppercase text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-slate-800/60 rounded-md border border-amber-200/60 dark:border-slate-700/60">
                        Institutional Account
                      </div>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          if (onOpenUserModal) onOpenUserModal('profile');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-3.5 w-full text-left px-3.5 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <User aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">My Profile &amp; Information</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Edit credentials, photo &amp; official contacts</p>
                        </div>
                      </button>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          if (onOpenUserModal) onOpenUserModal('settings');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-3.5 w-full text-left px-3.5 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-all duration-200 flex-shrink-0">
                          <Settings aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-slate-950 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">Account Security &amp; Settings</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Password, notifications &amp; preferences</p>
                        </div>
                      </button>

                      {/* Administration Section */}
                      <div className="mt-2 px-3 py-1.5 text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/40 rounded-md">
                        Administration Controls
                      </div>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          handleNav('admin');
                          if (onSetAdminSubTab) onSetAdminSubTab('Overview');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-3.5 w-full text-left px-3.5 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 text-amber-600 dark:bg-slate-800 dark:text-amber-400 group-hover:text-amber-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <LayoutDashboard aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">Dashboard</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Analytics, listings and statistics</p>
                        </div>
                      </button>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          handleNav('admin');
                          if (onSetAdminSubTab) onSetAdminSubTab('Users');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-3.5 w-full text-left px-3.5 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 text-amber-600 dark:bg-slate-800 dark:text-amber-400 group-hover:text-amber-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <Users aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">Manage Users</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Manage campus accounts</p>
                        </div>
                      </button>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          handleNav('admin');
                          if (onSetAdminSubTab) onSetAdminSubTab('Pending');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-3.5 w-full text-left px-3.5 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 text-amber-600 dark:bg-slate-800 dark:text-amber-400 group-hover:text-amber-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <ListCheck aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">Item Management</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Review submitted items</p>
                        </div>
                      </button>
                      {user?.role === 'admin' && (
                        <>
                          <button 
                            role="menuitem"
                            onClick={() => {
                              handleNav('admin');
                              if (onSetAdminSubTab) onSetAdminSubTab('AdminPanel');
                              setShowUserDropdown(false);
                            }}
                            className="flex items-center gap-3.5 w-full text-left px-3.5 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 text-amber-600 dark:bg-slate-800 dark:text-amber-400 group-hover:text-amber-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                              <Settings aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                            </div>
                            <div className="min-w-0 flex-1 leading-normal">
                              <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">System Settings</p>
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Platform configuration</p>
                            </div>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          if (onOpenUserModal) onOpenUserModal('profile');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-4 w-full text-left px-4 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <User aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">My Profile</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Manage your personal information</p>
                        </div>
                      </button>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          if (onOpenUserModal) onOpenUserModal('reports');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-4 w-full text-left px-4 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <FileText aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">My Reports</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">View your Lost &amp; Found reports</p>
                        </div>
                      </button>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          if (onOpenUserModal) onOpenUserModal('saved');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-4 w-full text-left px-4 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <Heart aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">Saved Items</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Your bookmarked listings</p>
                        </div>
                      </button>
                      <button 
                        role="menuitem"
                        onClick={() => {
                          if (onOpenUserModal) onOpenUserModal('settings');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-4 w-full text-left px-4 py-2.5 rounded-[12px] text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-amber-50/80 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-all duration-200 flex-shrink-0">
                          <Settings aria-hidden="true" className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                        </div>
                        <div className="min-w-0 flex-1 leading-normal">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200 text-[12px]">Settings</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-200 mt-0.5">Manage preferences</p>
                        </div>
                      </button>
                    </>
                  )}
                </div>

                {/* LOGOUT BUTTON SECTION */}
                <div className="p-2 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    role="menuitem"
                    onClick={() => {
                      if (onOpenUserModal) {
                        onOpenUserModal('logout');
                      } else {
                        onLogout();
                      }
                      setShowUserDropdown(false);
                    }}
                    className="flex items-center gap-4 w-full text-left px-4 py-2.5 rounded-[12px] text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 group-hover:text-rose-700 dark:group-hover:text-rose-200 group-hover:bg-rose-200 dark:group-hover:bg-rose-800 transition-all duration-200 flex-shrink-0">
                      <LogOut aria-hidden="true" className="w-4 h-4 transition-transform group-hover:translate-x-0.5 duration-200" />
                    </div>
                    <div className="min-w-0 flex-1 leading-normal">
                      <p className="font-bold text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors duration-200 text-[12px]">Logout</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors duration-200 mt-0.5">Securely exit JKKNIU portal</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => handleNav('login')}
              className="px-3.5 py-1.5 border border-white/20 hover:border-amber-400/60 hover:text-amber-300 rounded-xl text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <LogIn aria-hidden="true" className="w-4 h-4" />
              Sign In
            </button>
            <button 
              onClick={() => handleNav('register')}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <UserPlus aria-hidden="true" className="w-4 h-4 stroke-[2.5]" />
              Sign Up
            </button>
          </div>
        )}

        {/* Mobile menu hamburger */}
        <button 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label={showMobileMenu ? "Close menu" : "Open menu"}
        >
          {showMobileMenu ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {showMobileMenu && (
        <div className="absolute top-[68px] left-0 right-0 bg-[#0D1B2A] border-b border-amber-500/20 py-5 px-4 sm:px-6 flex flex-col gap-2.5 z-40 shadow-2xl lg:hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-68px)] overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-black text-amber-400/90 uppercase tracking-widest px-2 pb-1.5 border-b border-white/5 flex items-center justify-between">
            <span>Campus Navigation</span>
            <span className="text-[9px] text-slate-400 font-medium">JKKNIU Portal</span>
          </div>
          
          {getNavLinks().map(link => {
            const LinkIcon = link.icon;
            const isActive = activeTab === link.id;
            const isChat = link.id === 'chat';
            const hasChatUnread = isChat && unreadMessagesCount > 0;

            return (
              <button 
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`flex items-center justify-between w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 font-extrabold shadow-xs' 
                    : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LinkIcon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </div>
                {hasChatUnread && (
                  <span 
                    aria-label={`${unreadMessagesCount} unread messages`}
                    className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] font-black rounded-full bg-rose-500 text-white shadow-xs animate-pulse"
                  >
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </button>
            );
          })}

          {!isLoggedIn && (
            <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-white/10">
              <button 
                onClick={() => handleNav('login')}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 text-slate-200 hover:text-white border border-white/20 hover:border-amber-400/50 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 cursor-pointer transition-all shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button 
                onClick={() => handleNav('register')}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/25 cursor-pointer transition-all border border-amber-300/30 active:scale-[0.99]"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                Sign Up
              </button>
            </div>
          )}

          {isLoggedIn && (
            <div className="mt-3 pt-3 border-t border-white/15 flex flex-col gap-2">
              {/* Mobile User Identity Capsule */}
              <div 
                onClick={() => { if (onOpenUserModal) onOpenUserModal('profile'); setShowMobileMenu(false); }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/40 cursor-pointer transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-black text-xs flex items-center justify-center border border-brand-gold shrink-0 overflow-hidden shadow-xs">
                  {hasNavAvatar ? (
                    <img src={navAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white truncate">{user?.fullName || 'Active User'}</p>
                  <p className="text-[10px] text-slate-300 font-semibold truncate">{user?.email || ''}</p>
                </div>
              </div>

              <button 
                onClick={() => { if (onOpenUserModal) onOpenUserModal('profile'); setShowMobileMenu(false); }}
                className="w-full py-2.5 px-3 flex items-center justify-start gap-3 text-slate-100 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <User className="w-4 h-4 text-brand-gold shrink-0" />
                My Profile Settings
              </button>
              <button 
                onClick={() => { if (onOpenUserModal) onOpenUserModal('reports'); setShowMobileMenu(false); }}
                className="w-full py-2.5 px-3 flex items-center justify-start gap-3 text-slate-100 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <FileText className="w-4 h-4 text-brand-gold shrink-0" />
                My Reports &amp; Matches
              </button>
              <button 
                onClick={() => { if (onOpenUserModal) onOpenUserModal('saved'); setShowMobileMenu(false); }}
                className="w-full py-2.5 px-3 flex items-center justify-start gap-3 text-slate-100 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <Heart className="w-4 h-4 text-brand-gold shrink-0" />
                Saved Items
              </button>
              <button 
                onClick={() => { if (onOpenUserModal) onOpenUserModal('settings'); setShowMobileMenu(false); }}
                className="w-full py-2.5 px-3 flex items-center justify-start gap-3 text-slate-100 hover:bg-white/10 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <Settings className="w-4 h-4 text-brand-gold shrink-0" />
                Account Preferences
              </button>
              <button 
                onClick={() => { 
                  if (onOpenUserModal) {
                    onOpenUserModal('logout');
                  } else {
                    onLogout();
                  }
                  setShowMobileMenu(false); 
                }}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 bg-red-600/10 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 hover:bg-red-600/20 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout Account
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
