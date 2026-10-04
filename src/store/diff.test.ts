import { diffRows, diffSize, isEmptyDiff } from '@/store/diff';
import { dbToRows, rowsToDb, type RowSet } from '@/store/rows';
import { buildSampleDB } from '@/store/sample-data';
import type { DB, Task } from '@/store/types';

/**
 * Real UUIDs, because that is what the app produces and what the database
 * accepts. Anything else is converted on its way out by `rows.ts`, which
 * would make these assertions about something other than what they mean to
 * test.
 */
const TASK_ID = 'a1b2c3d4-0000-4000-8000-000000000001';
const OTHER_ID = 'a1b2c3d4-0000-4000-8000-000000000002';

const base = buildSampleDB();
const rowsOf = (db: DB): RowSet => dbToRows(db);
const withExtraTask = (task: Task): DB => ({ ...base, tasks: [...base.tasks, task] });

function aTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    title: 'Water the plants',
    date: '2026-10-04',
    done: false,
    createdAt: '2026-10-04T09:00:00.000Z',
    ...overrides,
  };
}

describe('nothing changed', () => {
  it('produces an empty difference', () => {
    const diff = diffRows(rowsOf(base), rowsOf(base));
    expect(isEmptyDiff(diff)).toBe(true);
    expect(diffSize(diff)).toBe(0);
  });

  it('produces an empty difference after a trip through the database', () => {
    // The important one. Loading from the cloud and saving it straight back
    // must not write anything at all — a phantom write here would mean every
    // launch rewrote the whole database.
    const loaded = rowsToDb(rowsOf(base));
    expect(isEmptyDiff(diffRows(rowsOf(loaded), rowsOf(loaded)))).toBe(true);
  });
});

describe('a record is added', () => {
  const diff = diffRows(rowsOf(base), rowsOf(withExtraTask(aTask())));

  it('sends exactly that row', () => {
    expect(diff.tasks.upsert).toHaveLength(1);
    expect(diff.tasks.upsert[0].title).toBe('Water the plants');
    expect(diff.tasks.remove).toEqual([]);
  });

  it('leaves every other table alone', () => {
    expect(diff.notes.upsert).toEqual([]);
    expect(diff.purchases.upsert).toEqual([]);
    expect(diff.inventory.upsert).toEqual([]);
    expect(diff.meals.upsert).toEqual([]);
    expect(diff.shopping.upsert).toEqual([]);
  });

  it('counts as one change', () => {
    expect(diffSize(diff)).toBe(1);
  });
});

describe('a record is edited', () => {
  it('sends only the row that was edited', () => {
    const before = withExtraTask(aTask());
    const after: DB = {
      ...before,
      tasks: before.tasks.map((task) => (task.id === TASK_ID ? { ...task, title: 'Water the ferns' } : task)),
    };

    const diff = diffRows(rowsOf(before), rowsOf(after));
    expect(diff.tasks.upsert).toHaveLength(1);
    expect(diff.tasks.upsert[0].title).toBe('Water the ferns');
    expect(diff.tasks.remove).toEqual([]);
  });

  it('notices a field being cleared', () => {
    const before = withExtraTask(aTask({ note: 'the big one by the door' }));
    const after: DB = {
      ...before,
      tasks: before.tasks.map((task) => (task.id === TASK_ID ? { ...task, note: undefined } : task)),
    };

    const diff = diffRows(rowsOf(before), rowsOf(after));
    expect(diff.tasks.upsert).toHaveLength(1);
    // Cleared really means cleared: the row carries an explicit null rather
    // than leaving the column out, which would mean "leave it as it was".
    expect(diff.tasks.upsert[0].note).toBeNull();
  });

  it('notices a field being filled in on a repeating task', () => {
    const before = withExtraTask(aTask({ repeat: { days: [2, 4] } }));
    const after: DB = {
      ...before,
      tasks: before.tasks.map((task) =>
        task.id === TASK_ID ? { ...task, repeat: { days: [2, 4], until: '2026-12-31' } } : task,
      ),
    };

    const diff = diffRows(rowsOf(before), rowsOf(after));
    expect(diff.tasks.upsert).toHaveLength(1);
    expect(diff.tasks.upsert[0].repeat_until).toBe('2026-12-31');
  });
});

describe('a record is removed', () => {
  const diff = diffRows(rowsOf(withExtraTask(aTask())), rowsOf(base));

  it('deletes it by id, and writes nothing else', () => {
    expect(diff.tasks.remove).toEqual([TASK_ID]);
    expect(diff.tasks.upsert).toEqual([]);
  });
});

describe('several things at once', () => {
  it('handles additions and deletions in the same table', () => {
    const before = withExtraTask(aTask());
    const after: DB = { ...before, tasks: [...before.tasks.filter((t) => t.id !== TASK_ID), aTask({ id: OTHER_ID })] };

    const diff = diffRows(rowsOf(before), rowsOf(after));
    expect(diff.tasks.upsert.map((row) => row.id)).toEqual([OTHER_ID]);
    expect(diff.tasks.remove).toEqual([TASK_ID]);
    expect(diffSize(diff)).toBe(2);
  });

  it('spreads changes across tables without confusing them', () => {
    const after: DB = {
      ...withExtraTask(aTask()),
      notes: [...base.notes.slice(1)],
      shopping: base.shopping.slice(0, 1),
    };

    const diff = diffRows(rowsOf(base), rowsOf(after));
    expect(diff.tasks.upsert).toHaveLength(1);
    expect(diff.notes.remove).toEqual([base.notes[0].id]);
    expect(diff.shopping.remove).toHaveLength(base.shopping.length - 1);
    expect(diff.purchases.upsert).toEqual([]);
  });

  it('empties everything when the whole database is cleared', () => {
    const cleared: DB = { ...base, tasks: [], notes: [], projects: [], purchases: [], inventory: [], meals: [], shopping: [] };
    const diff = diffRows(rowsOf(base), rowsOf(cleared));

    expect(diff.tasks.upsert).toEqual([]);
    expect(diff.tasks.remove).toHaveLength(base.tasks.length);
    expect(diff.purchases.remove).toHaveLength(base.purchases.length);
    expect(diffSize(diff)).toBe(
      base.tasks.length +
        base.notes.length +
        base.projects.length +
        base.purchases.length +
        base.inventory.length +
        base.meals.length +
        base.shopping.length,
    );
  });
});
