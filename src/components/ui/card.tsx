import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A rounded, dashed-border surface: every block on every screen is one of these.
 *
 * Web note: when a card is tappable we deliberately do **not** give the
 * Pressable a button role. react-native-web renders `accessibilityRole="button"`
 * as a real `<button>` element, and cards contain their own buttons (✎ / ✕) —
 * and a `<button>` may not contain another `<button>`. That is invalid HTML and
 * breaks hydration on our statically rendered pages. So the tappable container
 * stays a plain, non-focusable div; the real buttons inside it are the
 * accessible controls, and clicking the card is a mouse convenience on top.
 */
export function Card({
  title,
  children,
  onPress,
  testID,
  style,
}: {
  title?: string;
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  const content = (
    <>
      {title ? <ThemedText type="smallBold">{title}</ThemedText> : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        focusable={false}
        onPress={onPress}
        style={({ hovered, pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          hovered && styles.hovered,
          pressed && styles.pressed,
          style,
        ]}>
        {content}
      </Pressable>
    );
  }

  return (
    <ThemedView
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}>
      {content}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hovered: {
    transform: [{ scale: 1.01 }],
  },
  pressed: {
    opacity: 0.85,
  },
});
