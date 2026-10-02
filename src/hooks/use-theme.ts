/**
 * The colours every screen draws with. Which palette is returned depends on
 * the appearance choice (System / Light / Dark) — see use-theme-preference.
 */

import { Accents, Colors, SCREEN_ACCENTS, type AccentName, type ScreenName } from '@/constants/theme';
import { useThemeScheme } from '@/hooks/use-theme-preference';

export function useTheme() {
  return Colors[useThemeScheme()];
}

/** The wider accent palette for the current theme — see `Accents`. */
export function useAccents(): Record<AccentName, string> {
  return Accents[useThemeScheme()];
}

/** The colour of one screen's accent — see `SCREEN_ACCENTS`. */
export function useScreenAccent(screen: ScreenName): string {
  const accents = useAccents();
  return accents[SCREEN_ACCENTS[screen]];
}
