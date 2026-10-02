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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Brings any stored database forward to the current version.
 *
 * Version 1 held four lists (tasks, notes, projects, purchases); version 2
 * added inventory, meals and shopping; version 3 added the optional repeating
 * fields on tasks (which need no data change — an old task simply does not
 * repeat). Anything that is not recognisably a DlaiLog database — at any
 * version — is rejected, so a stray JSON blob can never be mistaken for real
 * data.
 */
export function migrateDB(value: unknown): DB | null {
  if (!isRecord(value)) return null;

  const candidate = value as Partial<DB>;
  const version: unknown = (value as { version?: unknown }).version;
  const hasCore =
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.notes) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.purchases);

  if (!hasCore) return null;

  // Version 1 had no pantry, meals or shopping list — those start empty.
  if (version === 1) {
    return {
      ...(candidate as unknown as Omit<DB, 'version' | 'inventory' | 'meals' | 'shopping'>),
      version: DB_VERSION,
      inventory: [],
      meals: [],
      shopping: [],
    } as DB;
  }

  const hasExtras =
    Array.isArray(candidate.inventory) &&
    Array.isArray(candidate.meals) &&
    Array.isArray(candidate.shopping);

  // Version 2 held the same records as 3; the task fields added in 3 are
  // optional, so nothing needs rewriting — only the version stamp.
  if (version === 2 || version === DB_VERSION) {
    if (!hasExtras) return null;
    return { ...(candidate as DB), version: DB_VERSION } as DB;
  }

  return null;
}

/** Shape check for anything claiming to be a current DlaiLog database. */
export function isValidDB(value: unknown): value is DB {
  return migrateDB(value) !== null;
}

export function parseDB(raw: string | null): DB | null {
  if (!raw) return null;
  try {
    return migrateDB(JSON.parse(raw) as unknown);
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
