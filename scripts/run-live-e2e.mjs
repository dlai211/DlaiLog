#!/usr/bin/env node
/**
 * Runs the live browser tests against the real Supabase project
 * (`npm run test:live`).
 *
 * These are the only tests that touch the real database, so they are asked
 * for by name and left out of `npm run test:e2e`. This wrapper does the two
 * things they need, both awkward to express as a shell command:
 *
 *   - it reads `.env`, so the project's details come from the file rather than
 *     the shell (and stay out of the shell history);
 *   - it sets `DLAILOG_LIVE_TESTS`, which un-skips them. Writing that as
 *     `VAR=… npm run` would work in one shell and not another.
 */

import { spawnSync } from 'node:child_process';

try {
  process.loadEnvFile('.env');
} catch {
  console.error('No `.env` file. Copy `.env.example` to `.env` and fill it in.');
  process.exit(1);
}

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  console.error('`.env` is missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  process.exit(1);
}

const live = { ...process.env, DLAILOG_LIVE_TESTS: '1' };

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Building the web app…');
run('npx', ['expo', 'export', '--platform', 'web']);

console.log('\nRunning the live tests against Supabase…');
run('npx', ['playwright', 'test', 'e2e/live.spec.ts'], live);
