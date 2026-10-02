import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';

/** A square button that is just an icon — steppers, row actions, cart shortcuts. */
export function IconButton({
  icon,
  label,
  onPress,
  testID,
  tone = 'normal',
  variant = 'ghost',
  size = 16,
  style,
}: {
  icon: IconName;
  /** Accessible name; also the tooltip. */
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: 'normal' | 'danger' | 'primary';
  variant?: 'ghost' | 'solid';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  const color =
    tone === 'danger'
      ? hovered
        ? theme.dangerText
        : theme.textTertiary
      : tone === 'primary'
        ? theme.primary
        : hovered
          ? theme.text
          : theme.textSecondary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={label}
      onPress={(event) => {
        // These often sit inside tappable rows: don't trigger the row as well.
        if (typeof event?.stopPropagation === 'function') event.stopPropagation();
        onPress();
      }}
      {...hoverProps}
      style={({ pressed }) => [
        styles.button,
        variant === 'solid' && {
          borderWidth: 1,
          borderColor: hovered ? theme.borderStrong : theme.border,
          backgroundColor: hovered ? theme.hover : theme.backgroundElement,
        },
        variant === 'ghost' && hovered && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
        style,
      ]}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.one + 2,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
