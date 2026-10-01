import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-field';
import { AppModal } from '@/components/ui/modal';
import { ProgressSlider } from '@/components/ui/progress-slider';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { PROJECT_STATUS_OPTIONS } from '@/store/selectors';
import type { Project, ProjectStatus } from '@/store/types';

export interface ProjectFormValues {
  name: string;
  description?: string;
  status: ProjectStatus;
  progress: number;
  targetDate?: string;
  notes?: string;
}

/**
 * The add/edit pop-up for a project (PRD §5.3). The form component is keyed
 * by project id so opening it always starts from the right values.
 */
export function ProjectFormModal({
  visible,
  initial,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial?: Project | null;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}) {
  return (
    <AppModal
      visible={visible}
      title={initial ? 'Edit project' : 'New project'}
      onClose={onClose}
      testID="project-form">
      {visible ? (
        <ProjectForm
          key={initial?.id ?? 'new'}
          initial={initial ?? null}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </AppModal>
  );
}

function ProjectForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Project | null;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'not-started');
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [targetDate, setTargetDate] = useState<string | null>(initial?.targetDate ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    onSubmit({
      name: trimmedName,
      description: description.trim() || undefined,
      status,
      progress,
      targetDate: targetDate ?? undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <View style={styles.form}>
      <FormField
        label="Name"
        required
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(undefined);
        }}
        placeholder="e.g. DlaiLog website"
        error={error}
        testID="project-name"
        onSubmitEditing={handleSubmit}
      />

      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="One-line summary"
        testID="project-description"
      />

      <View style={styles.field}>
        <ThemedText type="label">Status</ThemedText>
        <Segmented
          options={PROJECT_STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          testID="project-status"
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="label">Progress</ThemedText>
        <ProgressSlider value={progress} onChange={setProgress} testID="project-progress" />
      </View>

      <View style={styles.field}>
        <DatePicker
          label="Target date"
          value={targetDate}
          onChange={setTargetDate}
          testID="project-target"
        />
        {targetDate ? (
          <Button
            label="Clear target date"
            variant="ghost"
            onPress={() => setTargetDate(null)}
            testID="project-target-clear"
          />
        ) : null}
      </View>

      <FormField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Anything worth remembering"
        testID="project-notes"
      />

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} testID="project-cancel" />
        <Button
          label={initial ? 'Save changes' : 'Create project'}
          variant="primary"
          onPress={handleSubmit}
          testID="project-save"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
