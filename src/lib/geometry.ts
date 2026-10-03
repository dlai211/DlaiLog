export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Whether a release point landed on a drop target (window coordinates). */
export function isPointInsideRect(x: number, y: number, rect: Rect | null): boolean {
  if (!rect) return false;
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** Fits a width×height box inside `max` on its longest side, keeping the ratio. */
export function fitWithin(
  width: number,
  height: number,
  max: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: max, height: max };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
