import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A small pill: category tags, filters, day totals. Can be tappable. */
export function Chip({
  label,
  color,
  selected = false,
  onPress,
  testID,
}: {
  label: string;
  /** Category color (or any palette color) to tint the text and border. */
  color?: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const tint = color ?? theme.textSecondary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      disabled={!onPress}
      onPress={
        onPress
          ? (event) => {
              // Chips often sit inside tappable rows (e.g. a calendar day
              // cell): keep the tap from bubbling up to the row on web.
              if (typeof event?.stopPropagation === 'function') event.stopPropagation();
              onPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? tint : theme.border },
        selected && { backgroundColor: theme.backgroundSelected },
        pressed && onPress && styles.pressed,
      ]}>
      <ThemedText
        type="caption"
        style={{ color: selected ? tint : theme.textSecondary, fontWeight: selected ? 700 : 500 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.half + 2,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
  },
});
