import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { AppModal } from '@/components/ui/modal';

/** "Are you sure?" before anything is deleted (PRD §2.3). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  testID = 'confirm-dialog',
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}) {
  return (
    <AppModal
      visible={visible}
      title={title}
      onClose={onCancel}
      testID={testID}
      footer={
        <>
          <Button
            label={cancelLabel}
            variant="secondary"
            onPress={onCancel}
            testID={`${testID}-cancel`}
          />
          <Button
            label={confirmLabel}
            variant="danger"
            onPress={onConfirm}
            testID={`${testID}-confirm`}
          />
        </>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
    </AppModal>
  );
}
