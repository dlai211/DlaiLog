import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppModal } from '@/components/ui/modal';
import { ThemeSwitch } from '@/components/ui/theme-switch';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { formatBytes } from '@/lib/photo';
import {
  backupFilename,
  downloadTextFile,
  parseBackupFile,
  pickTextFile,
  serializeBackup,
} from '@/store/backup';
import { useData } from '@/store/data-provider';
import type { DB } from '@/store/types';

/**
 * Backup & Restore (PRD §7.2). Restoring always asks first, and a file that
 * is not a complete DlaiLog backup is refused without touching anything.
 */
export function BackupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { db, replaceAll, loadSampleData, importAlbertsonsTrip, eraseAllData } = useData();
  const { showToast } = useToast();

  const [pendingRestore, setPendingRestore] = useState<{ name: string; db: DB } | null>(null);
  const [pendingAction, setPendingAction] = useState<'sample' | 'erase' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    const downloaded = downloadTextFile(backupFilename(), serializeBackup(db));
    showToast(
      downloaded
        ? 'Backup file downloaded.'
        : 'Backups need a browser — this build cannot download files.'
    );
  };

  const handlePickFile = async () => {
    setError(null);
    const file = await pickTextFile();
    if (!file) return;

    const result = parseBackupFile(file.text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPendingRestore({ name: file.name, db: result.db });
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    replaceAll(pendingRestore.db);
    setPendingRestore(null);
    setError(null);
    showToast('Backup restored.');
    onClose();
  };

  return (
    <>
      <AppModal visible={visible} title="Backup & Restore" onClose={onClose} testID="backup-modal">
        <View style={styles.body}>
          <View style={styles.section}>
            <ThemedText type="smallBold">Appearance</ThemedText>
            <ThemeSwitch />
            <ThemedText type="caption" themeColor="textTertiary">
              System follows your computer&apos;s light/dark setting.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Your data</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your data lives in this browser, on this PC. Download a backup file now and then — it
              is the only copy that survives clearing the browser&apos;s site data.
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <Button
              label="⬇ Download backup file"
              variant="primary"
              testID="backup-download"
              onPress={handleDownload}
            />
            <Button
              label="⬆ Restore from file…"
              variant="secondary"
              testID="backup-restore"
              onPress={handlePickFile}
            />
          </View>

          {error ? (
            <ThemedText type="small" themeColor="dangerText" testID="backup-error">
              {error}
            </ThemedText>
          ) : null}

          <ThemedText type="caption" themeColor="textTertiary">
            {`A backup contains everything: tasks, notes, projects, purchases (${db.purchases.length} logged), pantry, meals and the shopping list.`}
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary" testID="backup-size">
            {`Using about ${formatBytes(JSON.stringify(db).length)} of this browser's storage.`}
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">Example data</ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              A week of made-up shopping, a pantry with things run out, three dishes and a
              repeating class — enough to see every screen doing something.
            </ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              The example set already includes the Albertsons trip; the button below adds just
              that receipt to the data you have now.
            </ThemedText>
            <View style={styles.actions}>
              <Button
                label="Add the Albertsons trip (14 items)"
                variant="secondary"
                testID="settings-import-trip"
                onPress={() => {
                  const added = importAlbertsonsTrip();
                  showToast(
                    added === 0
                      ? 'The Albertsons trip is already logged.'
                      : `${added} items added from Albertsons.`
                  );
                  onClose();
                }}
              />
              <Button
                label="Load example data"
                variant="secondary"
                testID="settings-load-sample"
                onPress={() => setPendingAction('sample')}
              />
              <Button
                label="Erase everything"
                variant="ghost"
                testID="settings-erase"
                onPress={() => setPendingAction('erase')}
              />
            </View>
          </View>
        </View>
      </AppModal>

      <ConfirmDialog
        visible={pendingAction === 'sample'}
        title="Load the example data?"
        message="This replaces everything currently saved with the example set. Your backup file is the only way back."
        confirmLabel="Load example data"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          loadSampleData();
          setPendingAction(null);
          showToast('Example data loaded.');
          onClose();
        }}
        testID="settings-sample-confirm"
      />

      <ConfirmDialog
        visible={pendingAction === 'erase'}
        title="Erase everything?"
        message="Every task, purchase, pantry item, dish and note will be deleted. This can't be undone."
        confirmLabel="Erase everything"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          eraseAllData();
          setPendingAction(null);
          showToast('Everything erased.');
          onClose();
        }}
        testID="settings-erase-confirm"
      />

      <ConfirmDialog
        visible={pendingRestore !== null}
        title="Replace everything?"
        message={`Restoring "${pendingRestore?.name ?? ''}" replaces all current data. This can't be undone.`}
        confirmLabel="Replace all data"
        onCancel={() => setPendingRestore(null)}
        onConfirm={confirmRestore}
        testID="backup-confirm"
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
});
