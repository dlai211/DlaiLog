import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';

/** A section header that hides its content until opened — the To-do "Done" list. */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
  testID,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const { hovered, hoverProps } = useHover();

  return (
    <View style={styles.wrap}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        {...hoverProps}
        style={[styles.header, hovered && { backgroundColor: theme.hover }, open && styles.headerOpen]}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} color={theme.textTertiary} />
        <ThemedText type="smallBold" themeColor="textSecondary">
          {count === undefined ? title : `${title} (${count})`}
        </ThemedText>
      </Pressable>
      {open ? (
        <View style={[styles.body, { borderColor: theme.border }]}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.oneHalf,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  headerOpen: {
    marginBottom: Spacing.one,
  },
  body: {
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
  },
});
