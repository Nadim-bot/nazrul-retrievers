export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'jkkniu_theme';
export const THEME_CHANGE_EVENT = 'jkkniu_theme_change';

/**
 * Gets the current raw stored theme mode ('light' | 'dark' | 'system').
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {}
  return 'system';
}

/**
 * Determines whether dark mode is effectively active right now based on mode & system preference.
 */
export function isDarkActive(mode?: ThemeMode): boolean {
  if (typeof window === 'undefined') return false;
  const currentMode = mode || getStoredThemeMode();
  if (currentMode === 'dark') return true;
  if (currentMode === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Applies a theme mode across document, localStorage, and notifies all listeners in all tabs/components.
 */
export function applyThemeMode(mode: ThemeMode): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {}

  const isDark = isDarkActive(mode);
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Dispatch custom event and standard storage event for full synchronization
  try {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode, isDark } }));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return isDark;
}

/**
 * Quick toggle for binary button in Navbar:
 * If currently dark -> sets 'light'.
 * If currently light -> sets 'dark'.
 */
export function toggleThemeQuick(): boolean {
  const currentIsDark = isDarkActive();
  const nextMode: ThemeMode = currentIsDark ? 'light' : 'dark';
  return applyThemeMode(nextMode);
}

/**
 * Subscribes to theme changes across custom events, storage events, media query, and DOM mutations.
 */
export function subscribeToTheme(callback: (mode: ThemeMode, isDark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    const mode = getStoredThemeMode();
    const isDark = isDarkActive(mode);
    callback(mode, isDark);
  };

  const handleStorage = (e?: StorageEvent | Event) => {
    if (e && 'key' in e && e.key && e.key !== THEME_STORAGE_KEY) return;
    handleUpdate();
  };

  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent)?.detail;
    if (detail && detail.mode) {
      callback(detail.mode, detail.isDark);
    } else {
      handleUpdate();
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorage);

  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const handleMediaChange = () => {
    if (getStoredThemeMode() === 'system') {
      const mode = getStoredThemeMode();
      const isDark = isDarkActive(mode);
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      callback(mode, isDark);
    }
  };

  if (mediaQuery) {
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      (mediaQuery as any).addListener(handleMediaChange);
    }
  }

  const observer = new MutationObserver(() => {
    handleUpdate();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (mediaQuery) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        (mediaQuery as any).removeListener(handleMediaChange);
      }
    }
    observer.disconnect();
  };
}
