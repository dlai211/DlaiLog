/**
 * Reading and writing the whole database through Supabase (PRD §32).
 *
 * This is deliberately the thinnest layer in the store: it decides nothing
 * about *what* changed — that is `diff.ts` — and knows nothing about the
 * app's own records — that is `rows.ts`. It reads every table, and applies a
 * difference it has been handed.
 */

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { TABLE_NAMES, type RowSet, type TableName } from '@/store/rows';
import { diffRows, type RowDiff } from '@/store/diff';
import { isCloudDisabledOnThisDevice } from '@/store/storage';

/**
 * Whether this build should keep its data in the cloud at all.
 *
 * Three ways it can be off, and each has a reason:
 *   - the project is not configured, which is a fresh clone with no `.env`;
 *   - the build sets `EXPO_PUBLIC_DLAILOG_NO_CLOUD`, which is how the test
 *     suite stays off the network;
 *   - the device sets `dlailog:no-cloud`, which is how the browser tests run
 *     without writing fixtures into the real database (and how anyone can run
 *     local-only when the cloud is unavailable).
 *
 * With any of them, the app behaves exactly as it did before the cloud
 * existed — which is the point of them.
 */
export function isCloudEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_DLAILOG_NO_CLOUD === '1') return false;
  if (isCloudDisabledOnThisDevice()) return false;
  return isSupabaseConfigured();
}

/**
 * Turns whatever the client rejected with into one line someone can act on.
 *
 * Written defensively on purpose: a failure is exactly when the shape of the
 * error is least certain, and "Could not save: undefined" tells nobody
 * anything. Everything the client offers — the message, the Postgres code,
 * the detail and the hint — is included when it is there.
 */
function describe(error: unknown): string {
  if (error === null || typeof error !== 'object') return String(error);

  const { message, code, details, hint } = error as {
    message?: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
  };

  const parts = [message ?? 'the database gave no reason'];
  if (code) parts.push(`code ${code}`);
  if (details) parts.push(details);
  if (hint) parts.push(`hint: ${hint}`);
  return parts.join(' — ');
}

async function selectAll<K extends TableName>(table: K): Promise<RowSet[K]> {
  const { data, error } = await getSupabase().from(table).select('*');
  if (error) throw new Error(`Could not read "${table}": ${describe(error)}`);
  return (data ?? []) as RowSet[K];
}

/** Every table, read together. */
export async function fetchAll(): Promise<RowSet> {
  const [tasks, notes, projects, purchases, inventory, meals, shopping] = await Promise.all([
    selectAll('tasks'),
    selectAll('notes'),
    selectAll('projects'),
    selectAll('purchases'),
    selectAll('inventory'),
    selectAll('meals'),
    selectAll('shopping'),
  ]);

  return { tasks, notes, projects, purchases, inventory, meals, shopping };
}

/**
 * Sends one table's changes: a single upsert for everything added or edited,
 * and a single delete for everything gone. An upsert is used for both because
 * the alternative — deciding here which rows are new — is a question the
 * database already answers from the primary key, and guessing it would be one
 * more thing to get wrong.
 */
async function applyTable<K extends TableName>(table: K, change: RowDiff[K]): Promise<void> {
  const { upsert, remove } = change;

  if (upsert.length > 0) {
    const { error } = await getSupabase()
      .from(table)
      .upsert(upsert as never[]);
    if (error) throw new Error(`Could not save "${table}": ${describe(error)}`);
  }

  if (remove.length > 0) {
    const { error } = await getSupabase().from(table).delete().in('id', remove);
    if (error) throw new Error(`Could not remove from "${table}": ${describe(error)}`);
  }
}

/** Sends everything that differs between two versions of the data. */
export async function applyDiff(diff: RowDiff): Promise<void> {
  for (const table of TABLE_NAMES) {
    await applyTable(table, diff[table]);
  }
}

/** Nothing, in row form — the "before" side of a first upload. */
const EMPTY_ROWS: RowSet = {
  tasks: [],
  notes: [],
  projects: [],
  purchases: [],
  inventory: [],
  meals: [],
  shopping: [],
};

/**
 * Writes a whole set of rows as if the cloud had been empty — used once, to
 * put the copy already on this device into the new database.
 */
export async function uploadAll(rows: RowSet): Promise<void> {
  await applyDiff(diffRows(EMPTY_ROWS, rows));
}
