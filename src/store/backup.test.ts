import {
  backupFilename,
  buildBackup,
  downloadTextFile,
  parseBackupFile,
  pickTextFile,
  serializeBackup,
  validateRecords,
} from '@/store/backup';
import { emptyDB, type DB } from '@/store/types';

const sampleDB: DB = {
  ...emptyDB(),
  tasks: [
    { id: 't1', title: 'Buy paint', date: '2026-09-30', done: false, createdAt: '2026-09-30T08:00:00.000Z' },
  ],
  notes: [{ id: 'n1', text: 'Call plumber', createdAt: '2026-09-30T08:00:00.000Z' }],
  projects: [
    {
      id: 'p1',
      name: 'DlaiLog website',
      status: 'in-progress',
      progress: 40,
      createdAt: '2026-09-30T08:00:00.000Z',
      updatedAt: '2026-09-30T08:00:00.000Z',
    },
  ],
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

describe('buildBackup / backupFilename / serializeBackup', () => {
  it('wraps the database with an identifying header', () => {
    const backup = buildBackup(sampleDB, '2026-09-30T12:00:00.000Z');

    expect(backup).toMatchObject({ app: 'dlailog', version: 3, exportedAt: '2026-09-30T12:00:00.000Z' });
    expect(backup.data).toEqual(sampleDB);
  });

  it('names the file after the export date', () => {
    expect(backupFilename('2026-09-30T12:00:00.000Z')).toBe('dlailog-backup-2026-09-30.json');
  });

  it('round-trips every record type through text', () => {
    expect(parseBackupFile(serializeBackup(sampleDB))).toEqual({ ok: true, db: sampleDB });
  });

  it('round-trips an empty database too', () => {
    expect(parseBackupFile(serializeBackup(emptyDB()))).toEqual({ ok: true, db: emptyDB() });
  });
});

describe('parseBackupFile refusals', () => {
  function expectRefusal(text: string, messagePart: string) {
    const result = parseBackupFile(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(messagePart);
    }
  }

  it('refuses a file that is not JSON', () => {
    expectRefusal('this is not a backup at all', 'not valid JSON');
  });

  it('refuses JSON that is not a DlaiLog backup', () => {
    expectRefusal(JSON.stringify({ hello: 'world' }), 'not created by DlaiLog');
    expectRefusal('null', 'not a DlaiLog backup');
    expectRefusal('"just a string"', 'not a DlaiLog backup');
  });

  it('refuses a backup from a different version', () => {
    expectRefusal(
      JSON.stringify({ app: 'dlailog', version: 99, exportedAt: 'x', data: emptyDB() }),
      'different version'
    );
  });

  it('still restores a backup written before recurring tasks existed (version 2)', () => {
    // Version 2's header, with a version-2 database inside — the same records
    // as today's, minus the optional repeat fields.
    const older = { ...sampleDB, version: 2 as const };
    const result = parseBackupFile(
      JSON.stringify({ app: 'dlailog', version: 2, exportedAt: 'x', data: older })
    );

    expect(result).toEqual({ ok: true, db: { ...sampleDB, version: 3 } });
  });

  it('refuses a backup with missing sections', () => {
    expectRefusal(
      JSON.stringify({ app: 'dlailog', version: 1, exportedAt: 'x', data: { version: 1, tasks: [] } }),
      'damaged'
    );
  });

  it('refuses a backup with a broken record', () => {
    const broken = {
      ...sampleDB,
      purchases: [{ ...sampleDB.purchases[0], totalPrice: 'six forty five' }],
    };
    expectRefusal(
      JSON.stringify({ app: 'dlailog', version: 1, exportedAt: 'x', data: broken }),
      'damaged'
    );
  });
});

describe('validateRecords', () => {
  it('accepts a complete database', () => {
    expect(validateRecords(sampleDB)).toBeNull();
    expect(validateRecords(emptyDB())).toBeNull();
  });

  it('names the first problem it finds', () => {
    expect(
      validateRecords({ ...emptyDB(), tasks: [{ ...sampleDB.tasks[0], title: 42 as unknown as string }] })
    ).toBe('a task is missing its title or date');

    expect(
      validateRecords({ ...emptyDB(), purchases: [{ ...sampleDB.purchases[0], unit: 'furlong' as never }] })
    ).toBe('a purchase is missing its name, amount, price, category or unit');

    expect(
      validateRecords({ ...emptyDB(), projects: [{ ...sampleDB.projects[0], status: 'nope' as never }] })
    ).toBe('a project is missing its name, status or progress');
  });
});

describe('browser file helpers outside a browser', () => {
  it('report that a download is unavailable instead of throwing', () => {
    expect(downloadTextFile('backup.json', '{}')).toBe(false);
  });

  it('resolve to null when there is no file picker to open', async () => {
    await expect(pickTextFile()).resolves.toBeNull();
  });
});
