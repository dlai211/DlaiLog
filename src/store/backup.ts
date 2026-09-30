import { Platform } from 'react-native';

import { isValidDB } from '@/store/storage';
import { DB, DB_VERSION } from '@/store/types';

/**
 * Backup files (PRD §7.2) are the whole database wrapped with a small header,
 * so a stray JSON file can never be mistaken for a DlaiLog backup.
 *
 * This is the one file that touches the browser's DOM directly — everything
 * web-specific is at the bottom and degrades gracefully elsewhere, so a future
 * phone version only needs to swap these two functions.
 */

export const BACKUP_APP_ID = 'dlailog';

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  data: DB;
}

export type ParseBackupResult = { ok: true; db: DB } | { ok: false; error: string };

export function buildBackup(db: DB, exportedAt: string = new Date().toISOString()): BackupFile {
  return { app: BACKUP_APP_ID, version: DB_VERSION, exportedAt, data: db };
}

/** `dlailog-backup-2026-09-30.json` */
export function backupFilename(exportedAt: string = new Date().toISOString()): string {
  return `dlailog-backup-${exportedAt.slice(0, 10)}.json`;
}

export function serializeBackup(db: DB): string {
  return JSON.stringify(buildBackup(db), null, 2);
}

const CATEGORIES = new Set(['condiment', 'grocery', 'misc']);
const UNITS = new Set(['ml', 'L', 'g', 'kg', 'pcs', 'pack']);
const STATUSES = new Set(['not-started', 'in-progress', 'done']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Checks that every record inside a backup is complete enough for the screens
 * to render. Returns the problem in plain words, or null when all is well.
 */
export function validateRecords(db: DB): string | null {
  for (const task of db.tasks) {
    if (!isRecord(task) || typeof task.id !== 'string' || typeof task.title !== 'string' || typeof task.date !== 'string') {
      return 'a task is missing its title or date';
    }
  }

  for (const note of db.notes) {
    if (!isRecord(note) || typeof note.id !== 'string' || typeof note.text !== 'string') {
      return 'a note is missing its text';
    }
  }

  for (const project of db.projects) {
    if (
      !isRecord(project) ||
      typeof project.id !== 'string' ||
      typeof project.name !== 'string' ||
      typeof project.progress !== 'number' ||
      !STATUSES.has(String(project.status))
    ) {
      return 'a project is missing its name, status or progress';
    }
  }

  for (const purchase of db.purchases) {
    if (
      !isRecord(purchase) ||
      typeof purchase.id !== 'string' ||
      typeof purchase.itemName !== 'string' ||
      typeof purchase.date !== 'string' ||
      typeof purchase.amount !== 'number' ||
      typeof purchase.totalPrice !== 'number' ||
      !CATEGORIES.has(String(purchase.category)) ||
      !UNITS.has(String(purchase.unit))
    ) {
      return 'a purchase is missing its name, amount, price, category or unit';
    }
  }

  return null;
}

/**
 * Reads a backup file's text. Anything that is not a complete, current
 * DlaiLog backup is refused with a human explanation — the app's existing
 * data is never touched.
 */
export function parseBackupFile(text: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not a DlaiLog backup — it is not valid JSON.' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'That file is not a DlaiLog backup.' };
  }

  const candidate = parsed as Partial<BackupFile>;

  if (candidate.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'That file was not created by DlaiLog.' };
  }

  if (candidate.version !== DB_VERSION) {
    return {
      ok: false,
      error: `That backup is from a different version of DlaiLog (version ${String(candidate.version)}).`,
    };
  }

  if (!isValidDB(candidate.data)) {
    return { ok: false, error: 'That backup is damaged — its data is incomplete.' };
  }

  const problem = validateRecords(candidate.data);
  if (problem) {
    return { ok: false, error: `That backup is damaged — ${problem}.` };
  }

  return { ok: true, db: candidate.data };
}

// ---------------------------------------------------------------------------
// Browser file access (web only)
// ---------------------------------------------------------------------------

/** Hands a text file to the browser's downloader. False when not in a browser. */
export function downloadTextFile(filename: string, text: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;

  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}

/** Opens the browser's file picker and reads the chosen file as text. */
export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result ?? '') });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };

    input.click();
  });
}
