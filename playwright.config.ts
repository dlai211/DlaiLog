import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real exported web build, in a real browser.
 * Run `npx expo export --platform web` first (npm run test:e2e does both).
 */
export default defineConfig({
  testDir: './e2e',
  // `live.spec.ts` is the one spec that writes to the real Supabase project,
  // so it is left out unless it is asked for by name (`npm run test:live`).
  // Everything else runs against the device alone and can be run any time.
  testIgnore: process.env.DLAILOG_LIVE_TESTS === '1' ? [] : ['**/live.spec.ts'],
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node e2e/static-server.mjs dist 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
