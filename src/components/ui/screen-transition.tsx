import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { Motion } from '@/constants/theme';

/**
 * Fades and lifts a screen into place when it is opened. The shell remounts
 * this (by key) on every navigation, so each page arrives the same way.
 */
export function ScreenTransition({ children }: { children: ReactNode }) {
  // State, not a ref — the animated value is read while rendering (see the
  // note in modal.tsx).
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: Motion.normal,
      // The web has no native driver; asking for one there logs a warning.
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress]);

  return (
    <Animated.View
      testID="screen-transition"
      style={[
        styles.wrap,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}>
      <View style={styles.inner}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  inner: {
    width: '100%',
    // The vertical rhythm every screen shares: header, then its sections.
    gap: 24,
  },
});
