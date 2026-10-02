import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing, soft } from '@/constants/theme';
import { fluid } from '@/lib/fluid';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';

/**
 * One number from a module, wearing that module's colour: the at-a-glance row
 * on Home. Tappable — it takes you to the screen the number came from.
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  /** The accent colour this tile is painted with (see `Accents`). */
  accent: string;
  onPress?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={testID}
      focusable={false}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        hovered && { borderColor: accent, transform: [{ translateY: -2 }] },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconChip, { backgroundColor: soft(accent, '24') }]}>
        <Icon name={icon} size={16} color={accent} />
      </View>

      <View style={styles.body}>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText type="heading" style={{ color: accent }} numberOfLines={1}>
          {value}
        </ThemedText>
        {hint ? (
          <ThemedText type="caption" themeColor="textTertiary" numberOfLines={1}>
            {hint}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: fluid(180),
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    padding: Spacing.two,
  },
  iconChip: {
    width: fluid(38),
    height: fluid(38),
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.85,
  },
});
