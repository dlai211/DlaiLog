import { useEffect, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The centered pop-up used by every add/edit form, confirm dialog and picker
 * (PRD §2.3). Clicking the backdrop or pressing Esc closes it.
 */
export function AppModal({
  visible,
  title,
  onClose,
  children,
  footer,
  testID,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [visible, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close dialog"
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <ThemedView
          testID={testID}
          style={[styles.dialog, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.header}>
            <ThemedText type="heading" style={styles.title}>
              {title}
            </ThemedText>
            <Pressable
              testID={testID ? `${testID}-close` : undefined}
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeButton}>
              <ThemedText type="default" themeColor="textSecondary">
                ✕
              </ThemedText>
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  dialog: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  closeButton: {
    padding: Spacing.one,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
