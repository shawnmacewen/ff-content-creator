'use client';

import { useCallback, useEffect, useState } from 'react';

const TOP_NAV_STORAGE_KEY = 'editorial.topNavVisible';
const TOP_NAV_VISIBILITY_EVENT = 'editorial:top-nav-visibility';

export function useTopNavVisibility() {
  const [isTopNavVisible, setIsTopNavVisibleState] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOP_NAV_STORAGE_KEY);
    if (stored === 'false') setIsTopNavVisibleState(false);

    const handleVisibilityEvent = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setIsTopNavVisibleState(detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === TOP_NAV_STORAGE_KEY) {
        setIsTopNavVisibleState(event.newValue !== 'false');
      }
    };

    window.addEventListener(TOP_NAV_VISIBILITY_EVENT, handleVisibilityEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(TOP_NAV_VISIBILITY_EVENT, handleVisibilityEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTopNavVisible = useCallback((nextVisible: boolean) => {
    setIsTopNavVisibleState(nextVisible);
    window.localStorage.setItem(TOP_NAV_STORAGE_KEY, String(nextVisible));
    window.dispatchEvent(new CustomEvent(TOP_NAV_VISIBILITY_EVENT, { detail: nextVisible }));
  }, []);

  return { isTopNavVisible, setTopNavVisible };
}
