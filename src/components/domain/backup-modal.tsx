import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppModal } from '@/components/ui/modal';
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
  const { db, replaceAll } = useData();
  const { showToast } = useToast();

  const [pendingRestore, setPendingRestore] = useState<{ name: string; db: DB } | null>(null);
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
          <ThemedText type="small" themeColor="textSecondary">
            Your data lives in this browser, on this PC. Download a backup file now and then — it is
            the only copy that survives clearing the browser&apos;s site data.
          </ThemedText>

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
        </View>
      </AppModal>

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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
});
