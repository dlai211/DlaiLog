import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import {
  THEME_PREFERENCE_OPTIONS,
  useThemePreference,
  type ThemePreference,
} from '@/hooks/use-theme-preference';

const OPTION_ICONS: Record<ThemePreference, IconName> = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
};

/**
 * System / Light / Dark. "System" follows the computer's own setting and is
 * the default; the other two pin the app one way regardless.
 */
export function ThemeSwitch({ showLabels = true }: { showLabels?: boolean }) {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <View
      testID="theme-switch"
      style={[styles.wrap, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {THEME_PREFERENCE_OPTIONS.map((option) => (
        <ThemeOption
          key={option.value}
          value={option.value}
          label={option.label}
          showLabel={showLabels}
          active={preference === option.value}
          onPress={() => setPreference(option.value)}
        />
      ))}
    </View>
  );
}

function ThemeOption({
  value,
  label,
  showLabel,
  active,
  onPress,
}: {
  value: ThemePreference;
  label: string;
  showLabel: boolean;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={`theme-option-${value}`}
      accessibilityRole="button"
      accessibilityLabel={`${label} appearance`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...hoverProps}
      style={[
        styles.option,
        active && { backgroundColor: theme.backgroundSelected, borderColor: theme.borderStrong },
        hovered && !active && { backgroundColor: theme.hover },
      ]}>
      <Icon name={OPTION_ICONS[value]} size={14} color={active ? theme.text : theme.textSecondary} />
      {showLabel ? (
        <ThemedText type="caption" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.oneHalf,
    paddingVertical: Spacing.oneHalf,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
