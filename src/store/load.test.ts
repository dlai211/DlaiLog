/**
 * What the app opens with (PRD §32).
 *
 * The device's copy and the cloud are both stood in for here, so the decision
 * itself is what is under test: which one wins, what happens when the cloud
 * cannot be reached, and the one-time move of data saved before the cloud
 * existed.
 */

jest.mock('@/store/cloud', () => ({
  __state: { enabled: true, cloud: [] as unknown[], fetchError: null as string | null, uploadError: null as string | null },
  isCloudEnabled: () => (jest.requireMock('@/store/cloud') as { __state: FakeState }).__state.enabled,
  fetchAll: () => {
    const state = (jest.requireMock('@/store/cloud') as { __state: FakeState }).__state;
    if (state.fetchError) return Promise.reject(new Error(state.fetchError));
    return Promise.resolve(state.cloud);
  },
  uploadAll: (rows: unknown) => {
    const state = (jest.requireMock('@/store/cloud') as { __state: FakeState }).__state;
    state.uploaded = rows;
    if (state.uploadError) return Promise.reject(new Error(state.uploadError));
    return Promise.resolve();
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as cloudModule from '@/store/cloud';
import { loadDatabase } from '@/store/load';
import { dbToRows, TABLE_NAMES, type RowSet } from '@/store/rows';
import { buildSampleDB } from '@/store/sample-data';
import { emptyDB, isEmptyDB, type DB } from '@/store/types';
import { loadDB, saveDB, STORAGE_KEY } from '@/store/storage';

interface FakeState {
  enabled: boolean;
  cloud: unknown[];
  fetchError: string | null;
  uploadError: string | null;
  uploaded?: unknown;
}

const mock = (cloudModule as unknown as { __state: FakeState }).__state;

/** A RowSet of the given tables, all others empty. */
function rowSet(partial: Partial<RowSet>): RowSet {
  const rows = Object.fromEntries(TABLE_NAMES.map((table) => [table, []])) as unknown as RowSet;
  return { ...rows, ...partial };
}

const sample = buildSampleDB();

beforeEach(async () => {
  mock.enabled = true;
  mock.cloud = [];
  mock.fetchError = null;
  mock.uploadError = null;
  mock.uploaded = undefined;
  await saveDB(emptyDB());
});

describe('with no cloud in this build', () => {
  it('opens the device copy, exactly as before', async () => {
    mock.enabled = false;
    await saveDB(sample);

    const result = await loadDatabase();
    expect(result.source).toBe('local');
    expect(result.db.tasks).toHaveLength(sample.tasks.length);
    expect(result.warning).toBeUndefined();
  });

  it('does not reach for the cloud at all', async () => {
    mock.enabled = false;
    mock.fetchError = 'should never be called';
    await expect(loadDatabase()).resolves.toMatchObject({ source: 'local' });
  });
});

describe('with a cloud that has the data', () => {
  it('opens the cloud copy', async () => {
    mock.cloud = dbToRows(sample) as unknown as unknown[];

    const result = await loadDatabase();
    expect(result.source).toBe('cloud');
    expect(result.db.tasks).toHaveLength(sample.tasks.length);
  });

  it('keeps the device copy in step, so the app opens without a network', async () => {
    mock.cloud = dbToRows(sample) as unknown as unknown[];
    await loadDatabase();

    const cached: DB | null = await loadDB();
    expect(cached?.tasks).toHaveLength(sample.tasks.length);
  });

  it('prefers the cloud even when the device holds something else', async () => {
    await saveDB(sample);
    mock.cloud = dbToRows({ ...sample, tasks: [] }) as unknown as unknown[];

    const result = await loadDatabase();
    expect(result.source).toBe('cloud');
    expect(result.db.tasks).toHaveLength(0);
  });
});

describe('the first launch after the switch', () => {
  it('uploads the copy already on the device when the cloud is empty', async () => {
    await saveDB(sample);
    mock.cloud = [];

    const result = await loadDatabase();

    expect(result.source).toBe('local');
    expect(result.db.tasks).toHaveLength(sample.tasks.length);
    expect(mock.uploaded).toEqual(dbToRows(sample));
  });

  it('carries on with the device copy when that upload fails', async () => {
    await saveDB(sample);
    mock.uploadError = 'network unreachable';

    const result = await loadDatabase();

    // Nothing is lost: the data is still on the device, and the next save
    // tries again.
    expect(result.db.tasks).toHaveLength(sample.tasks.length);
    expect(result.warning).toMatch(/network unreachable/);
    expect(result.warning).toMatch(/safe here/i);
  });

  it('does not upload anything when the cloud already has data', async () => {
    await saveDB(sample);
    mock.cloud = dbToRows(sample) as unknown as unknown[];

    await loadDatabase();
    expect(mock.uploaded).toBeUndefined();
  });

  it('does not upload an empty device copy', async () => {
    await saveDB(emptyDB());
    expect(isEmptyDB(emptyDB())).toBe(true);
    mock.cloud = [];

    const result = await loadDatabase();
    expect(result.source).toBe('cloud');
    expect(mock.uploaded).toBeUndefined();
  });
});

describe('when the cloud cannot be reached', () => {
  it('falls back to the device copy rather than opening empty', async () => {
    await saveDB(sample);
    mock.fetchError = 'Failed to fetch';

    const result = await loadDatabase();

    expect(result.source).toBe('local');
    expect(result.db.tasks).toHaveLength(sample.tasks.length);
    expect(result.warning).toMatch(/Failed to fetch/);
    expect(result.warning).toMatch(/saved on this device/i);
  });

  it('still opens, empty, when there is nothing on the device either', async () => {
    mock.fetchError = 'Failed to fetch';
    const result = await loadDatabase();
    expect(result.db).toEqual(emptyDB());
    expect(result.warning).toBeDefined();
  });

  it('does not treat an unreachable cloud as an empty one', async () => {
    // The dangerous confusion: a failed read must never look like "the cloud
    // is empty", or the device's copy would be uploaded over real data.
    await saveDB(sample);
    mock.fetchError = 'Failed to fetch';

    await loadDatabase();
    expect(mock.uploaded).toBeUndefined();
  });
});

describe('the device copy itself', () => {
  it('is used when nothing was ever saved', async () => {
    // A fresh install: no stored data at all.
    await AsyncStorage.removeItem(STORAGE_KEY);

    mock.cloud = [];
    const result = await loadDatabase();
    expect(result.db).toEqual(emptyDB());
  });
});
