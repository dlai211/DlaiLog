import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CORRUPT_STORAGE_KEY,
  STORAGE_KEY,
  isValidDB,
  loadDB,
  migrateDB,
  parseDB,
  saveDB,
} from '@/store/storage';
import { emptyDB, type Task } from '@/store/types';

/** A database exactly as version 1 wrote it: four lists and nothing else. */
function versionOneDatabase() {
  return {
    version: 1,
    tasks: [
      {
        id: 't1',
        title: 'Buy paint',
        date: '2026-09-30',
        done: false,
        createdAt: '2026-09-30T08:00:00.000Z',
      },
    ],
    notes: [],
    projects: [],
    purchases: [
      {
        id: 'pu1',
        date: '2026-09-28',
        itemName: 'Soy sauce',
        icon: '🍜',
        category: 'condiment',
        amount: 1,
        unit: 'L',
        totalPrice: 6.45,
        store: 'Asia Market',
        createdAt: '2026-09-28T10:00:00.000Z',
      },
    ],
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy paint',
    date: '2026-09-30',
    done: false,
    createdAt: '2026-09-30T08:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('isValidDB / parseDB', () => {
  it('accepts a well-formed database', () => {
    expect(isValidDB(emptyDB())).toBe(true);
  });

  it('rejects missing, wrong-version or misshapen data', () => {
    expect(isValidDB(null)).toBe(false);
    expect(isValidDB('hello')).toBe(false);
    expect(isValidDB({})).toBe(false);
    expect(isValidDB({ version: 2, tasks: [], notes: [], projects: [], purchases: [] })).toBe(false);
    expect(isValidDB({ version: 1, tasks: {}, notes: [], projects: [], purchases: [] })).toBe(false);
  });

  it('parses JSON text safely', () => {
    expect(parseDB(null)).toBeNull();
    expect(parseDB('not json at all')).toBeNull();
    expect(parseDB('null')).toBeNull();
    expect(parseDB(JSON.stringify(emptyDB()))).toEqual(emptyDB());
  });
});

describe('loadDB / saveDB', () => {
  it('starts empty when nothing has been saved', async () => {
    await expect(loadDB()).resolves.toEqual(emptyDB());
  });

  it('round-trips a database', async () => {
    const db = { ...emptyDB(), tasks: [makeTask()] };
    await saveDB(db);
    await expect(loadDB()).resolves.toEqual(db);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('keeps unreadable data aside instead of discarding it', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{ this is not valid json');

    await expect(loadDB()).resolves.toEqual(emptyDB());
    expect(await AsyncStorage.getItem(CORRUPT_STORAGE_KEY)).toBe('{ this is not valid json');
  });

  it('does not treat valid JSON of the wrong shape as data', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'world' }));
    await expect(loadDB()).resolves.toEqual(emptyDB());
  });
});

describe('version 1 → 2 migration', () => {
  it('brings an old database forward and adds the new lists', () => {
    const migrated = migrateDB(versionOneDatabase());

    expect(migrated).toMatchObject({ version: 2, inventory: [], meals: [], shopping: [] });
    expect(migrated?.tasks).toHaveLength(1);
    expect(migrated?.purchases[0]).toMatchObject({ itemName: 'Soy sauce', icon: '🍜' });
  });

  it('loads old data from storage without losing anything', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(versionOneDatabase()));

    const db = await loadDB();

    expect(db.version).toBe(2);
    expect(db.tasks).toHaveLength(1);
    expect(db.purchases).toHaveLength(1);
    expect(db.inventory).toEqual([]);
  });

  it('refuses a version it does not know', () => {
    expect(migrateDB({ version: 99, tasks: [], notes: [], projects: [], purchases: [] })).toBeNull();
  });

  it('refuses a version 2 database that is missing its new lists', () => {
    expect(migrateDB({ version: 2, tasks: [], notes: [], projects: [], purchases: [] })).toBeNull();
  });
});
