import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The ✎ ✕ pair on list rows; they brighten when the mouse hovers the row. */
export function RowActions({
  onEdit,
  onDelete,
  editTestID,
  deleteTestID,
  accessibilityLabel = 'Edit',
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editTestID?: string;
  deleteTestID?: string;
  accessibilityLabel?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <View
      style={styles.row}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}>
      {onEdit ? (
        <ActionButton
          glyph="✎"
          label={accessibilityLabel}
          onPress={onEdit}
          testID={editTestID}
          highlighted={hovered}
        />
      ) : null}
      {onDelete ? (
        <ActionButton
          glyph="✕"
          label="Delete"
          onPress={onDelete}
          testID={deleteTestID}
          highlighted={hovered}
        />
      ) : null}
    </View>
  );
}

function ActionButton({
  glyph,
  label,
  onPress,
  testID,
  highlighted,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  testID?: string;
  highlighted: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText type="caption" style={{ color: highlighted ? theme.text : theme.textTertiary }}>
        {glyph}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  button: {
    padding: Spacing.one,
    minWidth: 24,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
