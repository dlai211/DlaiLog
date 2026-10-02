import { useState } from 'react';
import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A labelled text/number input with an optional error line. */
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  error,
  keyboardType,
  multiline = false,
  autoFocus = false,
  testID,
  onSubmitEditing,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoFocus?: boolean;
  testID?: string;
  onSubmitEditing?: () => void;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? theme.danger : focused ? theme.borderStrong : theme.border;

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="label">
          {label}
          {required ? ' *' : ''}
        </ThemedText>
      ) : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          focused && styles.focused,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor,
          },
        ]}
      />
      {error ? (
        <ThemedText type="caption" themeColor="dangerText">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    fontSize: 14,
    minHeight: 40,
  },
  focused: {
    borderWidth: 2,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
  },
  inputMultiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
});
