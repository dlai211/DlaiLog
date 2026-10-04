import {
  dbToRows,
  rowToIngredient,
  rowToMeal,
  rowToNote,
  rowToProject,
  rowToPurchase,
  rowToShopping,
  rowToTask,
  rowsToDb,
  type IngredientRow,
  type MealRow,
  type ProjectRow,
  type PurchaseRow,
  type TaskRow,
} from '@/store/rows';
import { buildSampleDB } from '@/store/sample-data';
import type { DB, Ingredient, Meal, Project, Purchase, Task } from '@/store/types';

/**
 * The property that the whole cloud layer rests on: a record that goes up and
 * comes back must be **identical**. If it is not, every save would notice a
 * difference that nobody made and rewrite rows forever.
 *
 * `buildSampleDB` is used as the source of realistic records rather than
 * hand-written ones, because it is written the way the app writes.
 */
/**
 * The app treats an empty list and an absent one as the same thing, and the
 * database cannot tell them apart — a `doneDates: []` and a task with no
 * `doneDates` are both stored as an empty array. Dropping empty lists from
 * both sides is therefore how the two are compared fairly, and it is the only
 * licence this file takes.
 */
function withoutEmptyLists<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      Array.isArray(item) && item.length === 0 ? undefined : item,
    ),
  ) as T;
}

describe('a record survives a trip through the database', () => {
  const db = buildSampleDB();

  it('leaves the rows themselves untouched, so nothing looks edited', () => {
    // This is the invariant the cloud depends on: the diff compares rows, so
    // as long as they come back identical, loading never triggers a write
    // that nobody made.
    const rows = dbToRows(db);
    expect(dbToRows(rowsToDb(rows))).toEqual(rows);
  });

  it('settles at once, so a second trip cannot change anything either', () => {
    const settled = rowsToDb(dbToRows(db));
    expect(rowsToDb(dbToRows(settled))).toEqual(settled);
  });

  it('carries every record across with its values intact', () => {
    const back = rowsToDb(dbToRows(db));
    expect(withoutEmptyLists(back)).toEqual(withoutEmptyLists(db));

    // Guard against the sample data quietly emptying out and the assertion
    // above passing on nothing at all.
    const rows = dbToRows(db);
    for (const table of Object.keys(rows) as (keyof typeof rows)[]) {
      expect(rows[table].length).toBeGreaterThan(0);
    }
  });
});

describe('the one thing the database cannot represent', () => {
  it('reads an empty list back as an absent one, and keeps it that way', () => {
    // Worth stating plainly: `doneDates: []` does not survive as `[]`, because
    // a task with no completions and a task whose completions are empty are
    // the same task. Every part of the app reads it through `?? []`, so this
    // is invisible — but it is why the comparison above allows for it.
    const task: Task = {
      id: 't1',
      title: 'Yoga',
      date: '2026-10-04',
      done: false,
      doneDates: [],
      createdAt: '2026-10-04T00:00:00.000Z',
    };
    const db = { ...buildSampleDB(), tasks: [task] };

    const row = dbToRows(db).tasks[0];
    expect(row.done_dates).toEqual([]);
    expect(rowToTask(row).doneDates).toBeUndefined();

    // The row it writes the second time is the same row — which is the point.
    expect(dbToRows({ ...db, tasks: [rowToTask(row)] }).tasks[0]).toEqual(row);
  });
});

describe('fields the app leaves out become null, and come back left out', () => {
  it('writes an absent optional field as an explicit null', () => {
    const task: Task = { id: 't1', title: 'Thing', date: '2026-10-04', done: false, createdAt: '2026-10-04T00:00:00.000Z' };
    const row = dbToRows({ ...buildSampleDB(), tasks: [task] }).tasks[0];

    // Explicitly null rather than missing: an absent key would tell the
    // database "leave this column alone", which would make clearing a field
    // impossible.
    expect(row.time).toBeNull();
    expect(row.note).toBeNull();
    expect(row.end_time).toBeNull();
    expect(row.repeat_days).toBeNull();
    expect(row.repeat_until).toBeNull();
  });

  it('reads a null back as absent rather than as null', () => {
    const row: TaskRow = {
      id: 't1',
      title: 'Thing',
      date: '2026-10-04',
      time: null,
      end_time: null,
      note: null,
      done: false,
      repeat_days: null,
      repeat_until: null,
      done_dates: [],
      created_at: '2026-10-04T00:00:00.000Z',
    };
    const task = rowToTask(row);

    expect(task.time).toBeUndefined();
    expect(task.note).toBeUndefined();
    expect(task.repeat).toBeUndefined();
    expect(task.doneDates).toBeUndefined();
    expect('time' in task).toBe(true); // the key may exist; its value is absent
  });
});

