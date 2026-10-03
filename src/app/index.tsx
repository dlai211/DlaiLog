import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TaskFormModal, type TaskFormValues } from '@/components/domain/task-form-modal';
import { TaskRow } from '@/components/domain/task-row';
import { WeekStrip } from '@/components/domain/week-strip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { CATEGORY_META } from '@/data/categories';
import { StatTile } from '@/components/ui/stat-tile';
import { useAccents, useScreenAccent, useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/lib/dates';
import {
  formatLongDate,
  formatMoney,
  formatMonthKey,
  formatPercentChange,
  formatUnitPrice,
  truncate,
} from '@/lib/format';
import { useData } from '@/store/data-provider';
import {
  doneOccurrencesForDay,
  homeSummary,
  isOutOfStock,
  openOccurrencesForDay,
  overdueOccurrences,
  projectDueLabel,
  shoppingCounts,
  type TaskOccurrence,
} from '@/store/selectors';
import type { Task } from '@/store/types';
import { useToast } from '@/components/ui/toast';

/**
 * The dashboard (PRD §3): today's plan, quick notes, and one live summary of
 * each module. Nothing here is stored twice — every card reads the same data
 * the module screens do.
 */
export default function HomeScreen() {
  const { db, addTask, updateTask, deleteTask, addNote, deleteNote, toggleTaskOn } = useData();
  const { showToast } = useToast();
  const theme = useTheme();
  const accents = useAccents();
  const accent = useScreenAccent('home');
  const router = useRouter();

  const today = todayKey();
  const summary = homeSummary(db);
  const { timed, anytime } = openOccurrencesForDay(db.tasks, today);
  const overdue = overdueOccurrences(db.tasks, today);
  const doneToday = doneOccurrencesForDay(db.tasks, today);

  const [quickTask, setQuickTask] = useState('');
  const [noteText, setNoteText] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  const goToDay = (key: string) => router.push({ pathname: '/todo', params: { date: key } });

  const handleQuickAdd = () => {
    const title = quickTask.trim();
    if (!title) return;
    addTask({ title, date: today, done: false });
    setQuickTask('');
  };

  const handleAddNote = () => {
    const text = noteText.trim();
    if (!text) return;
    addNote(text);
    setNoteText('');
  };

  const handleDeleteNote = (id: string, text: string) => {
    deleteNote(id);
    showToast('Note deleted', {
      actionLabel: 'Undo',
      onAction: () => addNote(text),
    });
  };

  const handleTaskSubmit = (values: TaskFormValues) => {
    if (editing) {
      updateTask(editing.id, values);
    } else {
      addTask({ ...values, done: false });
    }
    setFormVisible(false);
    setEditing(null);
  };

  const renderRow = (occurrence: TaskOccurrence, showDate = false) => (
    <TaskRow
      key={`${occurrence.task.id}-${occurrence.date}`}
      occurrence={occurrence}
      showDate={showDate}
      onToggle={() => toggleTaskOn(occurrence.task.id, occurrence.date)}
      onEdit={() => {
        setEditing(occurrence.task);
        setFormVisible(true);
      }}
      onDelete={() => setPendingDelete(occurrence.task)}
    />
  );

  const notes = [...db.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const dayIsEmpty = overdue.length === 0 && timed.length === 0 && anytime.length === 0 && doneToday.length === 0;

  const outOfStockCount = db.inventory.filter(isOutOfStock).length;
  const shoppingOpen = shoppingCounts(db.shopping).open;

  return (
    <View style={styles.page}>
      <PageHeader
        title="Home"
        subtitle={formatLongDate(today)}
        accent={accent}
        action={
          <Button
            label="+ New task"
            variant="primary"
            testID="home-new-task"
            onPress={() => {
              setEditing(null);
              setFormVisible(true);
            }}
          />
        }
      />

      {/* One number from each module, in that module's colour */}
      <View style={styles.statRow} testID="home-stats">
        <StatTile
          label="Spent this month"
          value={formatMoney(summary.monthTotal)}
          hint={summary.purchaseCount === 1 ? '1 entry' : `${summary.purchaseCount} entries`}
          icon="wallet"
          accent={accents.plum}
          onPress={() => router.push('/spending')}
          testID="home-stat-spending"
        />
        <StatTile
          label="Open today"
          value={String(timed.length + anytime.length)}
          hint={overdue.length > 0 ? `${overdue.length} overdue` : 'all clear'}
          icon="todo"
          accent={accents.sky}
          onPress={() => router.push('/todo')}
          testID="home-stat-tasks"
        />
        <StatTile
          label="Out of stock"
          value={outOfStockCount === 0 ? 'None' : String(outOfStockCount)}
          hint={outOfStockCount === 0 ? 'pantry is full' : 'pantry items'}
          icon="box"
          accent={accents.rose}
          onPress={() => router.push('/inventory')}
          testID="home-stat-pantry"
        />
        <StatTile
          label="On the list"
          value={String(shoppingOpen)}
          hint="to buy"
          icon="cart"
          accent={accents.sand}
          onPress={() => router.push('/inventory')}
          testID="home-stat-shopping"
        />
      </View>

      <View style={styles.grid}>
        {/* Today's Plan — the To-do module, filtered to today */}
        <Card testID="home-today" style={styles.planCard}>
          <ThemedText type="smallBold">Today&apos;s Plan</ThemedText>

          <WeekStrip anchor={today} tasks={db.tasks} onSelectDay={goToDay} testID="home-week-strip" />

          {dayIsEmpty ? (
            <EmptyState icon="sun" message="Nothing planned today — enjoy it." />
          ) : (
            <>
              {overdue.length > 0 ? (
                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="dangerText" testID="home-overdue-heading">
                    {`Overdue (${overdue.length})`}
                  </ThemedText>
                  {overdue.map((task) => renderRow(task, true))}
                </View>
              ) : null}

              <View style={styles.section}>
                {timed.map((task) => renderRow(task))}
                {anytime.map((task) => renderRow(task))}
              </View>

              {doneToday.length > 0 ? (
                <CollapsibleSection title="Done today" count={doneToday.length} testID="home-done-toggle">
                  {doneToday.map((task) => renderRow(task))}
                </CollapsibleSection>
              ) : null}
            </>
          )}

          <View style={styles.quickAdd}>
            <View style={styles.quickAddField}>
              <FormField
                value={quickTask}
                onChangeText={setQuickTask}
                placeholder="+ Add a task for today"
                testID="home-quick-task"
                onSubmitEditing={handleQuickAdd}
              />
            </View>
            <Button label="Add" variant="secondary" testID="home-quick-task-add" onPress={handleQuickAdd} />
          </View>
        </Card>

        {/* Quick Notes — the only record type Home owns */}
        <Card testID="home-notes" style={styles.notesCard}>
          <ThemedText type="smallBold">Quick Notes</ThemedText>

          <View style={styles.quickAdd}>
            <View style={styles.quickAddField}>
              <FormField
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Write a note…"
                testID="home-note-input"
                onSubmitEditing={handleAddNote}
              />
            </View>
            <Button label="Add" variant="secondary" testID="home-note-add" onPress={handleAddNote} />
          </View>

          {notes.length === 0 ? (
            <EmptyState icon="note" message="No notes yet — jot something down." />
          ) : (
            <View style={styles.notes}>
              {notes.map((note) => (
                <View
                  key={note.id}
                  testID={`home-note-${note.id}`}
                  style={[styles.note, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <ThemedText type="small" style={styles.noteText}>
                    {note.text}
                  </ThemedText>
                  <Pressable
                    testID={`home-note-delete-${note.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Delete note"
                    onPress={() => handleDeleteNote(note.id, note.text)}>
                    <ThemedText type="caption" themeColor="textTertiary">
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Spending summary */}
        <Card testID="home-spending" style={styles.summaryCard} onPress={() => router.push('/spending')}>
          <ThemedText type="smallBold">{`Spending · ${formatMonthKey(summary.monthKey)}`}</ThemedText>
          <ThemedText type="heading" testID="home-spending-total">
            {formatMoney(summary.monthTotal)}
          </ThemedText>
          <ThemedText type="caption" testID="home-spending-change" themeColor={changeColor(summary)}>
            {changeLabel(summary)}
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            {summary.purchaseCount === 1 ? '1 entry' : `${summary.purchaseCount} entries`}
            {summary.topCategory ? ` · Top: ${CATEGORY_META[summary.topCategory].label}` : ''}
          </ThemedText>
        </Card>

        {/* Projects summary */}
        <Card testID="home-projects" style={styles.summaryCard} onPress={() => router.push('/projects')}>
          <ThemedText type="smallBold">Projects</ThemedText>
          {summary.topProjects.length === 0 ? (
            <ThemedText type="caption" themeColor="textTertiary">
              No active projects.
            </ThemedText>
          ) : (
            summary.topProjects.map((project) => {
              const due = project.targetDate ? projectDueLabel(project.targetDate) : null;
              return (
                <View key={project.id} style={styles.projectRow} testID={`home-project-${project.id}`}>
                  <View style={styles.projectHeader}>
                    <ThemedText type="small" style={styles.projectName} numberOfLines={1}>
                      {project.name}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {`${project.progress}%`}
                    </ThemedText>
                  </View>
                  <ProgressBar value={project.progress} height={6} testID={`home-project-bar-${project.id}`} />
                  {due ? (
                    <ThemedText type="caption" themeColor={due.overdue ? 'dangerText' : 'textTertiary'}>
                      {due.label}
                    </ThemedText>
                  ) : null}
                </View>
              );
            })
          )}
        </Card>

        {/* Pantry + shopping list */}
        <Card
          testID="home-pantry"
          style={styles.summaryCard}
          onPress={() => router.push('/inventory')}>
          <ThemedText type="smallBold">Pantry &amp; shopping</ThemedText>
          <ThemedText
            type="heading"
            themeColor={outOfStockCount > 0 ? 'dangerText' : 'text'}
            testID="home-pantry-out">
            {outOfStockCount === 0 ? 'All stocked up' : `${outOfStockCount} out of stock`}
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary" testID="home-pantry-shopping">
            {shoppingOpen === 0
              ? 'Nothing on the shopping list'
              : `${shoppingOpen} ${shoppingOpen === 1 ? 'item' : 'items'} on the shopping list`}
          </ThemedText>
        </Card>

        {/* Grocery Watch */}
        <Card testID="home-grocery" style={styles.watchCard} onPress={() => router.push('/grocery')}>
          <ThemedText type="smallBold">Grocery Watch</ThemedText>
          {summary.priceMovers.length === 0 ? (
            <ThemedText type="caption" themeColor="textTertiary">
              No price moves this month yet.
            </ThemedText>
          ) : (
            summary.priceMovers.map((item) => {
              const unitPrice = formatUnitPrice(item.latestUnitPrice, 1);
              const rising = (item.changePercent ?? 0) > 0;
              return (
                <View key={item.key} style={styles.moverRow} testID={`home-mover-${item.key}`}>
                  <ThemedText type="small">{item.icon}</ThemedText>
                  <ThemedText type="small" style={styles.moverName} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="small">
                    {unitPrice ? `${unitPrice}/${item.unit}` : '—'}
                  </ThemedText>
                  <ThemedText type="caption" themeColor={rising ? 'dangerText' : 'successText'}>
                    {`${rising ? '▲' : '▼'} ${formatPercentChange(item.changePercent ?? 0)}`}
                  </ThemedText>
                </View>
              );
            })
          )}
        </Card>
      </View>

      <TaskFormModal
        visible={formVisible}
        initial={editing}
        initialDate={today}
        onClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSubmit={handleTaskSubmit}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title={pendingDelete?.repeat ? 'Delete this repeating task?' : 'Delete this task?'}
        message={
          pendingDelete?.repeat
            ? `"${truncate(pendingDelete.title, 40)}" and all of its repeats will be removed. This can't be undone.`
            : `"${truncate(pendingDelete?.title ?? '', 40)}" will be removed. This can't be undone.`
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteTask(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </View>
  );
}

function changeLabel(summary: ReturnType<typeof homeSummary>): string {
  if (summary.monthChangePercent === null) return 'No spending last month to compare';
  if (Math.abs(summary.monthChangePercent) < 0.5) return '— same as last month';
  return `${summary.monthChangePercent > 0 ? '▲' : '▼'} ${formatPercentChange(summary.monthChangePercent)} vs last month`;
}

function changeColor(summary: ReturnType<typeof homeSummary>): 'dangerText' | 'successText' | 'textTertiary' {
  if (summary.monthChangePercent === null) return 'textTertiary';
  if (Math.abs(summary.monthChangePercent) < 0.5) return 'textTertiary';
  return summary.monthChangePercent > 0 ? 'dangerText' : 'successText';
}

const styles = StyleSheet.create({
  // The dashboard reads as three bands — header, the numbers, the widgets —
  // with room to breathe between them.
  page: {
    gap: Spacing.five,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Cards keep their natural height instead of stretching to fill an empty row.
    alignItems: 'flex-start',
    gap: Spacing.four,
  },
  planCard: {
    flexGrow: 2,
    flexBasis: 420,
    minWidth: 280,
  },
  notesCard: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 260,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 260,
  },
  watchCard: {
    flexGrow: 1,
    flexBasis: '100%',
    minWidth: 260,
  },
  section: {
    gap: Spacing.one,
  },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  quickAddField: {
    flex: 1,
  },
  notes: {
    gap: Spacing.two,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.oneHalf,
    paddingHorizontal: Spacing.two,
  },
  noteText: {
    flex: 1,
  },
  projectRow: {
    gap: Spacing.half,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  projectName: {
    flexShrink: 1,
  },
  moverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  moverName: {
    flex: 1,
  },
});
