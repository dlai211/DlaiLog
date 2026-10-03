const preset = require('jest-expo/jest-preset');

/**
 * Jest configuration for DlaiLog.
 *
 * We start from the official `jest-expo` preset (which already understands
 * React Native, Expo modules and the `@/*` path alias from tsconfig.json)
 * and only add:
 *   - our test setup file (AsyncStorage mock),
 *   - a stub for CSS imports (`global.css`, `*.module.css`), which the
 *     React Native preset does not understand.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    // Must come before the preset's `@/*` rule: tsconfig (and the bundler)
    // also map `@/assets/*` to the project's own assets folder, and Jest's
    // mapper takes the first pattern that matches.
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    ...(preset.moduleNameMapper ?? {}),
    '\\.(css|sass|scss)$': '<rootDir>/src/test/style-mock.js',
  },
  // The e2e/ folder holds Playwright browser tests, which run separately
  // (`npm run test:e2e`) — Jest must not try to execute them.
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist/', '/.expo/'],
};
