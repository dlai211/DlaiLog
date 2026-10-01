/**
 * The DlaiLog design system.
 *
 * Two palettes, one mood: earthy, calm, low-contrast surfaces with a muted
 * sage-and-terracotta accent pair. Light mode is built from the client's
 * palette — cream #FBF3D5, pale sage #D6DAC8, muted sage-blue #9CAFAA and
 * terracotta rose #D6A99D — on clean white cards with dark, warm text.
 * Dark mode mirrors it: deep green-charcoal surfaces with the same accents
 * lifted just enough to read.
 *
 * Conventions used across the app:
 *   - Cards use dashed borders (`theme.border`), inputs and buttons use solid
 *     ones, so the two line styles read as two different kinds of edge.
 *   - `primary` fills are dark enough for `primaryText` to sit on them.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Text
    text: '#33382F',
    textSecondary: '#5E6A5F',
    textTertiary: '#8A9384',

    // Surfaces
    background: '#FBF3D5', // cream
    backgroundElement: '#FFFDF6', // clean white cards
    backgroundSelected: '#EFE7C9',
    surfaceMuted: '#D6DAC8', // pale sage

    // Lines & hover
    border: '#C4BFA4', // warm grey-sage, used for dashed card edges
    borderStrong: '#9CAFAA', // muted sage, used for solid edges
    hover: '#F3EBD4',

    // Actions
    primary: '#5C7268', // deep muted sage — carries white text
    primaryText: '#FBF3D5',
    accent: '#B5735F', // terracotta rose
    accentText: '#FBF3D5',
    danger: '#A8442F',
    dangerText: '#9C3F2B',
    successText: '#4F7A5A',

    // Categories (PRD §2.3): condiment amber-clay, grocery sage, misc blue-grey
    condiment: '#A8734A',
    grocery: '#4F7A5A',
    misc: '#5B7288',

    shadow: 'rgba(51, 56, 47, 0.14)',
  },
  dark: {
    // Text
    text: '#EFEAD8',
    textSecondary: '#B4B8A8',
    textTertiary: '#8A8F80',

    // Surfaces
    background: '#1F2220', // deep green-charcoal
    backgroundElement: '#282C29',
    backgroundSelected: '#333834',
    surfaceMuted: '#2E332F',

    // Lines & hover
    border: '#3E443F',
    borderStrong: '#55605A',
    hover: '#2E332F',

    // Actions
    primary: '#93AEA4', // lifted sage — carries dark text
    primaryText: '#1F2220',
    accent: '#D6A99D',
    accentText: '#1F2220',
    danger: '#D4776A',
    dangerText: '#E39A8E',
    successText: '#9CC0A6',

    // Categories
    condiment: '#D8A97F',
    grocery: '#9CC0A6',
    misc: '#A3BACF',

    shadow: 'rgba(0, 0, 0, 0.45)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 6,
  medium: 10,
  large: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1100;

/** Shared motion values, so every transition in the app feels like one system. */
export const Motion = {
  fast: 120,
  normal: 220,
  slow: 320,
} as const;
