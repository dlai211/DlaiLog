import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's only button. `primary` for the main action on a screen,
 * `secondary` for everything else, `danger` for destructive confirmations,
 * `ghost` for subtle actions inside cards. Ghost buttons carry the dashed
 * edge; filled ones are solid shapes.
 */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  icon,
  testID,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.backgroundElement
          : 'transparent';

  const textColor =
    variant === 'primary' || variant === 'danger' ? theme.primaryText : theme.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === 'secondary' && { borderWidth: 1, borderColor: theme.borderStrong },
        variant === 'ghost' && { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border },
        variant === 'primary' && hovered && { backgroundColor: theme.primary, transform: [{ scale: 1.02 }] },
        variant === 'secondary' && hovered && { backgroundColor: theme.hover, transform: [{ scale: 1.02 }] },
        variant === 'danger' && hovered && { transform: [{ scale: 1.02 }] },
        variant === 'ghost' && hovered && { backgroundColor: theme.hover },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {icon ? (
        <Icon name={icon} size={16} color={textColor} />
      ) : null}
      <ThemedText type="smallBold" style={{ color: textColor }} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.oneHalf,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});
