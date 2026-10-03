import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { WEEKDAY_LETTERS } from '@/lib/format';
import { monthMatrix, type MonthCell } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';

/**
 * The Monday-first calendar grid. Used twice: as the To-do Month view (with
 * task chips rendered into each day) and inside the date picker.
 */
export function MonthGrid({
  year,
  monthIndex,
  selectedKey,
  today,
  onSelectDay,
  renderDay,
  cellMinHeight = 40,
  testID = 'month-grid',
}: {
  year: number;
  monthIndex: number;
  selectedKey?: string;
  today?: string;
  onSelectDay?: (key: string) => void;
  renderDay?: (cell: MonthCell) => ReactNode;
  cellMinHeight?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const weeks = monthMatrix(year, monthIndex);

  return (
    <View testID={testID} style={styles.grid}>
      <View style={styles.week}>
        {WEEKDAY_LETTERS.map((letter, index) => (
          <View key={`${letter}-${index}`} style={styles.headerCell}>
            <ThemedText type="caption" themeColor="textTertiary">
              {letter}
            </ThemedText>
          </View>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0].key} style={styles.week}>
          {week.map((cell) => {
            const isSelected = selectedKey === cell.key;
            const isToday = today === cell.key;
            return (
              <View
                key={cell.key}
                style={[
                  styles.cell,
                  { minHeight: cellMinHeight, borderColor: theme.border },
                  isSelected && { backgroundColor: theme.backgroundSelected },
                  isToday && { borderColor: theme.primary, borderWidth: 2 },
                ]}>
                {/* Only the day number is a real button: the cell also holds
                    task chips (buttons), and buttons may not nest. */}
                <Pressable
                  testID={`${testID}-day-${cell.key}`}
                  accessibilityRole={onSelectDay ? 'button' : undefined}
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Open day ${cell.key}`}
                  disabled={!onSelectDay}
                  onPress={onSelectDay ? () => onSelectDay(cell.key) : undefined}
                  style={styles.dayNumber}>
                  <ThemedText
                    type={isToday || isSelected ? 'smallBold' : 'small'}
                    themeColor={cell.inMonth ? (isToday ? 'primary' : 'text') : 'textTertiary'}>
                    {cell.dayNumber}
                  </ThemedText>
                </Pressable>
                {renderDay ? <View style={styles.cellContent}>{renderDay(cell)}</View> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    gap: Spacing.one,
  },
  week: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.one,
    gap: Spacing.half,
  },
  dayNumber: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.one,
  },
  cellContent: {
    gap: Spacing.half,
  },
});
