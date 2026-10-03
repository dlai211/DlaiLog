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

/**
 * The wider earthy palette: one accent per module, plus a few spare hues for
 * statistics and charts. All of them sit in the same muted, sun-bleached
 * family as the core palette, and each has a dark-mode version lifted just
 * enough to read on the dark surfaces.
 */
export const Accents = {
  light: {
    sage: '#5C7268',
    mint: '#4F7A5A',
    rose: '#B5735F',
    bloom: '#B76E86',
    clay: '#B07C42',
    sand: '#A98B45',
    olive: '#6E7F44',
    sky: '#55738F',
    plum: '#7A5F82',
  },
  dark: {
    sage: '#93AEA4',
    mint: '#9CC0A6',
    rose: '#D6A99D',
    bloom: '#DE9FB4',
    clay: '#D8A97F',
    sand: '#D6BE7E',
    olive: '#B4C68A',
    sky: '#9FBBD6',
    plum: '#C0A3C4',
  },
} as const;

export type AccentName = keyof typeof Accents.light;

/** A translucent version of a colour, for soft fills behind text and icons. */
export function soft(hex: string, alpha = '1f'): string {
  return `${hex}${alpha}`;
}

/** The hex colour of a module's accent. */
export function accentHex(name: AccentName, scheme: 'light' | 'dark'): string {
  return Accents[scheme][name];
}

/** One accent per screen: the colour that screen's headings and tiles wear. */
export const SCREEN_ACCENTS = {
  home: 'sage',
  todo: 'sky',
  projects: 'clay',
  meals: 'bloom',
  inventory: 'olive',
  spending: 'plum',
  grocery: 'sand',
} as const satisfies Record<string, AccentName>;

export type ScreenName = keyof typeof SCREEN_ACCENTS;

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

/**
 * The spacing scale, in plain numbers.
 *
 * These are deliberately fixed: React Native only accepts real numbers for
 * sizes (a CSS string like `'1.2vw'` crashes Android with "String cannot be
 * cast to Double"), and a layout that shrinks with the window leaves a small
 * cluster of content beside a large empty one. Responsiveness is handled where
 * it belongs instead — the shell keeps a fixed sidebar and a centred, capped
 * content column, and rows wrap when they run out of room.
 *
 * `oneHalf` and `twoHalf` are the in-between steps the layouts use (6 and 10).
 */
export const Spacing = {
  half: 2,
  one: 4,
  oneHalf: 6,
  two: 8,
  twoHalf: 10,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 6,
  medium: 10,
  large: 16,
  /** Fully round. */
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * The width the content column stops growing at. Past this the column stays
 * centred instead of stretching text lines across a very wide display.
 */
export const MaxContentWidth = 1400;

/** The sidebar's width, open and compacted. Fixed, so the labels stay legible. */
export const SidebarWidth = 248;
export const SidebarRailWidth = 84;

/** Shared motion values, so every transition in the app feels like one system. */
export const Motion = {
  fast: 120,
  normal: 220,
  slow: 320,
} as const;
