import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { FormField } from '@/components/ui/form-field';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';

export interface Suggestion {
  value: string;
  label: string;
  hint?: string;
}

export interface FieldHint {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * A text field that offers saved names while typing, so the same item is
 * never stored twice under slightly different spellings. Suggestions hide
 * after one is chosen and come back as soon as typing continues.
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
  hint,
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
  /** A saved-name notice, e.g. "You already track this as …". */
  hint?: FieldHint | null;
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

      {hint ? (
        <View style={styles.hint} testID={`${testID}-hint`}>
          <ThemedText type="caption" themeColor="textTertiary">
            {hint.message}
          </ThemedText>
          {hint.actionLabel && hint.onAction ? (
            <Chip
              label={hint.actionLabel}
              onPress={hint.onAction}
              color={theme.accent}
              testID={`${testID}-hint-action`}
            />
          ) : null}
        </View>
      ) : null}

      {showSuggestions ? (
        <View style={styles.list} testID={`${testID}-suggestions`}>
          {suggestions.map((suggestion, index) => (
            <SuggestionRow
              key={suggestion.value}
              suggestion={suggestion}
              testID={`${testID}-suggestion-${index}`}
              onPress={() => {
                setSuppressed(true);
                onSelectSuggestion(suggestion);
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SuggestionRow({
  suggestion,
  onPress,
  testID,
}: {
  suggestion: Suggestion;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        styles.suggestion,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        hovered && { backgroundColor: theme.hover, borderColor: theme.borderStrong },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="small">{suggestion.label}</ThemedText>
      {suggestion.hint ? (
        <ThemedText type="caption" themeColor="textTertiary">
          {suggestion.hint}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  list: {
    gap: Spacing.one,
  },
  suggestion: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingVertical: Spacing.oneHalf,
    paddingHorizontal: Spacing.two,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.75,
  },
});
