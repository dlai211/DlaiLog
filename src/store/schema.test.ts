/**
 * Keeps the SQL schema and the app's own vocabulary from drifting apart.
 *
 * The migration in `supabase/migrations/` repeats lists the app already
 * knows — the units a purchase may be measured in, the categories an item may
 * belong to. PostgreSQL enforces its copy with a CHECK constraint, so if the
 * two ever disagree the app does not quietly misbehave: it fails at runtime
 * with a database error the moment someone picks the new unit. This test turns
 * that into a failing build instead.
 *
 * Like the React Native compatibility test, this reads the filesystem through
 * Jest's escape hatch — the app's TypeScript settings exclude Node's types on
 * purpose, so the modules it needs are described inline.
 */
interface FileSystem {
  readFileSync(path: string, encoding: string): string;
  readdirSync(path: string): string[];
}

const { readFileSync, readdirSync } = jest.requireActual('node:fs') as FileSystem;

import { CATEGORY_ORDER } from '@/data/categories';
import { UNIT_OPTIONS } from '@/data/units';

const MIGRATIONS_DIR = 'supabase/migrations';

/** Every migration, concatenated — the schema is the sum of all of them. */
function schemaSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(`${MIGRATIONS_DIR}/${name}`, 'utf8'))
    .join('\n');
}

/** Strips `--` comments so prose about SQL never counts as SQL. */
function withoutComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

/** The values of every `column in ('a', 'b', …)` check on the named column. */
function checkedValues(sql: string, column: string): string[][] {
  const pattern = new RegExp(`${column}\\s+in\\s*\\(([^)]*)\\)`, 'g');
  const lists: string[][] = [];
  for (const match of sql.matchAll(pattern)) {
    lists.push([...match[1].matchAll(/'([^']*)'/g)].map((quoted) => quoted[1]));
  }
  return lists;
}

const SQL = withoutComments(schemaSql());

describe('the SQL schema', () => {
  it('defines every list the app stores', () => {
    for (const table of [
      'tasks',
      'notes',
      'projects',
      'purchases',
      'inventory',
      'meals',
      'shopping',
    ]) {
      expect(SQL).toMatch(new RegExp(`create table if not exists ${table}\\b`));
    }
  });

  it('gives every table a uuid primary key with a default', () => {
    const tables = SQL.match(/create table if not exists \w+/g) ?? [];
    expect(tables).toHaveLength(7);
    expect(SQL.match(/id\s+uuid primary key default gen_random_uuid\(\)/g)).toHaveLength(
      tables.length,
    );
  });

  it('leaves Row Level Security off, as Phase 2 decided', () => {
    // Not an oversight — see PRD §32. This fails loudly if someone adds it by
    // habit, because switching it on would lock the app out of its own data
    // (there is no sign-in yet to tell Supabase who is asking).
    expect(SQL).not.toMatch(/enable row level security/i);
  });
});

describe('the unit list', () => {
  it('matches the app exactly', () => {
    const lists = checkedValues(SQL, 'unit');
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      expect([...list].sort()).toEqual([...UNIT_OPTIONS].sort());
    }
  });

  it('is applied to every table that measures something', () => {
    // Adding a unit to one table but forgetting another would let the app
    // offer a unit the database then rejects.
    expect(checkedValues(SQL, 'unit')).toHaveLength(3); // purchases, inventory, shopping
  });
});

describe('the category list', () => {
  it('matches the app exactly, on every table that has one', () => {
    const lists = checkedValues(SQL, 'category');
    expect(lists).toHaveLength(2); // purchases, inventory — a shopping line has none
    for (const list of lists) {
      expect([...list].sort()).toEqual([...CATEGORY_ORDER].sort());
    }
  });
});

describe('the remaining enumerations', () => {
  it('lists the project statuses', () => {
    const [list] = checkedValues(SQL, 'status');
    expect([...list].sort()).toEqual(['done', 'in-progress', 'not-started']);
  });

  it('lists the shopping sources', () => {
    const [list] = checkedValues(SQL, 'source');
    expect([...list].sort()).toEqual(['inventory', 'manual', 'meal']);
  });
});
