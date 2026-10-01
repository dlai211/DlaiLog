import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CORRUPT_STORAGE_KEY,
  STORAGE_KEY,
  isValidDB,
  loadDB,
  parseDB,
  saveDB,
} from '@/store/storage';
import { emptyDB, type Task } from '@/store/types';

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
