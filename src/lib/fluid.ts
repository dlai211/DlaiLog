/**
 * Sizes that keep their proportions as the window changes.
 *
 * DlaiLog is a web app, and it should look like the same design at any window
 * width — not a fixed-pixel layout that snaps between sizes (and changes shape
 * when the browser is zoomed). Every size here is written as a CSS
 * `clamp(min, preferred, max)` whose middle value is a share of the viewport
 * width, so the whole interface grows and shrinks together, with a floor and a
 * ceiling so nothing becomes unreadable or oversized.
 *
 * `DESIGN_WIDTH` is the width the app was drawn at: at exactly that width, a
 * value of `fluid(16)` is the 16px it would have been.
 */
export const DESIGN_WIDTH = 1440;
export const MIN_SCALE = 0.85;
export const MAX_SCALE = 1.25;

/**
 * A size that scales with the window.
 *
 * React Native's type definitions only allow numbers for sizes, while
 * react-native-web happily takes a CSS string — and the whole point here is
 * the CSS string. So a `Fluid` is typed as a number but holds a `clamp(...)`
 * expression at runtime: it can be handed to any style, but never do
 * arithmetic on one (adding two would concatenate text, not add pixels).
 */
export type Fluid = number;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function asFluid(css: string): Fluid {
  return css as unknown as Fluid;
}

/** The CSS text behind a fluid value — for tests and debugging. */
export function fluidText(value: Fluid): string {
  return String(value);
}

/** `fluid(16)` → `clamp(13.6px, 1.111vw, 20px)`. */
export function fluid(designPx: number, options?: { min?: number; max?: number }): Fluid {
  const min = round(options?.min ?? designPx * MIN_SCALE);
  const max = round(options?.max ?? designPx * MAX_SCALE);
  const preferred = round((designPx / DESIGN_WIDTH) * 100);
  return asFluid(`clamp(${min}px, ${preferred}vw, ${max}px)`);
}

/** A ceiling that also keeps a margin on narrow windows: `min(1180px, 92vw)`. */
export function fluidMax(designPx: number, shareOfWidth = 92): Fluid {
  return asFluid(`min(${designPx}px, ${shareOfWidth}vw)`);
}

/**
 * The same curve as the numbers, for the places React Native needs a number
 * rather than a CSS string (SVG icon sizes, for instance). The clamped ends
 * match `fluid()`'s, so text and icons stay in step.
 */
export function scaleForWidth(width: number): number {
  if (!width) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / DESIGN_WIDTH));
}
