import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Every empty list says something friendly instead of showing nothing. */
export function EmptyState({
  icon = 'leaf',
  message,
  hint,
  action,
}: {
  icon?: IconName;
  message: string;
  hint?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View testID="empty-state" style={styles.wrap}>
      <View style={[styles.badge, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
        <Icon name={icon} size={22} color={theme.textSecondary} />
      </View>
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
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
  },
});
