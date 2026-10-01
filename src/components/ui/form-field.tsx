import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A labelled text/number input with an optional error line (PRD §2.3). */
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
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: theme.text,
            backgroundColor: theme.background,
            borderColor: error ? theme.danger : theme.border,
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
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
    minHeight: 40,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
