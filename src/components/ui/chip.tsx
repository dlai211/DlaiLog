import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
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
  /** Category colour (or any palette colour) to tint the text and border. */
  color?: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
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
      {...hoverProps}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? tint : theme.border },
        selected && { backgroundColor: theme.backgroundSelected },
        hovered && onPress && !selected && { backgroundColor: theme.hover, borderColor: tint },
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
    borderStyle: 'dashed',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half + 2,
    paddingHorizontal: Spacing.two + 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
