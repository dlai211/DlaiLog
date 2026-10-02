import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-field';
import { AppModal } from '@/components/ui/modal';
import { TimePicker } from '@/components/ui/time-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRepeatDays, formatShortDate, formatTimeRange } from '@/lib/format';
import { fluid } from '@/lib/fluid';
import type { Task, TaskRepeat } from '@/store/types';

export interface TaskFormValues {
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  note?: string;
  repeat?: TaskRepeat;
}

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Sunday-first, matching how `Date.getDay()` and `TaskRepeat.days` count. */
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];

/**
 * The add/edit pop-up for a task (PRD §5.1). Time is optional, behind a
 * "Set time" toggle; a weekly repeat — e.g. every Tuesday and Thursday,
 * 12:00–14:00, until December — sits behind "Repeats weekly".
 */
export function TaskFormModal({
  visible,
  initial,
  initialDate,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial?: Task | null;
  /** The day a new task lands on — whatever day the calendar is showing. */
  initialDate: string;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}) {
  return (
    <AppModal
      visible={visible}
      title={initial ? 'Edit task' : 'New task'}
      onClose={onClose}
      testID="task-form">
      {visible ? (
        <TaskForm
          key={initial?.id ?? `new-${initialDate}`}
          initial={initial ?? null}
          initialDate={initialDate}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </AppModal>
  );
}

function TaskForm({
  initial,
  initialDate,
  onCancel,
  onSubmit,
}: {
  initial: Task | null;
  initialDate: string;
  onCancel: () => void;
  onSubmit: (values: TaskFormValues) => void;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? initialDate);
  const [withTime, setWithTime] = useState(Boolean(initial?.time));
  const [time, setTime] = useState(initial?.time ?? '12:00');
  const [withEnd, setWithEnd] = useState(Boolean(initial?.endTime));
  const [endTime, setEndTime] = useState(initial?.endTime ?? '14:00');
  const [note, setNote] = useState(initial?.note ?? '');

  const [repeats, setRepeats] = useState(Boolean(initial?.repeat));
  const [days, setDays] = useState<number[]>(initial?.repeat?.days ?? []);
  const [withUntil, setWithUntil] = useState(Boolean(initial?.repeat?.until));
  const [until, setUntil] = useState(initial?.repeat?.until ?? '');

  const [error, setError] = useState<string | undefined>(undefined);
  const [repeatError, setRepeatError] = useState<string | undefined>(undefined);

  const toggleRepeat = () => {
    setRepeats((current) => {
      const next = !current;
      // Default to the day the task starts on — the common case is "this day,
      // every week", and it can be adjusted from there.
      if (next && days.length === 0) {
        setDays([weekdayIndex(date)]);
      }
      return next;
    });
    setRepeatError(undefined);
  };

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort()
    );
    setRepeatError(undefined);
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }

    if (repeats) {
      if (days.length === 0) {
        setRepeatError('Pick at least one day.');
        return;
      }
      if (withUntil && until && until < date) {
        setRepeatError('The end date is before the start date.');
        return;
      }
    }

    onSubmit({
      title: trimmed,
      date,
      time: withTime ? time : undefined,
      endTime: withTime && withEnd ? endTime : undefined,
      note: note.trim() || undefined,
      repeat: repeats
        ? { days: [...days].sort(), until: withUntil && until ? until : undefined }
        : undefined,
    });
  };

  const summary = repeats
    ? [
        formatRepeatDays(days),
        withTime ? formatTimeRange(time, withEnd ? endTime : undefined) : null,
        withUntil && until ? `until ${formatShortDate(until)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <View style={styles.form}>
      <FormField
        label="Title"
        required
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          if (error) setError(undefined);
        }}
        placeholder="e.g. Call supplier"
        error={error}
        testID="task-title-input"
        onSubmitEditing={handleSubmit}
      />

      <DatePicker
        label={repeats ? 'Starts on' : 'Date'}
        value={date}
        onChange={(next) => {
          setDate(next);
          setRepeatError(undefined);
        }}
        testID="task-date"
      />

      <CheckRow
        label="Set time"
        checked={withTime}
        onToggle={() => setWithTime((value) => !value)}
        testID="task-time-toggle"
      />

      {withTime ? (
        <View style={styles.timeBlock}>
          <View style={styles.timeColumn}>
            <ThemedText type="label" themeColor="textSecondary">
              From
            </ThemedText>
            <TimePicker value={time} onChange={setTime} testID="task-time" />
          </View>

          {withEnd ? (
            <View style={styles.timeColumn}>
              <View style={styles.endHeader}>
                <ThemedText type="label" themeColor="textSecondary">
                  To
                </ThemedText>
                <Button
                  label="Remove"
                  variant="ghost"
                  onPress={() => setWithEnd(false)}
                  testID="task-end-remove"
                />
              </View>
              <TimePicker value={endTime} onChange={setEndTime} testID="task-end-time" />
            </View>
          ) : (
            <Button
              label="+ Add an end time"
              variant="ghost"
              onPress={() => setWithEnd(true)}
              testID="task-end-add"
            />
          )}
        </View>
      ) : null}

      <CheckRow
        label="Repeats weekly"
        checked={repeats}
        onToggle={toggleRepeat}
        testID="task-repeat-toggle"
      />

      {repeats ? (
        <View
          style={[
            styles.repeatBlock,
            { borderColor: theme.border, backgroundColor: theme.backgroundSelected },
          ]}>
          <ThemedText type="label" themeColor="textSecondary">
            On these days
          </ThemedText>

          <View style={styles.dayRow}>
            {DAY_ORDER.map((day) => (
              <Pressable
                key={day}
                testID={`task-day-${day}`}
                accessibilityRole="button"
                accessibilityLabel={`Repeat on ${WEEKDAY_NAMES[day]}`}
                accessibilityState={{ selected: days.includes(day) }}
                onPress={() => toggleDay(day)}
                style={[
                  styles.dayToggle,
                  { borderColor: theme.border },
                  days.includes(day) && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}>
                <ThemedText
                  type="caption"
                  style={{ color: days.includes(day) ? theme.primaryText : theme.textSecondary }}>
                  {DAY_LETTERS[day]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <CheckRow
            label="Set an end date"
            checked={withUntil}
            onToggle={() => {
              setWithUntil((value) => !value);
              if (!until) setUntil(date);
            }}
            testID="task-until-toggle"
          />

          {withUntil ? (
            <DatePicker
              label="Repeats until"
              value={until || date}
              onChange={setUntil}
              testID="task-until"
            />
          ) : null}

          {repeatError ? (
            <ThemedText type="small" themeColor="dangerText" testID="task-repeat-error">
              {repeatError}
            </ThemedText>
          ) : null}

          {summary ? (
            <ThemedText type="caption" themeColor="textTertiary" testID="task-repeat-summary">
              {summary}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <FormField
        label="Note"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Optional details"
        testID="task-note"
      />

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} testID="task-cancel" />
        <Button
          label={initial ? 'Save changes' : 'Add task'}
          variant="primary"
          onPress={handleSubmit}
          testID="task-save"
        />
      </View>
    </View>
  );
}

/** `Date.getDay()` for a `YYYY-MM-DD` key, without the timezone traps of `Date.parse`. */
function weekdayIndex(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

/** A labelled checkbox row — used for the three optional extras in this form. */
function CheckRow({
  label,
  checked,
  onToggle,
  testID,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testID: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.toggleRow}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
        onPress={onToggle}
        style={[
          styles.checkbox,
          { borderColor: checked ? theme.primary : theme.border },
          checked && { backgroundColor: theme.primary },
        ]}>
        {checked ? (
          <ThemedText type="caption" style={{ color: theme.primaryText }}>
            ✓
          </ThemedText>
        ) : null}
      </Pressable>
      <ThemedText type="small">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: fluid(22),
    height: fluid(22),
    borderRadius: Radius.small,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBlock: {
    gap: Spacing.two,
    paddingLeft: Spacing.three,
  },
  timeColumn: {
    gap: Spacing.one,
  },
  endHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  repeatBlock: {
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  dayRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  dayToggle: {
    width: fluid(34),
    height: fluid(34),
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
