/**
 * The cloud layer, exercised against a stand-in for Supabase.
 *
 * What is worth testing here is not that Supabase works — that was checked
 * against the live database — but that DlaiLog asks it for the right things:
 * every table read, the changes sent as one upsert and one delete, and a
 * failure turned into a message someone could act on.
 */

interface Call {
  table: string;
  op: 'select' | 'upsert' | 'delete';
  rows?: unknown[];
  ids?: string[];
  idsOn?: string;
}

interface FakeState {
  calls: Call[];
  configured: boolean;
  /** The table that should answer with an error, if any. */
  failOn: string | null;
  data: Record<string, unknown[]>;
  errorMessage: string;
  errorDetails: string | null;
}

jest.mock('@/lib/supabase', () => {
  const state: FakeState = {
    calls: [],
    configured: true,
    failOn: null,
    data: {},
    errorMessage: 'permission denied',
    errorDetails: 'the details',
  };

  const failure = () => ({ message: state.errorMessage, details: state.errorDetails });

  const client = {
    from(table: string) {
      return {
        select: () => {
          state.calls.push({ table, op: 'select' });
          if (state.failOn === table) return Promise.resolve({ data: null, error: failure() });
          return Promise.resolve({ data: state.data[table] ?? [], error: null });
        },
        upsert: (rows: unknown[]) => {
          state.calls.push({ table, op: 'upsert', rows });
          if (state.failOn === table) return Promise.resolve({ error: failure() });
          return Promise.resolve({ error: null });
        },
        delete: () => ({
          in: (column: string, ids: string[]) => {
            state.calls.push({ table, op: 'delete', ids, idsOn: column });
            if (state.failOn === table) return Promise.resolve({ error: failure() });
            return Promise.resolve({ error: null });
          },
        }),
      };
    },
  };

  return {
    __state: state,
    getSupabase: () => client,
    isSupabaseConfigured: () => state.configured,
  };
});

import * as supabaseModule from '@/lib/supabase';
import { applyDiff, fetchAll, isCloudEnabled, uploadAll } from '@/store/cloud';
import { diffRows, type RowDiff } from '@/store/diff';
import { dbToRows, TABLE_NAMES } from '@/store/rows';
import { buildSampleDB } from '@/store/sample-data';

const state = (supabaseModule as unknown as { __state: FakeState }).__state;

/** The cloud flag the test setup turns off is turned back on for this file. */
const originalNoCloud = process.env.EXPO_PUBLIC_DLAILOG_NO_CLOUD;

beforeEach(() => {
  state.calls = [];
  state.configured = true;
  state.failOn = null;
  state.data = {};
  state.errorMessage = 'permission denied';
  state.errorDetails = 'the details';
  delete process.env.EXPO_PUBLIC_DLAILOG_NO_CLOUD;
});

afterAll(() => {
  if (originalNoCloud === undefined) delete process.env.EXPO_PUBLIC_DLAILOG_NO_CLOUD;
  else process.env.EXPO_PUBLIC_DLAILOG_NO_CLOUD = originalNoCloud;
});

describe('isCloudEnabled', () => {
  it('is on when the project is configured', () => {
    expect(isCloudEnabled()).toBe(true);
  });

  it('is off when the project is not configured', () => {
    state.configured = false;
    expect(isCloudEnabled()).toBe(false);
  });

  it('is off when the build says so, whatever else is true', () => {
    process.env.EXPO_PUBLIC_DLAILOG_NO_CLOUD = '1';
    expect(isCloudEnabled()).toBe(false);
  });
});

describe('fetchAll', () => {
  it('reads every table', async () => {
    await fetchAll();
    expect(state.calls.map((call) => call.table).sort()).toEqual([...TABLE_NAMES].sort());
    expect(state.calls.every((call) => call.op === 'select')).toBe(true);
  });

  it('assembles the tables into one set of rows', async () => {
    state.data = { tasks: [{ id: 'a' }], meals: [{ id: 'b' }] };
    const rows = await fetchAll();

    expect(rows.tasks).toEqual([{ id: 'a' }]);
    expect(rows.meals).toEqual([{ id: 'b' }]);
    expect(rows.notes).toEqual([]);
  });

  it('treats an empty table as an empty list, not as a failure', async () => {
    const rows = await fetchAll();
    for (const table of TABLE_NAMES) expect(rows[table]).toEqual([]);
  });

  it('names the table that failed', async () => {
    state.failOn = 'purchases';
    await expect(fetchAll()).rejects.toThrow(/purchases/);
  });

  it('passes on everything the database said, so it can be acted on', async () => {
    state.failOn = 'tasks';
    state.errorMessage = 'relation does not exist';
    state.errorDetails = 'the table is missing';
    await expect(fetchAll()).rejects.toThrow(/relation does not exist — the table is missing/);
  });

  it('still says something useful when the database gives no reason', async () => {
    // Found in the live run: the client can reject with an error carrying no
    // message at all, and "Could not save: undefined" tells nobody anything.
    state.failOn = 'tasks';
    state.errorMessage = undefined as unknown as string;
    state.errorDetails = null;
    await expect(fetchAll()).rejects.toThrow(/the database gave no reason/);
  });
});

