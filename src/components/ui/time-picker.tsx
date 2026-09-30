import { StyleSheet, View } from 'react-native';

import { Select } from '@/components/ui/select';
import { pad2 } from '@/lib/dates';
import { Spacing } from '@/constants/theme';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: pad2(hour),
  label: pad2(hour),
}));

const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: pad2(index * 5),
  label: pad2(index * 5),
}));

/** Hour + minute dropdowns for an optional task time. */
export function TimePicker({
  value,
  onChange,
  testID = 'time-picker',
}: {
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}) {
  const [hour, minute] = value.split(':');

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.column}>
        <Select
          label="Hour"
          value={hour}
          options={HOUR_OPTIONS}
          onChange={(nextHour) => onChange(`${nextHour}:${minute}`)}
          testID={`${testID}-hour`}
        />
      </View>
      <View style={styles.column}>
        <Select
          label="Minute"
          value={minute}
          options={MINUTE_OPTIONS}
          onChange={(nextMinute) => onChange(`${hour}:${nextMinute}`)}
          testID={`${testID}-minute`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  column: {
    flex: 1,
  },
});
