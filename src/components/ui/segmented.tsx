import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';

/** A row of mutually-exclusive choices: Day|Month, project status, categories. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID = 'segmented',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[styles.wrap, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
      {options.map((option) => (
        <Segment
          key={option.value}
          label={option.label}
          active={option.value === value}
          onPress={() => onChange(option.value)}
          testID={`${testID}-${option.value}`}
        />
      ))}
    </View>
  );
}

function Segment({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...hoverProps}
      style={[
        styles.item,
        active && { backgroundColor: theme.backgroundElement, borderColor: theme.borderStrong },
        hovered && !active && { backgroundColor: theme.hover },
      ]}>
      <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
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
    alignSelf: 'flex-start',
  },
  item: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
