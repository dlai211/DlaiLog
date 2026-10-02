import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { fluid } from '@/lib/fluid';

/** The round tick used for tasks, shopping items and anything else toggled. */
export function CheckToggle({
  checked,
  onToggle,
  label,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      {...hoverProps}
      style={[
        styles.box,
        {
          borderColor: checked ? theme.primary : hovered ? theme.borderStrong : theme.border,
          backgroundColor: checked ? theme.primary : 'transparent',
        },
      ]}>
      {checked ? <Icon name="check" size={13} color={theme.primaryText} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: fluid(22),
    height: fluid(22),
    borderRadius: Radius.small,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
