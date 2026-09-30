import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

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
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrap}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <ThemedText type="caption" themeColor="textTertiary">
          {open ? '▾' : '▸'}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {count === undefined ? title : `${title} (${count})`}
        </ThemedText>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
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
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    gap: Spacing.two,
    paddingLeft: Spacing.three,
  },
});
