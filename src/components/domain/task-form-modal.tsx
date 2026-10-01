import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-field';
import { AppModal } from '@/components/ui/modal';
import { TimePicker } from '@/components/ui/time-picker';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Task } from '@/store/types';

export interface TaskFormValues {
  title: string;
  date: string;
  time?: string;
  note?: string;
}

/**
 * The add/edit pop-up for a task (PRD §5.1). Time is optional, behind a
 * "Set time" toggle.
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
  const [time, setTime] = useState(initial?.time ?? '09:00');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }
    onSubmit({
      title: trimmed,
      date,
      time: withTime ? time : undefined,
      note: note.trim() || undefined,
    });
  };

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

      <DatePicker label="Date" value={date} onChange={setDate} testID="task-date" />

      <View style={styles.toggleRow}>
        <Pressable
          testID="task-time-toggle"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: withTime }}
          onPress={() => setWithTime((value) => !value)}
          style={[
            styles.checkbox,
            { borderColor: withTime ? theme.primary : theme.border },
            withTime && { backgroundColor: theme.primary },
          ]}>
          {withTime ? (
            <ThemedText type="caption" style={{ color: theme.primaryText }}>
              ✓
            </ThemedText>
          ) : null}
        </Pressable>
        <ThemedText type="small">Set time</ThemedText>
      </View>

      {withTime ? <TimePicker value={time} onChange={setTime} testID="task-time" /> : null}

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
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
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
