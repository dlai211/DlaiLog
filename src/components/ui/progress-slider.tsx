import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Rounds to the nearest multiple of `step`, clamped to 0–100. */
export function snapToStep(value: number, step = 5): number {
  return Math.max(0, Math.min(100, Math.round(value / step) * step));
}

/** Turns a tap/drag x-position into a 0–100 value; null while width is unknown. */
export function valueFromTap(locationX: number, trackWidth: number, step = 5): number | null {
  if (!Number.isFinite(locationX) || trackWidth <= 0) return null;
  return snapToStep((locationX / trackWidth) * 100, step);
}

/**
 * The project progress control (PRD §5.3): drag or click anywhere on the bar,
 * or nudge with − / + in steps of 5%.
 */
export function ProgressSlider({
  value,
  onChange,
  step = 5,
  testID = 'progress-slider',
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const handleGesture = (event: GestureResponderEvent) => {
    const next = valueFromTap(event.nativeEvent.locationX, trackWidth, step);
    if (next !== null && next !== value) onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Button
        label="−"
        variant="secondary"
        testID={`${testID}-decrease`}
        onPress={() => onChange(snapToStep(value - step, step))}
      />
      <View
        testID={testID}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: value }}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleGesture}
        onResponderMove={handleGesture}
        style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[styles.fill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: theme.primary }]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${Math.max(0, Math.min(100, value))}%`,
              backgroundColor: theme.primary,
              borderColor: theme.background,
            },
          ]}
        />
      </View>
      <Button
        label="+"
        variant="secondary"
        testID={`${testID}-increase`}
        onPress={() => onChange(snapToStep(value + step, step))}
      />
      <ThemedText type="smallBold" style={styles.percent} testID={`${testID}-value`}>
        {Math.round(value)}%
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  fill: {
    height: 12,
    borderRadius: 6,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginLeft: -9,
  },
  percent: {
    minWidth: 44,
    textAlign: 'right',
  },
});
