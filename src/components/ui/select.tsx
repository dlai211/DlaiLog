import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppModal } from '@/components/ui/modal';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/** A dropdown that opens a small picker dialog. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  testID = 'select',
}: {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <View style={styles.field}>
      {label ? <ThemedText type="label">{label}</ThemedText> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.control,
          { borderColor: theme.border, backgroundColor: theme.background },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="small" themeColor={selected ? 'text' : 'textTertiary'}>
          {selected ? selected.label : placeholder}
        </ThemedText>
        <ThemedText type="caption" themeColor="textTertiary">
          ▾
        </ThemedText>
      </Pressable>

      <AppModal
        visible={open}
        title={label ?? placeholder}
        onClose={() => setOpen(false)}
        testID={`${testID}-modal`}>
        <View style={styles.optionList}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                testID={`${testID}-option-${option.value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small">{option.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  control: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  optionList: {
    gap: Spacing.one,
  },
  option: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
  },
});
