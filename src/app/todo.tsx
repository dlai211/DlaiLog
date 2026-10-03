import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TaskFormModal, type TaskFormValues } from '@/components/domain/task-form-modal';
import { TaskRow } from '@/components/domain/task-row';
import { WeekStrip } from '@/components/domain/week-strip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthGrid } from '@/components/ui/month-grid';
import { PageHeader } from '@/components/ui/page-header';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { useScreenAccent, useTheme } from '@/hooks/use-theme';
import { addDays, monthKeyOf, monthKeyParts, shiftMonthKey, todayKey } from '@/lib/dates';
import { formatLongDate, formatMonthTitle, truncate } from '@/lib/format';
import { useData } from '@/store/data-provider';
import {
  doneOccurrencesForDay,
  openOccurrencesByDay,
  openOccurrencesForDay,
  overdueOccurrences,
  type TaskOccurrence,
} from '@/store/selectors';
import type { Task } from '@/store/types';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function TodoScreen() {
  const accent = useScreenAccent('todo');
  const { db, addTask, updateTask, deleteTask, toggleTaskOn } = useData();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();

  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  // The day being viewed lives in the URL (`/todo?date=…`), so Home's week
  // strip and the browser's back button both work naturally.
  const rawDate = params.date;
  const selectedDate =
    typeof rawDate === 'string' && DAY_KEY_PATTERN.test(rawDate) ? rawDate : todayKey();
  const today = todayKey();

  const viewMonth = monthOverride ?? monthKeyOf(selectedDate);
  const { year, monthIndex } = monthKeyParts(viewMonth);

  const { timed, anytime } = openOccurrencesForDay(db.tasks, selectedDate);
  const doneToday = doneOccurrencesForDay(db.tasks, selectedDate);
  const overdue = selectedDate === today ? overdueOccurrences(db.tasks, today) : [];
  const monthTasks = openOccurrencesByDay(db.tasks, viewMonth);
  const dayIsEmpty =
    overdue.length === 0 && timed.length === 0 && anytime.length === 0 && doneToday.length === 0;

  const goToDay = (key: string) => router.push({ pathname: '/todo', params: { date: key } });

  const openNew = () => {
    setEditing(null);
    setFormVisible(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setFormVisible(true);
  };

  const handleSubmit = (values: TaskFormValues) => {
    if (editing) {
      updateTask(editing.id, values);
    } else {
      addTask({ ...values, done: false });
    }
    setFormVisible(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteTask(pendingDelete.id);
    setPendingDelete(null);
  };

  const renderRow = (occurrence: TaskOccurrence, showDate = false) => (
    <TaskRow
      key={`${occurrence.task.id}-${occurrence.date}`}
      occurrence={occurrence}
      showDate={showDate}
      onToggle={() => toggleTaskOn(occurrence.task.id, occurrence.date)}
      onEdit={() => openEdit(occurrence.task)}
      onDelete={() => setPendingDelete(occurrence.task)}
    />
  );

  return (
    <>
      <PageHeader
        title="To-do"
        accent={accent}
        subtitle="Day and Month views of your tasks"
        action={<Button label="+ New task" variant="primary" testID="new-task" onPress={openNew} />}
      />

      <View style={styles.toolbar}>
        <Segmented
          options={[
            { value: 'day', label: 'Day' },
            { value: 'month', label: 'Month' },
          ]}
          value={viewMode}
          onChange={(mode) => {
            setViewMode(mode);
            if (mode === 'day') setMonthOverride(null);
          }}
          testID="todo-view"
        />

        {viewMode === 'day' ? (
          <>
            <Button
              label="◀"
              variant="secondary"
              testID="todo-prev"
              onPress={() => goToDay(addDays(selectedDate, -1))}
            />
            <ThemedText type="smallBold" testID="todo-day-title">
              {formatLongDate(selectedDate)}
            </ThemedText>
            <Button
              label="▶"
              variant="secondary"
              testID="todo-next"
              onPress={() => goToDay(addDays(selectedDate, 1))}
            />
          </>
        ) : (
          <>
            <Button
              label="◀"
              variant="secondary"
              testID="todo-prev-month"
              onPress={() => setMonthOverride(shiftMonthKey(viewMonth, -1))}
            />
            <ThemedText type="smallBold" testID="todo-month-title">
              {formatMonthTitle(year, monthIndex)}
            </ThemedText>
            <Button
              label="▶"
              variant="secondary"
              testID="todo-next-month"
              onPress={() => setMonthOverride(shiftMonthKey(viewMonth, 1))}
            />
          </>
        )}

        <Button
          label="Today"
          variant="ghost"
          testID="todo-today"
          onPress={() => {
            setMonthOverride(null);
            goToDay(today);
          }}
        />
      </View>

      {viewMode === 'day' ? (
        <Card>
          <WeekStrip anchor={selectedDate} tasks={db.tasks} onSelectDay={goToDay} />

          {dayIsEmpty ? (
            <EmptyState
              icon="sun"
              message="Nothing planned — enjoy it."
              hint="Use + New task to add something."
            />
          ) : (
            <>
              {overdue.length > 0 ? (
                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="dangerText" testID="overdue-heading">
                    {`Overdue (${overdue.length})`}
                  </ThemedText>
                  {overdue.map((task) => renderRow(task, true))}
                </View>
              ) : null}

              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  TIMED
                </ThemedText>
                {timed.length > 0 ? (
                  timed.map((task) => renderRow(task))
                ) : (
                  <ThemedText type="caption" themeColor="textTertiary">
                    No timed tasks.
                  </ThemedText>
                )}
              </View>

              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ANYTIME
                </ThemedText>
                {anytime.length > 0 ? (
                  anytime.map((task) => renderRow(task))
                ) : (
                  <ThemedText type="caption" themeColor="textTertiary">
                    No untimed tasks.
                  </ThemedText>
                )}
              </View>

              {doneToday.length > 0 ? (
                <CollapsibleSection title="Done" count={doneToday.length} testID="todo-done-toggle">
                  {doneToday.map((task) => renderRow(task))}
                </CollapsibleSection>
              ) : null}
            </>
          )}
        </Card>
      ) : (
        <Card>
          <MonthGrid
            year={year}
            monthIndex={monthIndex}
            selectedKey={selectedDate}
            today={today}
            cellMinHeight={100}
            testID="todo-month-grid"
            onSelectDay={(key) => {
              setViewMode('day');
              setMonthOverride(null);
              goToDay(key);
            }}
            renderDay={(cell) => {
              const dayTasks = monthTasks[cell.key] ?? [];
              const shown = dayTasks.slice(0, 3);
              const extra = dayTasks.length - shown.length;

              return (
                <>
                  {shown.map((occurrence) => (
                    <Chip
                      key={`${occurrence.task.id}-${cell.key}`}
                      label={truncate(occurrence.task.title, 16)}
                      color={occurrence.repeating ? theme.accent : undefined}
                      testID={`month-task-${occurrence.task.id}-${cell.key}`}
                      onPress={() => openEdit(occurrence.task)}
                    />
                  ))}
                  {extra > 0 ? (
                    <ThemedText
                      type="caption"
                      themeColor="textTertiary"
                      testID={`month-more-${cell.key}`}>
                      {`+${extra} more`}
                    </ThemedText>
                  ) : null}
                </>
              );
            }}
          />
        </Card>
      )}

      <TaskFormModal
        visible={formVisible}
        initial={editing}
        initialDate={selectedDate}
        onClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title={pendingDelete?.repeat ? 'Delete this repeating task?' : 'Delete this task?'}
        message={
          pendingDelete?.repeat
            ? `"${pendingDelete.title}" and all of its repeats will be removed from the calendar. This can't be undone.`
            : `"${pendingDelete?.title ?? ''}" will be removed. This can't be undone.`
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.one,
  },
});
