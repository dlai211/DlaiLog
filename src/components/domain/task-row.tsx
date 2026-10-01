import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { RowActions } from '@/components/ui/row-actions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/lib/format';
import type { Task } from '@/store/types';

/**
 * One task line: checkbox, optional time, title (and note), edit/delete.
 * Shared by the To-do Day view and the Home "Today's Plan" card.
 */
export function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  showDate = false,
}: {
  task: Task;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Shows the task's date — used for the Overdue group, where dates differ. */
  showDate?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row} testID={`task-row-${task.id}`}>
      <Pressable
        testID={`task-check-${task.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        onPress={onToggle}
        style={[
          styles.checkbox,
          { borderColor: task.done ? theme.primary : theme.border },
          task.done && { backgroundColor: theme.primary },
        ]}>
        {task.done ? (
          <ThemedText type="caption" style={{ color: theme.primaryText }}>
            ✓
          </ThemedText>
        ) : null}
      </Pressable>

      {task.time ? <Chip label={task.time} testID={`task-time-${task.id}`} /> : null}

      <View style={styles.body}>
        <ThemedText
          type="small"
          testID={`task-title-${task.id}`}
          style={task.done ? [styles.doneText, { color: theme.textTertiary }] : undefined}>
          {task.title}
        </ThemedText>
        {task.note ? (
          <ThemedText type="caption" themeColor="textTertiary">
            {task.note}
          </ThemedText>
        ) : null}
      </View>

      {showDate ? (
        <ThemedText
          type="caption"
          themeColor="dangerText"
          testID={`task-date-${task.id}`}>
          {formatShortDate(task.date)}
        </ThemedText>
      ) : null}

      <RowActions
        onEdit={onEdit}
        onDelete={onDelete}
        editTestID={onEdit ? `task-edit-${task.id}` : undefined}
        deleteTestID={onDelete ? `task-delete-${task.id}` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
});
