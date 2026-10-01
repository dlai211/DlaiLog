import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormField } from '@/components/ui/form-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Suggestion {
  value: string;
  label: string;
  hint?: string;
}

/**
 * A text field that offers matching suggestions while typing. Suggestions
 * hide after one is chosen and come back as soon as typing continues.
 */
export function AutocompleteField({
  label,
  value,
  onChangeText,
  suggestions,
  onSelectSuggestion,
  placeholder,
  required = false,
  error,
  testID,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suggestions: Suggestion[];
  onSelectSuggestion: (suggestion: Suggestion) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  testID: string;
  onSubmitEditing?: () => void;
}) {
  const theme = useTheme();
  const [suppressed, setSuppressed] = useState(false);
  const showSuggestions = !suppressed && value.trim().length > 0 && suggestions.length > 0;

  return (
    <View style={styles.wrap}>
      <FormField
        label={label}
        required={required}
        value={value}
        error={error}
        placeholder={placeholder}
        testID={testID}
        onSubmitEditing={onSubmitEditing}
        onChangeText={(text) => {
          setSuppressed(false);
          onChangeText(text);
        }}
      />

      {showSuggestions ? (
        <View style={styles.list} testID={`${testID}-suggestions`}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.value}
              testID={`${testID}-suggestion-${index}`}
              accessibilityRole="button"
              onPress={() => {
                setSuppressed(true);
                onSelectSuggestion(suggestion);
              }}
              style={({ pressed }) => [
                styles.suggestion,
                { borderColor: theme.border, backgroundColor: theme.background },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">{suggestion.label}</ThemedText>
              {suggestion.hint ? (
                <ThemedText type="caption" themeColor="textTertiary">
                  {suggestion.hint}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.one,
  },
  suggestion: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.75,
  },
});
