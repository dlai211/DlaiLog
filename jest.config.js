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
    ...(preset.moduleNameMapper ?? {}),
    '\\.(css|sass|scss)$': '<rootDir>/src/test/style-mock.js',
  },
};
