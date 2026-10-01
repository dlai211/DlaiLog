import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Reports a 0–100 value; used for project progress (PRD §5.3). */
export function ProgressBar({
  value,
  color,
  height = 8,
  testID,
}: {
  value: number;
  color?: string;
  height?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            height,
            borderRadius: height / 2,
            backgroundColor: color ?? theme.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    minWidth: 0,
  },
});