describe('timestamps', () => {
  it("reads PostgreSQL's spelling back as the app's", () => {
    const row: TaskRow = {
      id: 't1',
      title: 'Thing',
      date: '2026-10-04',
      time: null,
      end_time: null,
      note: null,
      done: false,
      repeat_days: null,
      repeat_until: null,
      done_dates: [],
      // What PostgREST actually returns: microseconds and a +00:00 offset.
      created_at: '2026-10-04T20:13:11.380076+00:00',
    };
    expect(rowToTask(row).createdAt).toBe('2026-10-04T20:13:11.380Z');
  });

  it('leaves a timestamp the app already wrote alone', () => {
    const stamp = '2026-10-04T20:13:11.380Z';
    const task: Task = { id: 't1', title: 'Thing', date: '2026-10-04', done: false, createdAt: stamp };
    expect(dbToRows({ ...buildSampleDB(), tasks: [task] }).tasks[0].created_at).toBe(stamp);
  });
});

describe('the repeating-task fields', () => {
  const base: Task = {
    id: 't1',
    title: 'Yoga',
    date: '2026-10-04',
    done: false,
    createdAt: '2026-10-04T00:00:00.000Z',
  };

  it('keeps the weekdays of a repeating task, in order', () => {
    const task: Task = { ...base, repeat: { days: [4, 2], until: '2026-12-31' }, doneDates: ['2026-10-06'] };
    const row = dbToRows({ ...buildSampleDB(), tasks: [task] }).tasks[0];

    expect(row.repeat_days).toEqual([4, 2]);
    expect(row.repeat_until).toBe('2026-12-31');
    expect(row.done_dates).toEqual(['2026-10-06']);
    expect(rowToTask(row).repeat).toEqual({ days: [2, 4], until: '2026-12-31' });
  });

  it('treats a pattern with no days as no pattern at all', () => {
    // The app already reads it that way (`repeat.days.length === 0` never
    // comes back), so storing it as a pattern would only create a difference
    // to write on every save.
    const row: TaskRow = {
      id: 't1',
      title: 'Yoga',
      date: '2026-10-04',
      time: null,
      end_time: null,
      note: null,
      done: false,
      repeat_days: [],
      repeat_until: null,
      done_dates: [],
      created_at: '2026-10-04T00:00:00.000Z',
    };
    expect(rowToTask(row).repeat).toBeUndefined();
  });
});

