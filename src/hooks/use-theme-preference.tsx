import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The appearance choice: follow the system, or pin Light/Dark regardless of it.
 * The choice is remembered in the browser next to the rest of the data, so it
 * survives a refresh.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

/** Where the choice is kept — alongside the database key (PRD §7.1). */
export const THEME_PREFERENCE_KEY = 'dlailog:theme';

export const THEME_PREFERENCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

interface ThemePreferenceValue {
  preference: ThemePreference;
  /** What is on screen right now: the preference applied to the system. */
  scheme: ThemeScheme;
  setPreference: (next: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((raw) => {
        if (!cancelled && isPreference(raw)) setPreferenceState(raw);
      })
      .catch(() => {
        // Nothing saved yet, or storage is unavailable — following the system
        // is the right answer either way.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(THEME_PREFERENCE_KEY, next).catch(() => {});
  }, []);

  const scheme: ThemeScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

/**
 * The theme in use. Screens read their colours through `useTheme`, which is
 * built on this. Outside a provider it still answers usefully (the system's
 * setting), which keeps components renderable on their own in tests.
 */
export function useThemeScheme(): ThemeScheme {
  const context = useContext(ThemePreferenceContext);
  const systemScheme = useColorScheme();

  if (context) return context.scheme;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

/** The switch's own state; inert but harmless outside a provider. */
export function useThemePreference(): ThemePreferenceValue {
  const context = useContext(ThemePreferenceContext);
  const fallbackScheme = useThemeScheme();

  return (
    context ?? {
      preference: 'system',
      scheme: fallbackScheme,
      setPreference: () => {},
    }
  );
}
