import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseKey, todayKey, weekStrip } from '@/lib/dates';
import { WEEKDAY_LETTERS } from '@/lib/format';
import { openOccurrenceCounts } from '@/store/selectors';
import type { Task } from '@/store/types';
import { fluid } from '@/lib/fluid';

/**
 * Seven days of the current week with a dot per day that has open tasks.
 * Used at the top of the To-do Day view and on the Home dashboard.
 */
export function WeekStrip({
  anchor,
  tasks,
  onSelectDay,
  testID = 'week-strip',
}: {
  anchor: string;
  tasks: Task[];
  onSelectDay: (key: string) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const today = todayKey();
  const days = weekStrip(anchor);

  // Counts appearances, so a task that repeats into this week shows up on
  // every day it lands on.
  const openCounts = openOccurrenceCounts(tasks, days);

  return (
    <View testID={testID} style={styles.strip}>
      {days.map((key, index) => {
        const selected = key === anchor;
        const isToday = key === today;
        const count = openCounts[key] ?? 0;

        return (
          <Pressable
            key={key}
            testID={`${testID}-day-${key}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelectDay(key)}
            style={[
              styles.day,
              { borderColor: 'transparent' },
              selected && { backgroundColor: theme.backgroundSelected },
              isToday && { borderColor: theme.primary },
            ]}>
            <ThemedText type="caption" themeColor={isToday ? 'primary' : 'textTertiary'}>
              {WEEKDAY_LETTERS[index]}
            </ThemedText>
            <ThemedText type="smallBold" themeColor={isToday ? 'primary' : 'text'}>
              {parseKey(key).getDate()}
            </ThemedText>
            <View
              testID={count > 0 ? `${testID}-dots-${key}` : undefined}
              style={[styles.dot, { backgroundColor: count > 0 ? theme.primary : 'transparent' }]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  dot: {
    width: fluid(5),
    height: fluid(5),
    borderRadius: 3,
  },
});
