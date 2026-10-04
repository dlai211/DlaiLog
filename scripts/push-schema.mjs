#!/usr/bin/env node
/**
 * Applies the SQL files in `supabase/migrations/` to the live Supabase
 * database (PRD §32, Phase 2).
 *
 *   node scripts/push-schema.mjs          apply every migration in order
 *   node scripts/push-schema.mjs --check  report what is there, change nothing
 *
 * This is the one script that uses the database password, which it reads from
 * the git-ignored `.env.migration`. Nothing in the app itself ever sees it —
 * the app talks to Supabase through its REST API with the publishable key.
 *
 * Two things about the connection are unusual, and both are deliberate:
 *
 *   * It uses the pooler host (`<provider>-0-<region>.pooler.supabase.com`)
 *     rather than the direct `db.<ref>.supabase.co` one, because the direct
 *     host is IPv6-only and many home networks — this one included — have no
 *     IPv6 route at all.
 *
 *   * It pins Supabase's own root certificate (`scripts/supabase-ca.crt`)
 *     instead of switching certificate verification off, which is the common
 *     workaround and would mean sending the database password over a
 *     connection we had told ourselves not to verify.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const ROOT = join(import.meta.dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const CA_PATH = join(ROOT, 'scripts', 'supabase-ca.crt');

// Node can load the file itself, so the script can simply be run.
try {
  process.loadEnvFile(join(ROOT, '.env.migration'));
} catch {
  // No file — fall back to variables already in the environment (CI, say).
}

const checkOnly = process.argv.includes('--check');

function connectionConfig() {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const region = process.env.SUPABASE_DB_REGION;

  const missing = [
    ['SUPABASE_PROJECT_REF', ref],
    ['SUPABASE_DB_PASSWORD', password],
    ['SUPABASE_DB_REGION', region],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(', ')}. Copy the details from the Supabase ` +
        'dashboard into `.env.migration` (see `.env.migration` for the shape).',
    );
  }

  return {
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${ref}`,
    password,
    database: 'postgres',
    ssl: { ca: readFileSync(CA_PATH, 'utf8'), rejectUnauthorized: true },
  };
}

/** The tables this schema is expected to create, and what to say about each. */
const EXPECTED_TABLES = [
  'tasks',
  'notes',
  'projects',
  'purchases',
  'inventory',
  'meals',
  'shopping',
];

async function report(client) {
  const { rows } = await client.query(
    `select table_name, (select count(*) from information_schema.columns c
                          where c.table_name = t.table_name
                            and c.table_schema = 'public') as columns
       from information_schema.tables t
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`,
  );

  const found = new Map(rows.map((r) => [r.table_name, Number(r.columns)]));
  console.log('\n  Tables in the public schema:');
  for (const table of EXPECTED_TABLES) {
    const columns = found.get(table);
    console.log(
      columns
        ? `    ✓ ${table.padEnd(10)} ${columns} columns`
        : `    ✗ ${table.padEnd(10)} MISSING`,
    );
  }

  const extra = rows
    .map((r) => r.table_name)
    .filter((name) => !EXPECTED_TABLES.includes(name));
  if (extra.length > 0) console.log(`    (also present: ${extra.join(', ')})`);

  return EXPECTED_TABLES.every((table) => found.has(table));
}

async function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (files.length === 0) throw new Error(`No .sql files in ${MIGRATIONS_DIR}`);

  const client = new Client(connectionConfig());
  await client.connect();
  console.log(`Connected to ${client.host} (certificate verified).`);

  try {
    if (checkOnly) {
      const ok = await report(client);
      process.exitCode = ok ? 0 : 1;
      return;
    }

    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`Applying ${file} … `);
      // One transaction per file: a migration that fails half way through
      // leaves nothing behind, rather than a partly-created schema.
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('commit');
        console.log('done');
      } catch (error) {
        await client.query('rollback');
        console.log('FAILED — rolled back');
        throw error;
      }
    }

    const ok = await report(client);
    if (!ok) {
      console.error('\nThe schema applied but some tables are missing.');
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
