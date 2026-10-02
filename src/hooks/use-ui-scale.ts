import { scaleForWidth } from '@/lib/fluid';
import { useWindowWidth } from '@/hooks/use-window-width';

/**
 * The window's size as a plain multiplier (see lib/fluid). Used where a real
 * number is required — SVG icons and picture tiles are drawn at a size, not in
 * CSS units, so they take their proportion from here.
 */
export function useUiScale(): number {
  return scaleForWidth(useWindowWidth());
}
