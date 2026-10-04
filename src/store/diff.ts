/**
 * Working out what actually changed between two versions of the data.
 *
 * The app replaces its whole database object on every edit, which is fine in
 * memory but would mean rewriting every table over the network for a single
 * ticked checkbox. Comparing the two versions first turns that into the one
 * or two rows that really moved.
 *
 * The comparison is deliberately on **rows** rather than on the app's records:
 * `dbToRows` has already settled every representation question (an absent
 * field and a null one, a timestamp's spelling, an empty list and a missing
 * one), so two records that mean the same thing always produce identical rows
 * and are correctly seen as unchanged.
 */

import { TABLE_NAMES, type RowSet, type TableName } from '@/store/rows';

/** The rows to write, and the ids to delete, for one table. */
export interface TableDiff<T> {
  /** Rows to insert or update — one call, whichever it turns out to be. */
  upsert: T[];
  /** Ids of rows that are gone. */
  remove: string[];
}

export type RowDiff = {
  [K in TableName]: TableDiff<RowSet[K][number]>;
};

/**
 * Rows are compared by value. Both sides of every comparison come from the
 * same `toRow` function, which builds its keys in a fixed order, so comparing
 * their JSON is a reliable way to ask "is this the same row?" — and unlike a
 * deep-equality walk it cannot be fooled by key order, because there is only
 * ever one order.
 */
function sameRow(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffTable<T extends { id: string }>(before: T[], after: T[]): TableDiff<T> {
  const beforeById = new Map(before.map((row) => [row.id, row]));
  const afterIds = new Set(after.map((row) => row.id));

  const upsert = after.filter((row) => {
    const previous = beforeById.get(row.id);
    return previous === undefined || !sameRow(previous, row);
  });

  const remove = before.filter((row) => !afterIds.has(row.id)).map((row) => row.id);

  return { upsert, remove };
}

/** Everything that differs between two versions of the data. */
export function diffRows(before: RowSet, after: RowSet): RowDiff {
  const diff = {} as RowDiff;
  for (const table of TABLE_NAMES) {
    // Every table's rows carry an `id`, which is what makes one loop enough.
    diff[table] = diffTable(before[table] as { id: string }[], after[table] as { id: string }[]) as never;
  }
  return diff;
}

/** How many rows the diff would write or delete in total. */
export function diffSize(diff: RowDiff): number {
  return TABLE_NAMES.reduce(
    (total, table) => total + diff[table].upsert.length + diff[table].remove.length,
    0,
  );
}

/** True when there is nothing to send — the common case after a plain load. */
export function isEmptyDiff(diff: RowDiff): boolean {
  return diffSize(diff) === 0;
}
