import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import SignInPage from './components/SignInPage';
import RegisterPage from './components/SignUpPage';
import DashboardPage from './components/DashboardPage';
import PostItemPage from './components/PostItemPage';
import BrowseItemsPage from './components/BrowseItemsPage';
import ItemDetailPage from './components/ItemDetailPage';
import ChatPage from './components/ChatPage';
import AdminPage from './components/AdminPage';
import DatabasePage from './components/DatabasePage';
import StructurePage from './components/StructurePage';
import SecurityPage from './components/SecurityPage';
import ConfirmationModal from './components/ConfirmationModal';
import PrintFlyerModal from './components/PrintFlyerModal';
import { AnimatePresence } from 'motion/react';
import LoginRequiredModal from './components/LoginRequiredModal';
import UserProfileMenuModals from './components/UserProfileMenuModals';

import { 
  INITIAL_ITEMS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_THREADS 
} from './data';
import { Item, NotificationItem, ChatThread, User } from './types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { apiFetch, getAuthToken, setAuthToken } from './utils/api';

interface Toast {
  id: string;
  msg: string;
  type: 'success' | 'error' | 'info' | 'default';
  actionLabel?: string;
  onAction?: () => void;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [adminSubTab, setAdminSubTab] = useState('Overview');

  // Multi-level navigation history stack
  const [navHistory, setNavHistory] = useState<Array<{
    tab: string;
    adminSubTab?: string;
    userModalTab?: 'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout' | null;
    selectedItem?: Item;
    backLabel?: string;
  }>>([]);

  // User-scoped saved items storage helpers
  const getSavedItemsStorageKey = (currentUser: any) => {
    if (!currentUser) return 'saved_item_ids_guest';
    if (currentUser.id) return `saved_item_ids_user_${currentUser.id}`;
    if (currentUser.email) return `saved_item_ids_user_${currentUser.email.toLowerCase().trim()}`;
    return 'saved_item_ids_guest';
  };

