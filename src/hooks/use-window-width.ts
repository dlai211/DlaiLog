import { useWindowDimensions } from 'react-native';

/**
 * The current window width. Kept in its own hook so tests can pretend the
 * window is wide or narrow without touching React Native internals.
 */
export function useWindowWidth(): number {
  return useWindowDimensions().width;
}