describe('the other lists', () => {
  it('keeps a project', () => {
    const project: Project = {
      id: '1f0a5c2e-1111-4222-8333-444455556666',
      name: 'Kitchen',
      status: 'in-progress',
      progress: 40,
      createdAt: '2026-10-04T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    };
    const row = { ...(dbToRows({ ...buildSampleDB(), projects: [project] }).projects[0] as ProjectRow) };
    expect(rowToProject(row)).toEqual(project);
  });

  it('keeps money as a number, never a string', () => {
    const purchase: Purchase = {
      id: '2f0a5c2e-1111-4222-8333-444455556666',
      date: '2026-10-03',
      itemName: 'Milk',
      category: 'grocery',
      amount: 1.75,
      unit: 'L',
      totalPrice: 4.29,
      savings: 0.5,
      store: 'Albertsons',
      createdAt: '2026-10-03T00:00:00.000Z',
    };
    const row = { ...(dbToRows({ ...buildSampleDB(), purchases: [purchase] }).purchases[0] as PurchaseRow) };

    const back = rowToPurchase(row);
    expect(typeof back.totalPrice).toBe('number');
    expect(back.totalPrice).toBe(4.29);
    expect(back.savings).toBe(0.5);
    expect(back).toEqual(purchase);
  });

  it('keeps a pantry item and what a full bar means', () => {
    const item: Ingredient = {
      id: '3f0a5c2e-1111-4222-8333-444455556666',
      name: 'Eggs',
      key: 'eggs',
      category: 'grocery',
      quantity: 9,
      unit: 'pcs',
      capacity: 30,
      createdAt: '2026-10-04T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    };
    const row = { ...(dbToRows({ ...buildSampleDB(), inventory: [item] }).inventory[0] as IngredientRow) };
    expect(rowToIngredient(row)).toEqual(item);
  });

  it('keeps a meal, including the ingredients inside it', () => {
    const meal: Meal = {
      id: '4f0a5c2e-1111-4222-8333-444455556666',
      name: 'Congee',
      ingredients: [{ id: 'x', name: 'Rice', key: 'rice', amount: 1, unit: 'kg' }],
      steps: 'Simmer.',
      createdAt: '2026-10-04T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    };
    const row = { ...(dbToRows({ ...buildSampleDB(), meals: [meal] }).meals[0] as MealRow) };
    expect(rowToMeal(row)).toEqual(meal);
  });

  it('survives a meal whose ingredients are not a list at all', () => {
    // A hand-edited row should not be able to break the screen.
    const row = { id: 'm1', name: 'Congee', ingredients: 'oops', steps: '', created_at: '2026-10-04T00:00:00.000Z', updated_at: '2026-10-04T00:00:00.000Z' } as unknown as MealRow;
    expect(rowToMeal(row).ingredients).toEqual([]);
  });

  it('keeps a shopping line with no amount', () => {
    const row = {
      id: 's1',
      name: 'Milk',
      key: 'milk',
      amount: null,
      unit: null,
      source: 'manual' as const,
      source_label: null,
      done: false,
      created_at: '2026-10-04T00:00:00.000Z',
    };
    expect(rowToShopping(row)).toEqual({
      id: 's1',
      name: 'Milk',
      key: 'milk',
      amount: undefined,
      unit: undefined,
      source: 'manual',
      sourceLabel: undefined,
      done: false,
      createdAt: '2026-10-04T00:00:00.000Z',
    });
  });

  it('keeps a note', () => {
    const row = { id: 'n1', text: 'Buy stamps', created_at: '2026-10-04T00:00:00.000Z' };
    expect(rowToNote(row)).toEqual({ id: 'n1', text: 'Buy stamps', createdAt: '2026-10-04T00:00:00.000Z' });
  });
});

describe('records saved before ids were UUIDs', () => {
  // Ids used to be `id-…` when the runtime had no `crypto.randomUUID`, which
  // PostgreSQL rejects outright (`22P02`). Those records must still be able to
  // sync, so their id is converted on the way to the database.
  const LEGACY = 'id-muuau264-wl8l4ss9';
  const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  const legacyDb: DB = {
    ...buildSampleDB(),
    tasks: [
      { id: LEGACY, title: 'Old task', date: '2026-10-04', done: false, createdAt: '2026-10-04T00:00:00.000Z' },
    ],
    notes: [{ id: 'id-note-1', text: 'Old note', createdAt: '2026-10-04T00:00:00.000Z' }],
  };

  it('gives every one of them an id the database accepts', () => {
    const rows = dbToRows(legacyDb);
    expect(rows.tasks[0].id).toMatch(UUID_SHAPE);
    expect(rows.notes[0].id).toMatch(UUID_SHAPE);
    expect(rows.tasks[0].id).not.toBe(LEGACY);
  });

  it('does not disturb the records that were already fine', () => {
    const rows = dbToRows(legacyDb);
    // Everything except the two replaced above came from the sample data,
    // which uses real UUIDs.
    expect(rows.purchases[0].id).toBe(legacyDb.purchases[0].id);
  });

  it('converts the same way every time, so saving changes nothing', () => {
    // The important one: the app works out what to write by comparing records
    // against the last saved version. A conversion that differed between
    // passes would delete and re-insert an untouched row on every save.
    const first = dbToRows(legacyDb);
    const second = dbToRows(legacyDb);
    expect(second).toEqual(first);
  });

  it('survives a trip through the database without changing again', () => {
    const rows = dbToRows(legacyDb);
    // Once converted, the id is a UUID, so the next pass leaves it alone.
    expect(dbToRows(rowsToDb(rows))).toEqual(rows);
  });

  it('keeps two legacy records apart', () => {
    const rows = dbToRows({
      ...legacyDb,
      notes: [
        { id: 'id-note-1', text: 'One', createdAt: '2026-10-04T00:00:00.000Z' },
        { id: 'id-note-2', text: 'Two', createdAt: '2026-10-04T00:00:00.000Z' },
      ],
    });
    expect(rows.notes[0].id).not.toBe(rows.notes[1].id);
  });
});
