import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** Every empty list says something friendly instead of showing nothing (PRD §2.3). */
export function EmptyState({
  emoji,
  message,
  hint,
  action,
}: {
  emoji?: string;
  message: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <View testID="empty-state" style={styles.wrap}>
      {emoji ? <ThemedText style={styles.emoji}>{emoji}</ThemedText> : null}
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {message}
      </ThemedText>
      {hint ? (
        <ThemedText type="caption" themeColor="textTertiary" style={styles.center}>
          {hint}
        </ThemedText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  emoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  center: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
  },
});
