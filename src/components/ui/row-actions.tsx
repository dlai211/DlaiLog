import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';

/** The edit/delete pair on list rows; they lift when the row is hovered. */
export function RowActions({
  onEdit,
  onDelete,
  editTestID,
  deleteTestID,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editTestID?: string;
  deleteTestID?: string;
  editLabel?: string;
  deleteLabel?: string;
}) {
  const { hovered, hoverProps } = useHover();

  return (
    <View style={styles.row} {...hoverProps}>
      {onEdit ? (
        <ActionButton
          icon="pencil"
          label={editLabel}
          onPress={onEdit}
          testID={editTestID}
          highlighted={hovered}
        />
      ) : null}
      {onDelete ? (
        <ActionButton
          icon="trash"
          label={deleteLabel}
          onPress={onDelete}
          testID={deleteTestID}
          highlighted={hovered}
          tone="danger"
        />
      ) : null}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  testID,
  highlighted,
  tone = 'normal',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
  highlighted: boolean;
  tone?: 'normal' | 'danger';
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  const color = tone === 'danger' && (highlighted || hovered) ? theme.dangerText : highlighted || hovered ? theme.text : theme.textTertiary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={(event) => {
        // The action buttons sit inside tappable rows/cards: don't let the
        // click bubble up and open the row's own action on web. (Test
        // environments pass a minimal event object, hence the guard.)
        if (typeof event?.stopPropagation === 'function') event.stopPropagation();
        onPress();
      }}
      {...hoverProps}
      style={({ pressed }) => [
        styles.button,
        hovered && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={16} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.half,
  },
  button: {
    padding: Spacing.oneHalf,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