/**
 * A difference touching one table and nothing else. The rows here are only
 * ids — this file is about what gets *sent*, and the real row shapes are
 * `rows.test.ts`'s business — so the one cast lives here rather than being
 * repeated at every call.
 */
function diffWith(
  table: (typeof TABLE_NAMES)[number],
  change: { upsert?: string[]; remove?: string[] },
): RowDiff {
  const empty = Object.fromEntries(
    TABLE_NAMES.map((name) => [name, { upsert: [], remove: [] }]),
  ) as unknown as RowDiff;

  return {
    ...empty,
    [table]: {
      upsert: (change.upsert ?? []).map((id) => ({ id })),
      remove: change.remove ?? [],
    },
  } as RowDiff;
}

describe('applyDiff', () => {
  it('sends nothing at all when nothing changed', async () => {
    await applyDiff(diffWith('tasks', {}));
    expect(state.calls).toEqual([]);
  });

  it('sends added and edited rows as a single upsert', async () => {
    await applyDiff(diffWith('tasks', { upsert: ['a', 'b'] }));

    expect(state.calls).toEqual([{ table: 'tasks', op: 'upsert', rows: [{ id: 'a' }, { id: 'b' }] }]);
  });

  it('deletes removed rows by id, in one call', async () => {
    await applyDiff(diffWith('shopping', { remove: ['x', 'y'] }));

    expect(state.calls).toEqual([
      { table: 'shopping', op: 'delete', ids: ['x', 'y'], idsOn: 'id' },
    ]);
  });

  it('does both for a table that gained and lost rows', async () => {
    await applyDiff(diffWith('notes', { upsert: ['new'], remove: ['old'] }));
    expect(state.calls.map((call) => call.op)).toEqual(['upsert', 'delete']);
  });

  it('names the table that failed, and says whether it was a write or a delete', async () => {
    state.failOn = 'inventory';
    await expect(applyDiff(diffWith('inventory', { upsert: ['a'] }))).rejects.toThrow(/save "inventory"/);
    await expect(applyDiff(diffWith('inventory', { remove: ['a'] }))).rejects.toThrow(
      /remove from "inventory"/,
    );
  });

  it('stops rather than carrying on after a failure', async () => {
    // Half-writing a change would leave the cloud in a state the app never
    // intended, so the first failure ends the attempt.
    state.failOn = 'tasks';
    await expect(applyDiff(diffWith('tasks', { upsert: ['a'] }))).rejects.toThrow();
    expect(state.calls.every((call) => call.table === 'tasks')).toBe(true);
  });

  it('does not stop before reaching the tables that come after a clean one', async () => {
    // The opposite of the test above: an untouched table in the middle must
    // not cut the run short.
    await applyDiff(diffWith('shopping', { upsert: ['a'] }));
    expect(state.calls).toEqual([
      { table: 'shopping', op: 'upsert', rows: [{ id: 'a' }] },
    ]);
  });
});

describe('uploadAll', () => {
  it('sends every row of a whole database', async () => {
    const rows = dbToRows(buildSampleDB());
    await uploadAll(rows);

    const writes = state.calls.filter((call) => call.op === 'upsert');
    for (const table of TABLE_NAMES) {
      const call = writes.find((entry) => entry.table === table);
      expect(call?.rows).toEqual(rows[table]);
    }
    expect(state.calls.some((call) => call.op === 'delete')).toBe(false);
  });
});

describe('the round trip through a fake cloud', () => {
  it('produces no changes when a just-loaded database is saved back', async () => {
    // The end-to-end version of the property the diff relies on, with the
    // network in the middle.
    const original = dbToRows(buildSampleDB());
    state.data = original as unknown as Record<string, unknown[]>;

    const loaded = await fetchAll();
    expect(diffRows(original, loaded)).toEqual(
      Object.fromEntries(TABLE_NAMES.map((table) => [table, { upsert: [], remove: [] }])),
    );
  });
});
