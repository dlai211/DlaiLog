import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AppModal } from '@/components/ui/modal';
import { MonthGrid } from '@/components/ui/month-grid';
import { Spacing } from '@/constants/theme';
import { monthKeyOf, monthKeyParts, todayKey } from '@/lib/dates';
import { formatLongDate, formatMonthTitle } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

/**
 * A field that opens a month calendar to pick a day.
 *
 * The month being viewed is *derived*: it starts from the selected date
 * (or today) every time the calendar opens, and month navigation is kept in
 * separate state that resets when the calendar closes.
 */
export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  testID = 'date-picker',
}: {
  label?: string;
  value: string | null;
  onChange: (key: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [viewOverride, setViewOverride] = useState<{ year: number; monthIndex: number } | null>(
    null
  );

  const today = todayKey();
  const baseView = monthKeyParts(monthKeyOf(value ?? today));
  const view = viewOverride ?? baseView;

  const close = () => {
    setOpen(false);
    setViewOverride(null);
  };

  const shiftMonth = (delta: number) => {
    setViewOverride(() => {
      const shifted = new Date(view.year, view.monthIndex + delta, 1);
      return { year: shifted.getFullYear(), monthIndex: shifted.getMonth() };
    });
  };

  return (
    <View style={styles.field}>
      {label ? <ThemedText type="label">{label}</ThemedText> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.control,
          { borderColor: theme.border, backgroundColor: theme.background },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="small" themeColor={value ? 'text' : 'textTertiary'}>
          {value ? formatLongDate(value) : placeholder}
        </ThemedText>
        <Icon name="calendar" size={15} color={theme.textTertiary} />
      </Pressable>

      <AppModal
        visible={open}
        title={label ?? 'Pick a date'}
        onClose={close}
        testID={`${testID}-modal`}>
        <View style={styles.calendarHeader}>
          <Button label="◀" variant="secondary" testID={`${testID}-prev`} onPress={() => shiftMonth(-1)} />
          <ThemedText type="smallBold">{formatMonthTitle(view.year, view.monthIndex)}</ThemedText>
          <Button label="▶" variant="secondary" testID={`${testID}-next`} onPress={() => shiftMonth(1)} />
          <Button
            label="Today"
            variant="ghost"
            testID={`${testID}-today`}
            onPress={() => {
              onChange(today);
              close();
            }}
          />
        </View>
        <MonthGrid
          year={view.year}
          monthIndex={view.monthIndex}
          selectedKey={value ?? undefined}
          today={today}
          testID={`${testID}-grid`}
          onSelectDay={(key) => {
            onChange(key);
            close();
          }}
        />
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  control: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
  },
});
