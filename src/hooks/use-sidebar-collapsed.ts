import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** Where the sidebar's collapsed/expanded state is remembered. */
export const SIDEBAR_STORAGE_KEY = 'dlailog:sidebar';

/**
 * Whether the sidebar is compacted down to its icon rail. The choice is
 * remembered, so the app opens the way it was left.
 */
export function useSidebarCollapsed(): { collapsed: boolean; toggle: () => void } {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SIDEBAR_STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw === 'collapsed') setCollapsed(true);
      })
      .catch(() => {
        // No stored choice — expanded is the sensible default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      AsyncStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'collapsed' : 'expanded').catch(() => {});
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
