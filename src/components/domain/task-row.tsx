import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { RowActions } from '@/components/ui/row-actions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRepeatDays, formatShortDate, formatTimeRange } from '@/lib/format';
import { fluid } from '@/lib/fluid';
import type { TaskOccurrence } from '@/store/selectors';

/**
 * One task line: checkbox, optional time, title (and note), edit/delete.
 * Shared by the To-do Day view and the Home "Today's Plan" card.
 *
 * A row shows one day's *appearance* of a task: a repeating task appears on
 * each of its days, and each day is ticked off on its own.
 */
export function TaskRow({
  occurrence,
  onToggle,
  onEdit,
  onDelete,
  showDate = false,
}: {
  occurrence: TaskOccurrence;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Shows the day this appearance falls on — used for the Overdue group. */
  showDate?: boolean;
}) {
  const theme = useTheme();
  const { task, done, date, repeating } = occurrence;

  return (
    <View style={styles.row} testID={`task-row-${task.id}`}>
      <Pressable
        testID={`task-check-${task.id}`}
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark ${task.title} on ${date} as ${done ? 'not done' : 'done'}`}
        accessibilityState={{ checked: done }}
        onPress={onToggle}
        style={[
          styles.checkbox,
          { borderColor: done ? theme.primary : theme.border },
          done && { backgroundColor: theme.primary },
        ]}>
        {done ? (
          <ThemedText type="caption" style={{ color: theme.primaryText }}>
            ✓
          </ThemedText>
        ) : null}
      </Pressable>

      {task.time ? (
        <Chip
          label={formatTimeRange(task.time, task.endTime)}
          color={repeating ? theme.accent : undefined}
          selected={repeating}
          testID={`task-time-${task.id}`}
        />
      ) : null}

      <View style={styles.body}>
        <ThemedText
          type="small"
          testID={`task-title-${task.id}`}
          style={done ? [styles.doneText, { color: theme.textTertiary }] : undefined}>
          {task.title}
        </ThemedText>

        {task.note ? (
          <ThemedText type="caption" themeColor="textTertiary">
            {task.note}
          </ThemedText>
        ) : null}

        {repeating ? (
          <View style={styles.repeatLine} testID={`task-repeat-${task.id}`}>
            <Icon name="repeat" size={12} color={theme.accent} />
            <ThemedText type="caption" style={{ color: theme.accent }}>
              {task.repeat?.until
                ? `${formatRepeatDays(task.repeat.days)} · until ${formatShortDate(task.repeat.until)}`
                : formatRepeatDays(task.repeat?.days ?? [])}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {showDate ? (
        <ThemedText type="caption" themeColor="dangerText" testID={`task-date-${task.id}`}>
          {formatShortDate(date)}
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
    width: fluid(22),
    height: fluid(22),
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  repeatLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
});
