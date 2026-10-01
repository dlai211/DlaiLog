import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The centered pop-up used by every add/edit form, confirm dialog and picker.
 * Clicking the backdrop or pressing Esc closes it; it eases in and out.
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
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: Motion.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [visible, progress]);

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
        <Animated.View
          style={[
            styles.dialogWrap,
            {
              opacity: progress,
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}>
          <ThemedView
            testID={testID}
            style={[styles.dialog, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.header}>
              <ThemedText type="heading" style={styles.title}>
                {title}
              </ThemedText>
              <Pressable
                testID={testID ? `${testID}-close` : undefined}
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Icon name="close" size={18} color={theme.textSecondary} />
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 34, 32, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  dialogWrap: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
  },
  dialog: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderStyle: 'dashed',
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
    padding: Spacing.one + 2,
    borderRadius: Radius.small,
  },
  pressed: {
    opacity: 0.6,
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