  const loadUserSavedItems = (currentUser: any): string[] => {
    try {
      const key = getSavedItemsStorageKey(currentUser);
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
      // Legacy fallback check for currently logged in user
      if (currentUser) {
        const legacy = localStorage.getItem('saved_item_ids');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem(key, JSON.stringify(parsed));
            return parsed;
          }
        }
      }
    } catch {
      // Fallback on parse error
    }
    return [];
  };

  // Saved items & User profile modal states
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [activeUserModalTab, setActiveUserModalTab] = useState<'profile' | 'reports' | 'saved' | 'settings' | 'notifications' | 'logout' | null>(null);

  // Synchronize saved bookmarks when user authentication state changes
  useEffect(() => {
    if (isLoggedIn && user) {
      setSavedItemIds(loadUserSavedItems(user));
    } else {
      setSavedItemIds([]);
    }
  }, [isLoggedIn, user?.id, user?.email]);

  // Persist bookmarks whenever savedItemIds updates for the current active user
  useEffect(() => {
    if (isLoggedIn && user) {
      const key = getSavedItemsStorageKey(user);
      try {
        localStorage.setItem(key, JSON.stringify(savedItemIds));
      } catch {}
    }
  }, [savedItemIds, isLoggedIn, user]);

  const handleToggleSaveItem = (itemId: string, itemTitle?: string) => {
    if (!isLoggedIn) {
      setShowLoginRequiredModal(true);
      handleShowToast('Please log in to save bookmarks to your account.', 'error');
      return;
    }

    const targetId = String(itemId);
    const isCurrentlySaved = savedItemIds.includes(targetId);

    setSavedItemIds(prev => {
      const exists = prev.includes(targetId);
      if (exists) {
        return prev.filter(id => id !== targetId);
      } else {
        return [...prev, targetId];
      }
    });

    const itemObj = items.find(i => String(i.id) === targetId);
    const resolvedTitle = itemTitle || itemObj?.title || 'Item';
    const displayTitle = resolvedTitle.length > 28 ? `${resolvedTitle.substring(0, 26)}...` : resolvedTitle;

    if (isCurrentlySaved) {
      handleShowToast(`<strong>${displayTitle}</strong> removed from saved bookmarks.`, 'info');
    } else {
      handleShowToast(
        `<strong>${displayTitle}</strong> saved to bookmarks!`, 
        'success', 
        'View Saved', 
        () => setActiveUserModalTab('saved')
      );
    }
  };
  
  // Guard-related states
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [intendedAction, setIntendedAction] = useState<{ type: 'tab' | 'contact' | 'request_call' | 'save_item' | 'print' | 'report_item' | 'claim'; tab?: string; item?: Item } | null>(null);
  
  const isFirstFetchRef = useRef(true);
  const shownToastsRef = useRef<Set<string>>(new Set());
  const deepLinkHandledRef = useRef(false);
  
  // App-wide state
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [chatDraftText, setChatDraftText] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item>(INITIAL_ITEMS[0]);
  const [postTypePreference, setPostTypePreference] = useState<'lost' | 'found'>('lost');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [submittedItem, setSubmittedItem] = useState<Item | null>(null);
  const [activePrintFlyerItem, setActivePrintFlyerItem] = useState<Item | null>(null);

  // Sync state with the live Node/Express full-stack backend
  const fetchFullStackData = async (currentUser = user) => {
    try {
      const isAdminOrMod = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
      const itemsUrl = isAdminOrMod ? '/items/admin/items' : '/items';
      const itemsRes = await apiFetch(itemsUrl);
      if (itemsRes && itemsRes.items) {
        setItems(itemsRes.items);
        setSelectedItem(current => {
          if (!current) return itemsRes.items[0] || null;
          const fresh = itemsRes.items.find((i: any) => String(i.id) === String(current.id));
          return fresh || current;
        });
      }
    } catch (err) {
      console.warn('Could not connect to live REST API. Falling back to robust mock states inside AI Studio container.');
    }

    const token = getAuthToken();
    if (token) {
      // Refresh current user profile to keep verification and role changes in sync
      if (token !== 'dummy_token_12345') {
        try {
          const profileRes = await apiFetch('/auth/me');
          if (profileRes && profileRes.user) {
            setUser(prev => {
              if (!prev || JSON.stringify(prev) !== JSON.stringify(profileRes.user)) {
                try {
                  localStorage.setItem('jkkniu_user', JSON.stringify(profileRes.user));
                } catch {}
                return profileRes.user;
              }
              return prev;
            });
          }
        } catch (err) {
          // Suppress background profile refresh error
        }
      }

      try {
        const notifsRes = await apiFetch('/notifications');
        if (notifsRes && notifsRes.notifications) {
          const isAdminOrMod = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
          let merged = [...notifsRes.notifications];
          if (isAdminOrMod) {
            try {
              const adminNotifsRes = await apiFetch('/admin/notifications?category=All');
              if (adminNotifsRes && adminNotifsRes.notifications) {
                const mappedAdminNotifs = adminNotifsRes.notifications.map((an: any) => ({
                  id: `admin-${an.id}`,
                  text: `<strong>[${an.category || 'System'}] ${an.title}</strong>: ${an.message}`,
                  title: an.title,
                  message: an.message,
                  category: an.category || 'System',
                  time: an.createdAt ? new Date(an.createdAt).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true}) : 'Just now',
                  createdAt: an.createdAt,
                  unread: an.isRead !== true && an.isRead !== 1,
                  userId: currentUser?.id,
                  relatedItemId: an.relatedItemId,
                  relatedUserId: an.relatedUserId
                }));
                merged = [...mappedAdminNotifs, ...merged];
              }
            } catch (adminErr) {
              console.warn('Failed to fetch admin notifications in background:', adminErr);
            }
          }

          setNotifications(prev => {
            const prevIds = new Set(prev.map(n => String(n.id)));
            const newNotifs = merged.filter((n: any) => !prevIds.has(String(n.id)));
            
            if (isFirstFetchRef.current) {
              merged.forEach((n: any) => {
                shownToastsRef.current.add(String(n.id));
              });
              isFirstFetchRef.current = false;
            } else {
              newNotifs.forEach((n: any) => {
                const idStr = String(n.id);
                if (n.unread && !shownToastsRef.current.has(idStr)) {
                  shownToastsRef.current.add(idStr);
                  // Strip HTML tags for clean toast rendering
                  const cleanText = String(n.text || n.message || n.title || '').replace(/<[^>]*>/g, '');
                  handleShowToast(`🔔 ${cleanText}`, 'info');
                }
              });
            }

            return merged;
          });
        }
      } catch (e) {
        // Suppress background errors
      }

      try {
        const threadsRes = await apiFetch('/chats');
        if (threadsRes && Array.isArray(threadsRes.threads)) {
          setThreads(prev => {
            const serverThreads = threadsRes.threads;
            const serverIds = new Set(serverThreads.map((t: any) => String(t.id)));
            // Retain any active draft or locally initiated thread not yet in server response
            const pendingDrafts = prev.filter(t => 
              !serverIds.has(String(t.id)) && 
              (String(t.id) === String(selectedThreadId) || (t.messages && t.messages.length === 0))
            );
            return [...pendingDrafts, ...serverThreads];
          });
        }
      } catch (e) {
        // Suppress background errors
      }
    }
  };

  useEffect(() => {
    const checkUserSession = async () => {
      // 1. Instantly restore from localStorage cache for immediate UI rendering without flickering
      try {
        const storedUser = localStorage.getItem('jkkniu_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed && (parsed.id || parsed.email)) {
            setUser(parsed);
            setIsLoggedIn(true);
          }
        }
      } catch (e) {
        console.warn('Error reading cached user on startup:', e);
      }

      // 2. Fetch fresh real-time user profile from backend with active JWT token
      const token = getAuthToken();
      if (token && token !== 'dummy_token_12345') {
        try {
          const profileRes = await apiFetch('/auth/me');
          if (profileRes && profileRes.user) {
            setUser(profileRes.user);
            setIsLoggedIn(true);
            try {
              localStorage.setItem('jkkniu_user', JSON.stringify(profileRes.user));
            } catch (e) {
              console.warn('Failed to cache user to localStorage:', e);
            }
            fetchFullStackData(profileRes.user);
            return;
          }
        } catch (e) {
          console.warn('JWT user session expired or invalid:', e);
          setAuthToken(null);
          try {
            localStorage.removeItem('jkkniu_user');
          } catch {}
          setUser(null);
          setIsLoggedIn(false);
        }
      }
      fetchFullStackData(null);
    };

    checkUserSession();
  }, []);

  // Set up robust real-time polling to keep listings and notifications completely synchronized
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchFullStackData();
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isLoggedIn, user?.role]);

  // Handle direct sharing links on initial startup (e.g. ?item=4, /item/4, or #item=4)
  useEffect(() => {
    if (deepLinkHandledRef.current) return;

    const checkDeepLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const queryItemId = params.get('item');
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      const hashItemId = hashParams.get('item');
      const pathItemIdMatch = window.location.pathname.match(/\/item\/([^/?#]+)/);
      const targetIdStr = queryItemId || (pathItemIdMatch ? pathItemIdMatch[1] : null) || hashItemId;

      if (targetIdStr) {
        // 1. Look in current state items
        const found = items.find(i => String(i.id) === String(targetIdStr));
        if (found) {
          setSelectedItem(found);
          setActiveTab('detail');
          deepLinkHandledRef.current = true;
          return;
        }

        // 2. Check in INITIAL_ITEMS fallback
        const fallbackFound = INITIAL_ITEMS.find(i => String(i.id) === String(targetIdStr));
        if (fallbackFound) {
          setSelectedItem(fallbackFound);
          setActiveTab('detail');
          deepLinkHandledRef.current = true;
          return;
        }

        // 3. Direct fetch from backend MongoDB API endpoint if running full-stack
        try {
          const res = await apiFetch(`/items/${targetIdStr}`);
          if (res && res.item) {
            setSelectedItem(res.item);
            setItems(prev => {
              const exists = prev.some(x => String(x.id) === String(res.item.id));
              return exists ? prev : [res.item, ...prev];
            });
            setActiveTab('detail');
            deepLinkHandledRef.current = true;
            return;
          }
        } catch (e) {
          // If item doesn't exist on server, default to handled
        }
      } else {
        deepLinkHandledRef.current = true;
      }
    };
    checkDeepLink();
  }, [items]);

  // Handle browser back/forward buttons (PopState)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (activeUserModalTab !== null) {
        setActiveUserModalTab(null);
        return;
      }
      if (submittedItem) {
        setSubmittedItem(null);
        return;
      }
      if (activePrintFlyerItem) {
        setActivePrintFlyerItem(null);
        return;
      }
      if (showLoginRequiredModal) {
        setShowLoginRequiredModal(false);
        return;
      }

      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
        if (event.state.adminSubTab) {
          setAdminSubTab(event.state.adminSubTab);
        }
        if (event.state.itemId) {
          const found = items.find(i => String(i.id) === String(event.state.itemId));
          if (found) setSelectedItem(found);
        }
      } else if (navHistory.length > 0) {
        handleBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navHistory, activeUserModalTab, submittedItem, activePrintFlyerItem, showLoginRequiredModal, items]);

  // Global keyboard shortcuts: Esc to close modals, / to focus search
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // 1. "/" shortcut to focus search
      if (e.key === '/') {
        const active = document.activeElement;
        const isInput = active && (
          active.tagName === 'INPUT' || 
          active.tagName === 'TEXTAREA' || 
          active.tagName === 'SELECT' || 
          active.hasAttribute('contenteditable')
        );
        
        if (!isInput) {
          e.preventDefault();
          if (activeTab !== 'browse') {
            setActiveTab('browse');
            setTimeout(() => {
              const searchInput = document.getElementById('global-search-input');
              if (searchInput) {
                (searchInput as HTMLInputElement).focus();
                (searchInput as HTMLInputElement).select();
              }
            }, 100);
          } else {
            const searchInput = document.getElementById('global-search-input');
            if (searchInput) {
              (searchInput as HTMLInputElement).focus();
              (searchInput as HTMLInputElement).select();
            }
          }
        }
      }

      // 2. "Esc" to close active global modals
      if (e.key === 'Escape') {
        if (submittedItem) {
          setSubmittedItem(null);
        } else if (activePrintFlyerItem) {
          setActivePrintFlyerItem(null);
        } else if (showLoginRequiredModal) {
          setShowLoginRequiredModal(false);
        } else if (activeUserModalTab !== null) {
          setActiveUserModalTab(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [activeTab, submittedItem, activePrintFlyerItem, showLoginRequiredModal, activeUserModalTab]);

  const handleShowToast = (
    msg: string, 
    type: 'success' | 'error' | 'info' | 'default' = 'default',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: Toast = { id, msg, type, actionLabel, onAction };
    
    setToasts(prev => {
      // Prevent duplicate toasts with the exact same message active at once
      if (prev.some(t => t.msg === msg)) {
        return prev;
      }
      return [...prev, newToast];
    });
    
    // Auto-remove toast after 4-5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, actionLabel ? 5000 : 4000);
  };

  const getBackLabelForContext = (fromTab: string, fromAdminSubTab?: string, fromUserModalTab?: string | null): string => {
    if (fromUserModalTab === 'saved') return 'Back to Saved Bookmarks';
    if (fromUserModalTab === 'reports') return 'Back to My Reports';
    if (fromUserModalTab === 'profile') return 'Back to Profile';
    if (fromUserModalTab === 'notifications') return 'Back to Notifications';
    
    if (fromTab === 'admin') {
      if (fromAdminSubTab === 'Pending') return 'Back to Item Management';
      if (fromAdminSubTab === 'Claims') return 'Back to Claims Validation';
      if (fromAdminSubTab === 'Reports') return 'Back to System Reports';
      if (fromAdminSubTab === 'Deleted') return 'Back to Deleted Listings';
      if (fromAdminSubTab === 'Users') return 'Back to User Registry';
      if (fromAdminSubTab === 'Verification') return 'Back to ID Verification';
      if (fromAdminSubTab === 'Overview') return 'Back to Admin Overview';
      return 'Back to Admin Dashboard';
    }
    if (fromTab === 'dashboard') return 'Back to Dashboard';
    if (fromTab === 'landing') return 'Back to Home';
    if (fromTab === 'chat') return 'Back to Messages';
    if (fromTab === 'listing' || fromTab === 'browse') return 'Back to Browse Items';
    if (fromTab === 'database') return 'Back to Database';
    if (fromTab === 'structure') return 'Back to Structure';
    if (fromTab === 'security') return 'Back to Security';
    return 'Back to Previous Page';
  };

  const handleTabChange = (tab: string) => {
    const fromTab = activeTab;
    const fromAdminSubTab = adminSubTab;
    const fromUserModalTab = activeUserModalTab;

    setActiveUserModalTab(null);
    const protectedTabs = ['post', 'dashboard', 'chat', 'admin'];
    if (protectedTabs.includes(tab) && !isLoggedIn) {
      setIntendedAction({ type: 'tab', tab });
      setShowLoginRequiredModal(true);
      handleShowToast('Please login to continue.', 'error');
      return;
    }
    if (tab === 'admin' && user?.role !== 'admin' && user?.role !== 'moderator') {
      handleShowToast('Access denied. You do not have permission to view the Admin Dashboard.', 'error');
      return;
    }

    if (tab !== activeTab) {
      setNavHistory(prev => [
        ...prev,
        {
          tab: fromTab,
          adminSubTab: fromAdminSubTab,
          userModalTab: fromUserModalTab,
          selectedItem: selectedItem || undefined,
          backLabel: getBackLabelForContext(fromTab, fromAdminSubTab, fromUserModalTab)
        }
      ]);
    }

    deepLinkHandledRef.current = true;
    setChatDraftText('');
    setActiveTab(tab);
    try {
      window.history.pushState({ tab, adminSubTab }, '', window.location.pathname);
    } catch {}
    
    // Auto-fetch fresh listings and notifications when switching to core tabs to avoid stale state
    if (['admin', 'dashboard', 'listing', 'chat'].includes(tab)) {
      fetchFullStackData();
    }
  };

  const handleBack = () => {
    if (navHistory.length > 0) {
      const lastEntry = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));

      setActiveTab(lastEntry.tab);
      if (lastEntry.adminSubTab) {
        setAdminSubTab(lastEntry.adminSubTab);
      }
      if (lastEntry.userModalTab) {
        setActiveUserModalTab(lastEntry.userModalTab);
      }
      if (lastEntry.selectedItem && lastEntry.tab === 'detail') {
        setSelectedItem(lastEntry.selectedItem);
      }
      try {
        window.history.pushState(
          { tab: lastEntry.tab, adminSubTab: lastEntry.adminSubTab },
          '',
          window.location.pathname
        );
      } catch {}
    } else {
      // Intelligent fallback if history is empty
      if (user?.role === 'admin' || user?.role === 'moderator') {
        setActiveTab('admin');
        setAdminSubTab('Pending');
      } else {
        setActiveTab('listing');
      }
      try {
        window.history.pushState(
          { tab: (user?.role === 'admin' || user?.role === 'moderator') ? 'admin' : 'listing' },
          '',
          window.location.pathname
        );
      } catch {}
    }
  };

  const handleLogin = (authenticatedUser: any, token: string) => {
    isFirstFetchRef.current = true;
    shownToastsRef.current.clear();
    setAuthToken(token);
    try {
      localStorage.setItem('jkkniu_user', JSON.stringify(authenticatedUser));
    } catch (e) {
      console.warn('Failed to cache user to localStorage on login:', e);
    }
    setUser(authenticatedUser);
    setIsLoggedIn(true);

    // Load bookmarks specifically belonging to this authenticated user account
    const userSaved = loadUserSavedItems(authenticatedUser);
    setSavedItemIds(userSaved);

    handleShowToast(`Welcome back, ${(authenticatedUser.fullName || 'Student').split(' ')[0]}! 👋`, 'success');
    
    // Fetch refreshed live items/notifications/chats
    fetchFullStackData(authenticatedUser);
    
    if (intendedAction) {
      const action = intendedAction;
      setIntendedAction(null); // Clear immediately to prevent any stale leak

      if (action.type === 'tab' && action.tab) {
        setActiveTab(action.tab);
      } else if (action.type === 'contact' && action.item) {
        handleContactPoster(action.item);
      } else if (action.type === 'request_call' && action.item) {
        setSelectedItem(action.item);
        setActiveTab('detail');
        setTimeout(() => {
          handleShowToast('Please click "Request Call" to enter your phone number and preferred callback time.', 'info');
        }, 300);
      } else if (action.type === 'save_item' && action.item) {
        // Do not force-save items clicked during guest session to the user's account.
        // Smoothly guide user to the item's details view with clear instructions.
        setSelectedItem(action.item);
        setActiveTab('detail');
        setTimeout(() => {
          handleShowToast('Signed in successfully! Click "Save Item to Bookmarks" to add this listing to your watchlist.', 'info');
        }, 300);
      } else if (action.type === 'print' && action.item) {
        setSelectedItem(action.item);
        setActiveTab('detail');
        setTimeout(() => {
          handleShowToast('Print configuration unlocked! Click Print Flyer again.', 'success');
        }, 300);
      } else if (action.type === 'report_item' && action.item) {
        setSelectedItem(action.item);
        setActiveTab('detail');
        setTimeout(() => {
          handleShowToast('Report dialog unlocked! Click Report Listing again.', 'success');
        }, 300);
      } else if (action.type === 'claim' && action.item) {
        setSelectedItem(action.item);
        setActiveTab('detail');
        setTimeout(() => {
          handleShowToast('Claim modal unlocked! Click "Claim This Item" to submit your ownership proof.', 'info');
        }, 300);
      }
    } else {
      setActiveTab((authenticatedUser.role === 'admin' || authenticatedUser.role === 'moderator') ? 'admin' : 'dashboard');
    }
  };

  const handleAdminLogin = () => {
    isFirstFetchRef.current = true;
    shownToastsRef.current.clear();
    const adminUser = { 
      id: 'admin_user_009',
      fullName: 'Admin', 
      email: 'nazrulretrievers@gmail.com', 
      role: 'admin' as const,
      studentId: 'ADMIN-009',
      department: 'ICT Administration',
      sessionYear: 'Staff',
      phone: '+880 1712-999999',
      avatar: 'SA'
    };
    setUser(adminUser);
    setIsLoggedIn(true);
    setAuthToken('dummy_admin_token_999');
    try {
      localStorage.setItem('jkkniu_user', JSON.stringify(adminUser));
    } catch {}
    
    // Load admin's isolated bookmarks
    setSavedItemIds(loadUserSavedItems(adminUser));
    setIntendedAction(null);

    setActiveTab('admin');
    handleShowToast('Logged in as Admin! 🛡️', 'success');
    fetchFullStackData(adminUser);
  };

  const handleLogout = () => {
    isFirstFetchRef.current = true;
    shownToastsRef.current.clear();
    setNotifications([]);
    setAuthToken(null);
    try {
      localStorage.removeItem('jkkniu_user');
    } catch {}
    setUser(null);
    setIsLoggedIn(false);
    setSavedItemIds([]); // Clear active bookmarks on sign-out
    setIntendedAction(null); // Clear any pending intended actions
    handleShowToast('Signed out successfully.', 'info');
    setActiveTab('landing');
    fetchFullStackData(null);
  };

  const handleRegister = (customMsg?: string, token?: string, userPayload?: any) => {
    if (token && userPayload) {
      isFirstFetchRef.current = true;
      shownToastsRef.current.clear();
      localStorage.setItem('jkkniu_token', token);
      localStorage.setItem('jkkniu_user', JSON.stringify(userPayload));
      setAuthToken(token);
      setUser(userPayload);
      setIsLoggedIn(true);
      handleShowToast(customMsg || `Welcome, ${userPayload.fullName}! Your email has been verified.`, 'success');
      setActiveTab('dashboard');
    } else {
      handleShowToast(customMsg || 'Account registered successfully! Please login.', 'success');
      setActiveTab('login');
    }
  };

  const handlePostSubmit = async (newPostData: Partial<Item>) => {
    try {
      // In full-stack mode, submit the listing directly to Express server
      const res = await apiFetch('/items', {
        method: 'POST',
        bodyData: newPostData
      });

      if (res.item) {
        setItems(prev => [res.item, ...prev]);
        setSelectedItem(res.item);
        setSubmittedItem(res.item);
        
        // Refresh notifications
        const notifsRes = await apiFetch('/notifications').catch(() => null);
        if (notifsRes && notifsRes.notifications) {
          setNotifications(notifsRes.notifications);
        }

        const isStaff = user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'coordinator' || String(user?.email || '').toLowerCase().trim() === 'nazrulretrievers@gmail.com';
        handleShowToast(
          res.message || (isStaff ? 'Listing published and live immediately (Staff Auto-Approved)!' : 'Report submitted successfully! Awaiting review.'),
          'success'
        );
        setActiveTab('dashboard');
        return;
      }
    } catch (err: any) {
      console.error('Backend item submission failed:', err);
      handleShowToast(err.message || 'Backend item submission failed.', 'error');
    }
  };

  const handleTriggerMockPost = (category: string) => {
    handleShowToast('Mock data generation is disabled in production database mode.', 'info');
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiFetch(`/items/${itemId}`, {
        method: 'DELETE'
      });
      setItems(prev => prev.filter(item => String(item.id) !== String(itemId)));
      if (selectedItem && String(selectedItem.id) === String(itemId)) {
        setSelectedItem(null);
        if (activeTab === 'detail') {
          handleBack();
        }
      }
      handleShowToast('Listing deleted successfully.', 'success');
      fetchFullStackData(user);
    } catch (err: any) {
      setItems(prev => prev.filter(item => String(item.id) !== String(itemId)));
      if (selectedItem && String(selectedItem.id) === String(itemId)) {
        setSelectedItem(null);
        if (activeTab === 'detail') {
          handleBack();
        }
      }
      handleShowToast(err?.message || 'Listing deleted successfully.', 'success');
    }
  };

  const handleSelectItem = async (item: Item, customBackLabel?: string) => {
    const fromTab = activeTab;
    const fromAdminSubTab = adminSubTab;
    const fromUserModalTab = activeUserModalTab;

    const computedBackLabel = customBackLabel || getBackLabelForContext(fromTab, fromAdminSubTab, fromUserModalTab);

    // Push previous view state to navigation history stack
    setNavHistory(prev => [
      ...prev,
      {
        tab: fromTab,
        adminSubTab: fromAdminSubTab,
        userModalTab: fromUserModalTab,
        selectedItem: selectedItem || undefined,
        backLabel: computedBackLabel
      }
    ]);

    setActiveUserModalTab(null);
    setSelectedItem(item);
    setActiveTab('detail');

    try {
      window.history.pushState(
        { tab: 'detail', itemId: item.id, fromTab, fromAdminSubTab },
        '',
        window.location.pathname + `?item=${item.id}`
      );
    } catch {}

    // Fetch details asynchronously to increment views in the backend database
    try {
      const res = await apiFetch(`/items/${item.id}`);
      if (res && res.item) {
        setSelectedItem(res.item);
        setItems(prev => prev.map(i => String(i.id) === String(item.id) ? res.item : i));
      }
    } catch (err) {
      console.warn('Failed to increment live view count on server:', err);
      // Fallback: update views locally in frontend state if server is offline/mock mode
      const updatedItem = { ...item, views: (item.views || 0) + 1 };
      setSelectedItem(updatedItem);
      setItems(prev => prev.map(i => String(i.id) === String(item.id) ? updatedItem : i));
    }
  };

  const handleSelectItemByTitle = (title: string) => {
    const item = items.find(i => i.title === title);
    if (item) {
      handleSelectItem(item);
    } else {
      handleShowToast('Referenced listing has been archived or removed.', 'error');
    }
  };

  const handleContactPoster = async (item: Item) => {
    if (!isLoggedIn) {
      setIntendedAction({ type: 'contact', item });
      setShowLoginRequiredModal(true);
      handleShowToast('Please login to continue.', 'error');
      return;
    }

    const userFullName = (user?.fullName || (user as any)?.full_name || '').toLowerCase();
    const userIdStr = user ? String(user.id) : '';
    const posterUserIdStr = item.userId 
      ? String(item.userId) 
      : ((item.postedBy as any)?.userId || (item.postedBy as any)?.id ? String((item.postedBy as any).userId || (item.postedBy as any).id) : '');
    const posterName = item?.postedBy?.name || 'Poster';
    const posterNameLower = posterName.toLowerCase();

    const posterEmail = (item.email || (item.postedBy as any)?.email || '').toLowerCase();
    const userEmail = (user?.email || '').toLowerCase();

    if (user && (
      (userIdStr && posterUserIdStr && userIdStr === posterUserIdStr) ||
      (userEmail && posterEmail && userEmail === posterEmail)
    )) {
      handleShowToast('You cannot send a message to yourself.', 'error');
      return;
    }

    const posterFirstName = posterName.trim().split(' ')[0] || 'Poster';
    const draftText = `Hi ${posterFirstName}, is this listing still active?`;

    // Calculate a unique identifier for this recipient
    const targetOtherUserId = posterUserIdStr || `user-${String(posterNameLower || 'user').replace(/[^a-z0-9]/g, '-')}`;
    let targetThreadId = '';

    // Check if conversation with this poster or about this listing already exists
    const existingThread = threads.find(t => {
      const otherId = t?.otherUserId ? String(t.otherUserId) : '';
      const participantsMatch = t.participants && userIdStr && targetOtherUserId && t.participants.map(String).includes(String(targetOtherUserId));
      const isSameOtherUser = otherId && targetOtherUserId && otherId === String(targetOtherUserId);
      const isSameItemTitle = t.itemTitle && item.title && t.itemTitle.trim().toLowerCase() === item.title.trim().toLowerCase();

      return (isSameOtherUser || participantsMatch) && isSameItemTitle;
    }) || threads.find(t => {
      const threadName = (t?.name || '').toLowerCase();
      const otherId = t?.otherUserId ? String(t.otherUserId) : '';
      const participantsMatch = t.participants && userIdStr && targetOtherUserId && t.participants.map(String).includes(String(targetOtherUserId));
      const isSameOtherUser = otherId && targetOtherUserId && otherId === String(targetOtherUserId);
      const isSamePosterName = threadName && posterNameLower && threadName === posterNameLower;

      return isSameOtherUser || participantsMatch || isSamePosterName;
    });

    const posterAvatar = item.postedBy?.avatar || '';
    const posterInitials = posterAvatar || item.postedBy?.initials || (posterName ? posterName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U');

    if (existingThread) {
      targetThreadId = existingThread.id;
      const updatedExisting = {
        ...existingThread,
        itemTitle: existingThread.itemTitle || item.title
      };
      setThreads(prev => [updatedExisting, ...prev.filter(t => t.id !== existingThread.id)]);
      setSelectedThreadId(existingThread.id);
    } else {
      const newThreadId = `thread-${Date.now()}`;
      targetThreadId = newThreadId;
      const newThread: ChatThread = {
        id: newThreadId,
        name: posterName,
        initials: posterInitials,
        avatar: posterAvatar,
        itemId: item.id,
        itemTitle: item.title,
        preview: draftText,
        time: 'Just now',
        unreadCount: 0,
        online: true,
        otherUserId: targetOtherUserId,
        participants: [userIdStr || 'me', targetOtherUserId],
        messages: []
      };

      setThreads(prev => [newThread, ...prev.filter(t => t.id !== newThreadId)]);
      setSelectedThreadId(newThreadId);
    }

    // Persist immediately on the backend server so background polling won't wipe it out!
    apiFetch('/chats/initiate', {
      method: 'POST',
      bodyData: {
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.type,
        recipientId: posterUserIdStr,
        recipientName: posterName,
        recipientAvatar: posterAvatar,
        recipientEmail: posterEmail,
        draftMessage: draftText,
        threadId: targetThreadId
      }
    }).then(res => {
      if (res && res.thread) {
        const serverThread = res.thread;
        setSelectedThreadId(serverThread.id);
        setThreads(prev => {
          const filtered = prev.filter(t => t.id !== targetThreadId && t.id !== serverThread.id);
          return [serverThread, ...filtered];
        });
      }
    }).catch(err => {
      console.warn('Backend thread initiate error (fallback to local state):', err);
    });

    deepLinkHandledRef.current = true;
    const fromTab = activeTab;
    const fromAdminSubTab = activeTab === 'admin' ? adminSubTab : undefined;
    const fromUserModalTab = activeUserModalTab;

    setNavHistory(prev => [
      ...prev,
      {
        tab: fromTab,
        adminSubTab: fromAdminSubTab,
        userModalTab: fromUserModalTab,
        selectedItem: selectedItem || undefined,
        backLabel: getBackLabelForContext(fromTab, fromAdminSubTab, fromUserModalTab)
      }
    ]);

    setChatDraftText(draftText);
    setActiveTab('chat');
    try {
      window.history.pushState({ tab: 'chat', threadId: targetThreadId }, '', window.location.pathname);
    } catch {}
  };

  const handleDirectMessageUser = async (targetUser: any) => {
    if (!isLoggedIn) {
      setIntendedAction({ type: 'tab', tab: 'chat' });
      setShowLoginRequiredModal(true);
      handleShowToast('Please login to continue.', 'error');
      return;
    }

    const myUserIdStr = user ? String((user as any).id || (user as any)._id || '') : '';
    const myEmail = (user?.email || '').toLowerCase().trim();

    const targetUserIdStr = targetUser ? String(targetUser.id || targetUser._id || '') : '';
    const targetEmail = (targetUser?.email || '').toLowerCase().trim();
    const targetName = targetUser?.fullName || targetUser?.full_name || targetUser?.name || 'Campus User';
    const targetNameLower = targetName.toLowerCase();
    const targetAvatar = targetUser?.avatar || '';
    const targetInitials = targetAvatar || targetName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

    if (
      (myUserIdStr && targetUserIdStr && myUserIdStr === targetUserIdStr) ||
      (myEmail && targetEmail && myEmail === targetEmail)
    ) {
      handleShowToast('You cannot send a message to yourself.', 'error');
      return;
    }

    const targetFullName = (targetUser?.fullName || targetUser?.full_name || targetUser?.name || 'Campus User').trim();
    const targetOtherUserId = targetUserIdStr || `user-${String(targetNameLower || 'user').replace(/[^a-z0-9]/g, '-')}`;
    let targetThreadId = '';

    // Check if conversation with this user already exists
    const existingThread = threads.find(t => {
      const otherId = t?.otherUserId ? String(t.otherUserId) : '';
      const participantsMatch = t.participants && myUserIdStr && targetOtherUserId && t.participants.map(String).includes(String(targetOtherUserId));
      const isSameOtherUser = otherId && targetOtherUserId && otherId === String(targetOtherUserId);
      const threadName = (t?.name || '').toLowerCase();
      const isSameName = threadName && targetNameLower && threadName === targetNameLower;

      return isSameOtherUser || participantsMatch || isSameName;
    });

    const hasPreviousMessages = Boolean(
      existingThread && (
        (Array.isArray(existingThread.messages) && existingThread.messages.length > 0) ||
        (existingThread.preview && existingThread.preview !== 'No messages yet' && !existingThread.preview.startsWith('Hi '))
      )
    );

    // If no previous message exists, pre-fill with "Hi <full name>, ". If there are previous messages, no "Hi" greeting.
    const draftText = hasPreviousMessages ? '' : `Hi ${targetFullName}, `;

    if (existingThread) {
      targetThreadId = existingThread.id;
      setThreads(prev => [existingThread, ...prev.filter(t => t.id !== existingThread.id)]);
      setSelectedThreadId(existingThread.id);
    } else {
      const newThreadId = `thread-${Date.now()}`;
      targetThreadId = newThreadId;
      const newThread: ChatThread = {
        id: newThreadId,
        name: targetFullName,
        initials: targetInitials,
        avatar: targetAvatar,
        itemTitle: 'Direct Message',
        preview: draftText || 'No messages yet',
        time: 'Just now',
        unreadCount: 0,
        online: true,
        otherUserId: targetOtherUserId,
        participants: [myUserIdStr || 'me', targetOtherUserId],
        messages: []
      };

      setThreads(prev => [newThread, ...prev.filter(t => t.id !== newThreadId)]);
      setSelectedThreadId(newThreadId);
    }

    // Persist immediately on the backend server
    apiFetch('/chats/initiate', {
      method: 'POST',
      bodyData: {
        recipientId: targetUserIdStr,
        recipientName: targetFullName,
        recipientAvatar: targetAvatar,
        recipientEmail: targetEmail,
        itemTitle: 'Direct Message',
        draftMessage: draftText,
        threadId: targetThreadId
      }
    }).then(res => {
      if (res && res.thread) {
        const serverThread = res.thread;
        const serverHasMessages = Boolean(
          (Array.isArray(serverThread.messages) && serverThread.messages.length > 0) ||
          (serverThread.preview && serverThread.preview !== 'No messages yet' && !serverThread.preview.startsWith('Hi '))
        );
        if (serverHasMessages) {
          setChatDraftText('');
        }
        setSelectedThreadId(serverThread.id);
        setThreads(prev => {
          const filtered = prev.filter(t => t.id !== targetThreadId && t.id !== serverThread.id);
          return [serverThread, ...filtered];
        });
      }
    }).catch(err => {
      console.warn('Backend direct message initiate error (fallback to local state):', err);
    });

    deepLinkHandledRef.current = true;
    const fromTab = activeTab;
    const fromAdminSubTab = activeTab === 'admin' ? adminSubTab : undefined;
    const fromUserModalTab = activeUserModalTab;

    setNavHistory(prev => [
      ...prev,
      {
        tab: fromTab,
        adminSubTab: fromAdminSubTab,
        userModalTab: fromUserModalTab,
        selectedItem: selectedItem || undefined,
        backLabel: getBackLabelForContext(fromTab, fromAdminSubTab, fromUserModalTab)
      }
    ]);

    setChatDraftText(draftText);
    setActiveTab('chat');
    try {
      window.history.pushState({ tab: 'chat', threadId: targetThreadId }, '', window.location.pathname);
    } catch {}
  };

  const handleApproveItem = async (id: string) => {
    // Optimistically update React state immediately
    setItems(prev => prev.map(i => (String(i.id) === String(id) || String((i as any)._id) === String(id)) ? { ...i, approvalStatus: 'approved', status: 'active', isApproved: true, isRejected: false } : i));
    handleShowToast(`Listing #084${id} has been approved and is now live.`, 'success');

    try {
      await apiFetch(`/admin/items/${id}/approve`, {
        method: 'PUT',
        bodyData: { action: 'approve' }
      });
    } catch (err) {
      try {
        await apiFetch(`/items/${id}/approve`, {
          method: 'PATCH'
        });
      } catch (fallbackErr) {
        console.warn('Backend approval failed, keeping client-side state:', fallbackErr);
      }
    }
    // Refresh full-stack state after server responds
    await fetchFullStackData();
  };

  const handleRejectItem = async (id: string, reason?: string) => {
    setItems(prev => prev.map(i => (String(i.id) === String(id) || String((i as any)._id) === String(id)) ? { ...i, approvalStatus: 'rejected', status: 'rejected', isRejected: true, isApproved: false, rejectionReason: reason } : i));
    handleShowToast(`Listing #084${id} rejected.`, 'info');

    try {
      await apiFetch(`/admin/items/${id}/approve`, {
        method: 'PUT',
        bodyData: { action: 'reject', reason }
      });
    } catch (err) {
      try {
        await apiFetch(`/items/${id}/reject`, {
          method: 'PATCH',
          bodyData: { reason }
        });
      } catch (fallbackErr) {
        console.warn('Backend rejection failed, keeping client-side state:', fallbackErr);
      }
    }
    await fetchFullStackData();
  };

  const handleUpdateUser = async (updatedFields: any) => {
    let finalFields = { ...updatedFields };
    
    // Intercept any base64 data URLs to make sure they are uploaded to ImgBB first
    if (finalFields.avatar && finalFields.avatar.startsWith('data:')) {
      try {
        const res = await apiFetch('/auth/upload-imgbb', {
          method: 'POST',
          bodyData: { image: finalFields.avatar }
        });
        if (res && res.url) {
          finalFields.avatar = res.url;
        }
      } catch (err) {
        console.warn('Failed to upload avatar via proxy inside handleUpdateUser, falling back to direct upload...', err);
        try {
          const base64Clean = finalFields.avatar.split(',')[1] || finalFields.avatar;
          const directFormData = new FormData();
          directFormData.append('image', base64Clean);

          const imgbbKey = ((import.meta as any).env?.VITE_IMGBB_API_KEY as string) || 
                           (process.env.IMGBB_API_KEY as string) || 
                           'eeae5ac8abaf61efd5cadc10b0fd0922';
          
          const directResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
            method: 'POST',
            body: directFormData
          });
          const directData = await directResponse.json();
          if (directData && directData.success && directData.data && directData.data.url) {
            finalFields.avatar = directData.data.url;
          }
        } catch (directErr) {
          console.error('Direct fallback also failed in handleUpdateUser:', directErr);
        }
      }
    }

    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        bodyData: finalFields
      });
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('jkkniu_user', JSON.stringify(res.user));
        return res.user;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Backend profile update failed:', err);
      throw err;
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!notifId) return;
    // Instantly update local notification state for zero lag
    setNotifications(prev =>
      prev.map(n => {
        if (String(n.id) === String(notifId)) {
          return { ...n, unread: false, isRead: true, is_read: true };
        }
        return n;
      })
    );

    try {
      if (String(notifId).startsWith('admin-')) {
        const realAdminId = String(notifId).replace(/^admin-/, '');
        await apiFetch(`/admin/notifications/${realAdminId}/read`, { method: 'PUT' });
      } else {
        await apiFetch(`/notifications/${notifId}/read`, { method: 'POST' });
      }
    } catch (err: any) {
      console.warn('Failed to persist single notification read status:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    // Instantly update local state for responsive UI
    setNotifications(prev => prev.map(n => ({ ...n, unread: false, isRead: true, is_read: true })));
    handleShowToast('All notifications marked as read', 'success');

    try {
      // Persist to user notifications
      await apiFetch('/notifications/read-all', { method: 'POST' });

      // If admin/moderator, also mark admin notifications as read
      const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';
      if (isAdminOrMod) {
        await apiFetch('/admin/notifications/read-all', { method: 'PUT' });
      }
    } catch (err: any) {
      console.warn('Failed to persist marking notifications as read:', err);
    }
  };

  // Dynamic layout component picker based on activeTab state
  const renderTabContent = () => {
    switch (activeTab) {
      case 'landing':
        return (
          <LandingPage 
            onTabChange={handleTabChange} 
            onPostTypeToggle={setPostTypePreference} 
          />
        );
      case 'login':
        return (
          <SignInPage 
            onLoginSuccess={handleLogin} 
            onTabChange={handleTabChange} 
          />
        );
      case 'register':
        return (
          <RegisterPage 
            onRegisterSuccess={handleRegister} 
            onTabChange={handleTabChange} 
          />
        );
      case 'dashboard':
        return (
          <DashboardPage 
            user={user} 
            myItems={items.filter(i => {
              const isDeleted = i.isDeleted || i.status === 'deleted';
              if (isDeleted) return false;
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
              const userStudentId = String(user?.studentId || (user as any)?.student_id || (user as any)?.rollNumber || '').trim();
              const itemStudentId = String((i as any).studentId || (i.postedBy as any)?.studentId || '').trim();
              if (userStudentId && itemStudentId && userStudentId === itemStudentId) {
                return true;
              }
              const userName = (user?.fullName || (user as any)?.full_name || '').trim().toLowerCase();
              const itemPosterName = (i.postedBy?.name || (i as any)?.displayName || '').trim().toLowerCase();
              if (userName && itemPosterName && userName === itemPosterName) {
                return true;
              }
              return false;
            })}
            notifications={notifications}
            threads={threads}
            allItems={items}
            onTabChange={handleTabChange}
            onPostTypeToggle={setPostTypePreference}
            onSelectItem={handleSelectItem}
            onTriggerMockPost={handleTriggerMockPost}
            onShowToast={handleShowToast}
            onDeleteItem={handleDeleteItem}
            onOpenUserModal={setActiveUserModalTab}
            onMarkNotificationRead={handleMarkNotificationRead}
          />
        );
      case 'post':
        return (
          <PostItemPage 
            initialType={postTypePreference} 
            onPostSubmit={handlePostSubmit}
            onShowToast={handleShowToast}
            currentUser={user}
          />
        );
      case 'listing':
        return (
          <BrowseItemsPage 
            items={items.filter(i => {
              if (i.isDeleted || i.status === 'deleted') return false;
              if (i.approvalStatus === 'rejected' || i.status === 'rejected' || (i as any).isRejected === true) return false;
              return (
                i.approvalStatus === 'approved' ||
                (i as any).approval_status === 'approved' ||
                i.isApproved === true ||
                i.status === 'active' ||
                i.status === 'returned' ||
                i.status === 'reunited' ||
                i.status === 'claimed' ||
                i.status === 'handover_pending' ||
                i.status === 'under_verification' ||
                i.status === 'claim_requested'
              );
            })}
            onSelectItem={handleSelectItem}
            onTabChange={handleTabChange}
            onPostTypeToggle={setPostTypePreference}
            onContactPoster={handleContactPoster}
            savedItemIds={savedItemIds}
            onToggleSaveItem={handleToggleSaveItem}
            onOpenSavedModal={() => setActiveUserModalTab('saved')}
            onShowToast={handleShowToast}
            isLoggedIn={isLoggedIn}
            currentUser={user}
            onRequireLogin={(act) => {
              setIntendedAction(act);
              setShowLoginRequiredModal(true);
              handleShowToast('Please login to bookmark listings.', 'error');
            }}
          />
        );
      case 'detail': {
        const topHistory = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
        const currentBackLabel = topHistory?.backLabel || (
          (user?.role === 'admin' || user?.role === 'moderator') 
            ? 'Back to Item Management' 
            : 'Back to Listings'
        );

        return (
          <ItemDetailPage 
            item={selectedItem}
            similarItems={items.filter(i => i.id !== selectedItem.id && i.category === selectedItem.category && !i.isDeleted && i.status !== 'deleted')}
            allItems={items.filter(i => {
              if (i.isDeleted || i.status === 'deleted') return false;
              if (i.approvalStatus === 'rejected' || i.status === 'rejected' || (i as any).isRejected === true) return false;
              return (
                i.approvalStatus === 'approved' ||
                (i as any).approval_status === 'approved' ||
                i.isApproved === true ||
                i.status === 'active' ||
                i.status === 'returned' ||
                i.status === 'reunited' ||
                i.status === 'claimed' ||
                i.status === 'handover_pending' ||
                i.status === 'under_verification' ||
                i.status === 'claim_requested'
              );
            })}
            onBack={handleBack}
            backLabel={currentBackLabel}
            onSelectItem={handleSelectItem}
            onSendMessage={handleContactPoster}
            onShowToast={handleShowToast}
            isLoggedIn={isLoggedIn}
            savedItemIds={savedItemIds}
            onToggleSaveItem={handleToggleSaveItem}
            onOpenSavedModal={() => setActiveUserModalTab('saved')}
            onOpenUserModal={setActiveUserModalTab}
            onRequireLogin={(act) => {
              setIntendedAction(act);
              setShowLoginRequiredModal(true);
              handleShowToast('Please login to continue.', 'error');
            }}
            currentUser={user}
            onDeleteItem={handleDeleteItem}
          />
        );
      }
      case 'chat':
        return (
          <ChatPage 
            threads={threads}
            allItems={items}
            onRefreshItems={fetchFullStackData}
            onUpdateThreads={setThreads}
            onSelectItemByTitle={handleSelectItemByTitle}
            onShowToast={handleShowToast}
            currentUser={user}
            selectedThreadId={selectedThreadId}
            initialDraftText={chatDraftText}
            onClearDraftText={() => setChatDraftText(null)}
            onThreadRead={(threadId) => {
              setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unreadCount: 0 } : t));
              apiFetch(`/chats/${threadId}/read`, { method: 'POST' }).catch(() => {});
            }}
          />
        );
      case 'admin':
        return (
          <AdminPage 
            pendingItems={items.filter(i => (i.approvalStatus === 'pending' || i.status === 'pending') && !i.isDeleted)}
            deletedItems={items.filter(i => i.isDeleted || i.status === 'deleted')}
            allItems={items}
            onApproveItem={handleApproveItem}
            onRejectItem={handleRejectItem}
            onSelectItem={handleSelectItem}
            onShowToast={handleShowToast}
            activeSubTab={adminSubTab}
            onSubTabChange={setAdminSubTab}
            onRefresh={fetchFullStackData}
            user={user}
            onOpenUserModal={setActiveUserModalTab}
            onUpdateUser={handleUpdateUser}
            onMessageUser={handleDirectMessageUser}
          />
        );
      case 'database':
        return <DatabasePage />;
      case 'structure':
        return <StructurePage />;
      case 'security':
        return <SecurityPage />;
      default:
        return (
          <LandingPage 
            onTabChange={handleTabChange} 
            onPostTypeToggle={setPostTypePreference} 
          />
        );
    }
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-amber-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-amber-500" />;
    }
  };

  const unreadMessagesCount = (threads || []).reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Skip to Main Content Bypass Link for Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] bg-amber-400 text-slate-950 font-extrabold px-5 py-3 rounded-xl shadow-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 border border-amber-300 transition-all"
      >
        Skip to main content
      </a>

      {/* ── NAVBAR ── */}
      <Navbar 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        notifications={notifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onMarkNotificationRead={handleMarkNotificationRead}
        onShowNotificationToast={(msg) => handleShowToast(msg, 'info')}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        user={user}
        onSetAdminSubTab={setAdminSubTab}
        onOpenUserModal={setActiveUserModalTab}
        onCloseUserModal={() => setActiveUserModalTab(null)}
        isUserModalOpen={activeUserModalTab !== null}
        allItems={items}
        onSelectItem={handleSelectItem}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* ── DEMO TABS (DISABLED IN PRODUCTION) ── */}
      {false && (
        <div className="demo-tabs bg-brand-navy-mid border-b border-brand-gold/14 overflow-x-auto flex gap-1.5 px-4 md:px-8 py-3 sticky top-[68px] z-40 shadow-sm scrollbar-thin">
          {[
            { tab: 'landing', label: '🏠 Landing' },
            { tab: 'login', label: '🔐 Login' },
            { tab: 'register', label: '📝 Register' },
            { tab: 'dashboard', label: '📊 Dashboard' },
            { tab: 'post', label: '➕ Post Item' },
            { tab: 'listing', label: '🔍 Browse' },
            { tab: 'detail', label: '📋 Detail' },
            { tab: 'chat', label: '💬 Chat' },
            { tab: 'admin', label: '⚙️ Admin' },
            { tab: 'database', label: '🗄️ Database' },
            { tab: 'structure', label: '📁 Structure' },
            { tab: 'security', label: '🔒 Security' }
          ].map(item => (
            <button 
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === item.tab 
                  ? 'bg-gradient-to-r from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-extrabold shadow-md shadow-brand-gold/10' 
                  : 'text-white/50 hover:bg-white/5 hover:text-white/85'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENTS ── */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
        {renderTabContent()}
      </main>

      {/* ── TOAST NOTIFICATIONS ── */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-[400px] sm:w-full mx-auto sm:mx-0">
        {toasts.map(t => (
          <div 
            key={t.id}
            className={`pointer-events-auto shadow-xl flex items-center justify-between gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 duration-250 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border-l-4 ${
              t.type === 'success' ? 'border-l-emerald-500' :
              t.type === 'error' ? 'border-l-rose-500' :
              t.type === 'info' ? 'border-l-amber-400' : 'border-l-amber-400'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                {getToastIcon(t.type)}
              </div>
              <div className="flex-1 text-xs sm:text-sm font-medium leading-snug break-words" dangerouslySetInnerHTML={{ __html: t.msg }} />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {t.actionLabel && t.onAction && (
                <button
                  onClick={() => {
                    t.onAction?.();
                    setToasts(prev => prev.filter(x => x.id !== t.id));
                  }}
                  className="px-2.5 py-1 text-[11px] font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
                >
                  {t.actionLabel}
                </button>
              )}
              <button 
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-white/50 hover:text-white transition-colors cursor-pointer p-1"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {submittedItem && (
          <ConfirmationModal
            item={submittedItem}
            isOpen={true}
            onClose={() => setSubmittedItem(null)}
            onOpenPrintFlyer={() => setActivePrintFlyerItem(submittedItem)}
            onShowToast={handleShowToast}
            onViewReport={() => {
              handleSelectItem(submittedItem);
              setSubmittedItem(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── PRINT FLYER MODAL (GLOBAL) ── */}
      {activePrintFlyerItem && (
        <PrintFlyerModal
          item={activePrintFlyerItem}
          isOpen={true}
          onClose={() => setActivePrintFlyerItem(null)}
          onShowToast={handleShowToast}
        />
      )}

      {/* ── LOGIN REQUIRED MODAL ── */}
      <LoginRequiredModal
        isOpen={showLoginRequiredModal}
        onClose={() => {
          setShowLoginRequiredModal(false);
          setIntendedAction(null);
        }}
        onLogin={() => handleTabChange('login')}
        onRegister={() => handleTabChange('register')}
      />

      {/* ── USER PROFILE & ACCOUNT DASHBOARD MODALS ── */}
      <UserProfileMenuModals
        isOpen={activeUserModalTab !== null}
        onClose={() => setActiveUserModalTab(null)}
        activeTab={activeUserModalTab || 'profile'}
        onActiveTabChange={setActiveUserModalTab}
        user={user}
        onUpdateUser={handleUpdateUser}
        items={items}
        onUpdateItems={setItems}
        onSelectItem={handleSelectItem}
        onTabChange={handleTabChange}
        onShowToast={handleShowToast}
        savedItemIds={savedItemIds}
        onToggleSaveItem={handleToggleSaveItem}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onMarkNotificationRead={handleMarkNotificationRead}
      />
    </div>
  );
}
