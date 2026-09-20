import { Item, NotificationItem } from '../types';
import { 
  MessageSquare, 
  Check, 
  ListCheck, 
  Heart, 
  Sparkles, 
  Bell, 
  XCircle, 
  ShieldCheck, 
  Tag, 
  Award, 
  AlertTriangle,
  LucideIcon 
} from 'lucide-react';

export interface NotificationNavOptions {
  notif: NotificationItem | any;
  items?: Item[];
  onSelectItem?: (item: Item) => void;
  onTabChange?: (tab: string) => void;
  onOpenUserModal?: (tab: 'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout') => void;
  onSetAdminSubTab?: (subTab: string) => void;
  onCloseModal?: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onMarkRead?: (notifId: string) => void;
}

export interface NotificationIconInfo {
  icon: LucideIcon;
  colorClass: string;
}

export interface FormattedNotification {
  html: string;
  plainText: string;
  time: string;
  isUnread: boolean;
  category?: string;
}

/**
 * Strips any redundant or repetitive "Notification:" or "<strong>Notification</strong>:" prefixes from string
 */
export function cleanNotificationHtml(raw?: string | null): string {
  if (!raw) return '';
  let str = String(raw).trim();
  let prev = '';
  while (prev !== str) {
    prev = str;
    str = str
      .replace(/^(?:(?:<strong[^>]*>)?\s*notification:?\s*(?:<\/strong>)?\s*:?\s*)+/i, '')
      .replace(/^(?:(?:<strong[^>]*>)?\s*alert:?\s*(?:<\/strong>)?\s*:?\s*)+/i, '')
      .trim();
    if (prev === str) break;
  }
  return str;
}

/**
 * Normalizes and formats notification timestamp into clean, human-readable text
 */
