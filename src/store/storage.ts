import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DB, DB_VERSION, emptyDB } from '@/store/types';

/** Everything DlaiLog owns lives under this one key (PRD §7.1). */
export const STORAGE_KEY = 'dlailog:v1';
/** Where unreadable saved data is kept aside instead of being discarded. */
export const CORRUPT_STORAGE_KEY = 'dlailog:v1:corrupt';

/** Expo renders the static HTML on a server where the browser has no storage. */
function isServerPrerender(): boolean {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

/** Shape check for anything claiming to be a DlaiLog database. */
export function isValidDB(value: unknown): value is DB {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DB>;
  if (candidate.version !== DB_VERSION) return false;
  return (
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.notes) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.purchases)
  );
}

export function parseDB(raw: string | null): DB | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidDB(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function loadDB(): Promise<DB> {
  if (isServerPrerender()) return emptyDB();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = parseDB(raw);
    if (parsed) return parsed;
    if (raw) {
      // Keep a copy of unreadable data rather than silently dropping it.
      await AsyncStorage.setItem(CORRUPT_STORAGE_KEY, raw);
    }
    return emptyDB();
  } catch (error) {
    console.warn('[DlaiLog] Could not load saved data:', error);
    return emptyDB();
  }
}

/** Saves the whole database; throws so callers can surface a failure. */
export async function saveDB(db: DB): Promise<void> {
  if (isServerPrerender()) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
