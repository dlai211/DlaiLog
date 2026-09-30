import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProjectFormModal, type ProjectFormValues } from '@/components/domain/project-form-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress-bar';
import { RowActions } from '@/components/ui/row-actions';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/lib/format';
import { useData } from '@/store/data-provider';
import {
  filterProjects,
  projectDueLabel,
  PROJECT_STATUS_LABELS,
  sortProjects,
  type ProjectFilter,
} from '@/store/selectors';
import type { Project } from '@/store/types';

export default function ProjectsScreen() {
  const { db, addProject, updateProject, deleteProject } = useData();
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const visibleProjects = filterProjects(sortProjects(db.projects), filter);

  const openNew = () => {
    setEditing(null);
    setFormVisible(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setFormVisible(true);
  };

  const handleSubmit = (values: ProjectFormValues) => {
    if (editing) {
      updateProject(editing.id, values);
    } else {
      addProject(values);
    }
    setFormVisible(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteProject(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Progress of your development work"
        action={
          <Button label="+ New project" variant="primary" testID="new-project" onPress={openNew} />
        }
      />

      <View style={styles.filters}>
        <Segmented
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'done', label: 'Done' },
          ]}
          value={filter}
          onChange={setFilter}
          testID="project-filter"
        />
      </View>

      {visibleProjects.length === 0 ? (
        <EmptyState
          emoji="📊"
          message={
            db.projects.length === 0
              ? 'No projects yet — add your first one.'
              : 'No projects match this filter.'
          }
          hint={db.projects.length === 0 ? 'Track progress with a bar and a status.' : undefined}
        />
      ) : (
        <View style={styles.grid}>
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => openEdit(project)}
              onDelete={() => setPendingDelete(project)}
            />
          ))}
        </View>
      )}

      <ProjectFormModal
        visible={formVisible}
        initial={editing}
        onClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete this project?"
        message={`"${pendingDelete?.name ?? ''}" and its progress will be removed. This can't be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const done = project.status === 'done';
  const due = project.targetDate ? projectDueLabel(project.targetDate) : null;
  const statusColor = done
    ? theme.successText
    : project.status === 'in-progress'
      ? theme.primary
      : theme.textSecondary;

  return (
    <Card
      testID={`project-card-${project.id}`}
      onPress={onEdit}
      style={[styles.card, done && styles.cardDone]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" style={styles.cardName} numberOfLines={1}>
          {project.name}
        </ThemedText>
        <Chip
          label={PROJECT_STATUS_LABELS[project.status]}
          color={statusColor}
          selected
          testID={`project-status-chip-${project.id}`}
        />
        <RowActions
          onEdit={onEdit}
          onDelete={onDelete}
          editTestID={`project-edit-${project.id}`}
          deleteTestID={`project-delete-${project.id}`}
        />
      </View>

      <ProgressBar
        value={project.progress}
        color={done ? theme.successText : theme.primary}
        testID={`project-progress-bar-${project.id}`}
      />

      <View style={styles.cardMeta}>
        <ThemedText type="small" themeColor="textSecondary">
          {project.progress}%
        </ThemedText>
        {due && project.targetDate ? (
          <ThemedText
            type="caption"
            themeColor={due.overdue ? 'dangerText' : 'textTertiary'}
            testID={`project-due-${project.id}`}>
            {`${formatShortDate(project.targetDate)} · ${due.label}`}
          </ThemedText>
        ) : (
          <ThemedText type="caption" themeColor="textTertiary">
            No due date
          </ThemedText>
        )}
      </View>

      {project.description ? (
        <ThemedText type="caption" themeColor="textTertiary" numberOfLines={2}>
          {project.description}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  card: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 260,
    maxWidth: 560,
  },
  cardDone: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardName: {
    flexShrink: 1,
    flexGrow: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