export function formatNotificationTime(rawTime?: string | Date | null): string {
  if (!rawTime) return 'Just now';
  const str = String(rawTime).trim();
  if (!str || str === 'undefined' || str === 'null') return 'Just now';
  
  // If already relative (e.g. "Just now", "2m ago", "Today at 10:30 AM")
  if (/^(just now|\d+\s*(m|h|d|s|min|hr|day)s?\s*ago|today|yesterday)/i.test(str)) {
    return str;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
      
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      if (diffSecs < 86400 * 2) {
        return `Yesterday, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  } catch {}

  return str;
}

/**
 * Evaluates whether a notification is unread across all field conventions
 */
export function isNotificationUnread(notif?: Partial<NotificationItem> | any): boolean {
  if (!notif) return false;
  if (notif.unread === false || notif.is_read === true || notif.isRead === true || notif.read === true) {
    return false;
  }
  if (notif.unread === true || notif.is_read === false || notif.isRead === false || notif.read === false) {
    return true;
  }
  return notif.unread !== false;
}

/**
 * Converts any notification format into clean HTML and plain text with guaranteed legibility
 */
export function formatNotificationContent(notif?: Partial<NotificationItem> | any): FormattedNotification {
  if (!notif) {
    return {
      html: 'Campus alert update',
      plainText: 'Campus alert update',
      time: 'Just now',
      isUnread: false
    };
  }

  const isUnread = isNotificationUnread(notif);
  const time = formatNotificationTime(notif.time || notif.createdAt || notif.created_at || notif.timestamp);

  const cleanTitle = (notif.title || '').trim().replace(/^notification:?/i, '').trim();
  const cleanMsg = cleanNotificationHtml(notif.message || '');
  const cleanTxt = cleanNotificationHtml(notif.text || '');

  let rawHtml = '';
  if (cleanTxt.length > 0) {
    rawHtml = cleanTxt;
  } else if (cleanTitle.length > 0 && cleanTitle.toLowerCase() !== 'notification' && cleanMsg.length > 0) {
    rawHtml = `<strong>${cleanTitle}</strong>: ${cleanMsg}`;
  } else if (cleanMsg.length > 0) {
    rawHtml = cleanMsg;
  } else if (cleanTitle.length > 0 && cleanTitle.toLowerCase() !== 'notification') {
    rawHtml = `<strong>${cleanTitle}</strong>`;
  } else {
    rawHtml = 'Campus alert notification update';
  }

  rawHtml = cleanNotificationHtml(rawHtml);

  // Generate plain text without HTML tags for accessibility, toasts, and aria labels
  const plainText = cleanNotificationHtml(
    rawHtml
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
  );

  return {
    html: rawHtml,
    plainText: plainText || 'Campus alert notification update',
    time,
    isUnread,
    category: notif.category || notif.type
  };
}

export function getNotificationIconAndColor(textOrNotif: string | any): NotificationIconInfo {
  let text = '';
  if (typeof textOrNotif === 'string') {
    text = textOrNotif;
  } else if (textOrNotif) {
    text = `${textOrNotif.text || ''} ${textOrNotif.title || ''} ${textOrNotif.message || ''} ${textOrNotif.category || ''} ${textOrNotif.type || ''}`;
  }

  const lowercaseText = (text || '').toLowerCase();
  
  if (lowercaseText.includes('messaged') || lowercaseText.includes('chat') || lowercaseText.includes('message') || lowercaseText.includes('inbox') || lowercaseText.includes('conversation')) {
    return {
      icon: MessageSquare,
      colorClass: 'text-sky-700 bg-sky-100 border border-sky-300 dark:text-sky-300 dark:bg-sky-950/60 dark:border-sky-700/60'
    };
  }
  if (lowercaseText.includes('approved') || lowercaseText.includes('verified') || lowercaseText.includes('accepted') || lowercaseText.includes('success')) {
    return {
      icon: Check,
      colorClass: 'text-emerald-700 bg-emerald-100 border border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700/60'
    };
  }
  if (lowercaseText.includes('rejected') || lowercaseText.includes('deleted') || lowercaseText.includes('denied') || lowercaseText.includes('removed')) {
    return {
      icon: XCircle,
      colorClass: 'text-rose-700 bg-rose-100 border border-rose-300 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-700/60'
    };
  }
  if (lowercaseText.includes('claim')) {
    return {
      icon: ListCheck,
      colorClass: 'text-amber-800 bg-amber-100 border border-amber-300 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-700/60'
    };
  }
  if (lowercaseText.includes('returned') || lowercaseText.includes('thank') || lowercaseText.includes('happy') || lowercaseText.includes('reunited')) {
    return {
      icon: Heart,
      colorClass: 'text-rose-700 bg-rose-100 border border-rose-300 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-700/60'
    };
  }
  if (lowercaseText.includes('match') || lowercaseText.includes('found')) {
    return {
      icon: Sparkles,
      colorClass: 'text-amber-800 bg-amber-100 border border-amber-300 dark:text-amber-200 dark:bg-amber-950/60 dark:border-amber-700/60'
    };
  }
  if (lowercaseText.includes('reward') || lowercaseText.includes('bounty') || lowercaseText.includes('prize')) {
    return {
      icon: Award,
      colorClass: 'text-yellow-800 bg-yellow-100 border border-yellow-300 dark:text-yellow-300 dark:bg-yellow-950/60 dark:border-yellow-700/60'
    };
  }
  if (lowercaseText.includes('security') || lowercaseText.includes('warning') || lowercaseText.includes('urgent') || lowercaseText.includes('alert')) {
    return {
      icon: AlertTriangle,
      colorClass: 'text-orange-700 bg-orange-100 border border-orange-300 dark:text-orange-300 dark:bg-orange-950/60 dark:border-orange-700/60'
    };
  }
  if (lowercaseText.includes('admin') || lowercaseText.includes('system') || lowercaseText.includes('moderation') || lowercaseText.includes('coordinator')) {
    return {
      icon: ShieldCheck,
      colorClass: 'text-purple-700 bg-purple-100 border border-purple-300 dark:text-purple-300 dark:bg-purple-950/60 dark:border-purple-700/60'
    };
  }
  if (lowercaseText.includes('listing') || lowercaseText.includes('item') || lowercaseText.includes('post')) {
    return {
      icon: Tag,
      colorClass: 'text-blue-700 bg-blue-100 border border-blue-300 dark:text-blue-300 dark:bg-blue-950/60 dark:border-blue-700/60'
    };
  }
  return {
    icon: Bell,
    colorClass: 'text-amber-800 bg-amber-100 border border-amber-300 dark:text-amber-200 dark:bg-amber-950/60 dark:border-amber-700/60'
  };
}

export function handleNotificationClick({
  notif,
  items = [],
  onSelectItem,
  onTabChange,
  onOpenUserModal,
  onSetAdminSubTab,
  onCloseModal,
  onShowToast,
  onMarkRead
}: NotificationNavOptions) {
  if (!notif) return;

  // Mark notification as read immediately
  if (onMarkRead && notif.id) {
    onMarkRead(String(notif.id));
  }

  const rawText = notif.text || notif.message || notif.title || '';
  const textLower = rawText.toLowerCase();
  const isAdminNotif = String(notif.id).startsWith('admin-') || notif.category === 'Admin';

  // Close modal or dropdown if callback provided
  if (onCloseModal) {
    onCloseModal();
  }

  // 1. Check if notification quotes a specific item title, e.g. "BMW Umbrella" or "Samsung S24"
  const titleMatch = rawText.match(/["“']([^"”']+)["”']/);
  const extractedTitle = titleMatch ? titleMatch[1].trim() : '';

  let foundItem: Item | undefined;
  if (notif.relatedItemId || notif.itemId) {
    const targetId = String(notif.relatedItemId || notif.itemId);
    foundItem = items.find(i => String(i.id) === targetId);
  }

  if (!foundItem && extractedTitle && items.length > 0) {
    foundItem = items.find(i => i.title.toLowerCase().trim() === extractedTitle.toLowerCase()) ||
                items.find(i => i.title.toLowerCase().includes(extractedTitle.toLowerCase()));
  }

  // If matching item was found and onSelectItem is provided, open item detail view directly!
  if (foundItem && onSelectItem) {
    onSelectItem(foundItem);
    if (onShowToast) {
      onShowToast(`Opened details for "${foundItem.title}"`, 'info');
    }
    return;
  }

  // 2. Admin notifications
  if (isAdminNotif) {
    if (onTabChange) onTabChange('admin');
    if (textLower.includes('claim')) {
      if (onSetAdminSubTab) onSetAdminSubTab('Claims');
    } else if (textLower.includes('verification') || textLower.includes('id')) {
      if (onSetAdminSubTab) onSetAdminSubTab('Verifications');
    } else if (textLower.includes('report')) {
      if (onSetAdminSubTab) onSetAdminSubTab('Reports');
    } else if (textLower.includes('message') || textLower.includes('chat')) {
      if (onSetAdminSubTab) onSetAdminSubTab('ChatsModeration');
    } else {
      if (onSetAdminSubTab) onSetAdminSubTab('AdminNotifications');
    }
    return;
  }

  // 3. Chat / Message notifications
  if (textLower.includes('messaged') || textLower.includes('message') || textLower.includes('chat') || textLower.includes('inbox') || textLower.includes('conversation')) {
    if (onTabChange) {
      onTabChange('chat');
      if (onShowToast) onShowToast('Navigated to Chat messages', 'info');
    }
    return;
  }

  // 4. Verification / Profile notifications
  if (textLower.includes('verification') || textLower.includes('student id') || textLower.includes('verified') || textLower.includes('profile')) {
    if (onOpenUserModal) {
      onOpenUserModal('profile');
      if (onShowToast) onShowToast('Opened Profile & Verification', 'info');
    }
    return;
  }

  // 5. Listing / Report / Approval / Rejection notifications
  if (textLower.includes('listing') || textLower.includes('approved') || textLower.includes('rejected') || textLower.includes('submitted')) {
    if (onOpenUserModal) {
      onOpenUserModal('reports');
      if (onShowToast) onShowToast('Opened My Reports', 'info');
    } else if (onTabChange) {
      onTabChange('browse');
    }
    return;
  }

  // 6. Saved items
  if (textLower.includes('saved') || textLower.includes('bookmark')) {
    if (onOpenUserModal) {
      onOpenUserModal('saved');
    }
    return;
  }

  // 7. Fallback: navigate to Notifications or Browse
  if (onOpenUserModal) {
    onOpenUserModal('notifications');
  } else if (onTabChange) {
    onTabChange('browse');
  }
}
