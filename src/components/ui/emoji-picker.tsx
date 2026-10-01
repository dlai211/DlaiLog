import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormField } from '@/components/ui/form-field';
import { Spacing } from '@/constants/theme';
import { searchEmojis } from '@/data/emoji-catalog';
import { useTheme } from '@/hooks/use-theme';

/**
 * A searchable emoji grid for purchase icons (PRD §5.4): search by keyword,
 * with the most recently used icons shown first.
 */
export function EmojiPicker({
  value,
  onChange,
  recent = [],
  testID = 'emoji-picker',
}: {
  value: string;
  onChange: (emoji: string) => void;
  recent?: string[];
  testID?: string;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchEmojis(query), [query]);
  const showRecent = query.trim().length === 0 && recent.length > 0;

  return (
    <View style={styles.wrap} testID={testID}>
      <FormField
        label="Icon"
        value={query}
        onChangeText={setQuery}
        placeholder="Search emoji — try 'oil', 'soap', 'rice'"
        testID={`${testID}-search`}
      />

      {showRecent ? (
        <View style={styles.section}>
          <ThemedText type="caption" themeColor="textTertiary">
            Recently used
          </ThemedText>
          <View style={styles.grid}>
            {recent.map((emoji, index) => (
              <EmojiButton
                key={`recent-${emoji}-${index}`}
                emoji={emoji}
                selected={emoji === value}
                onPress={() => onChange(emoji)}
                testID={`${testID}-recent-${index}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.grid}>
        {results.map((entry, index) => (
          <EmojiButton
            key={`${entry.emoji}-${index}`}
            emoji={entry.emoji}
            selected={entry.emoji === value}
            onPress={() => onChange(entry.emoji)}
            testID={`${testID}-option-${index}`}
          />
        ))}
      </View>

      {results.length === 0 ? (
        <ThemedText type="caption" themeColor="textTertiary">
          {`No emoji matches "${query}".`}
        </ThemedText>
      ) : null}

      {value ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {`Selected: ${value}`}
        </ThemedText>
      ) : (
        <ThemedText type="caption" themeColor="textTertiary">
          Tap an emoji to use it as the item icon.
        </ThemedText>
      )}
    </View>
  );
}

function EmojiButton({
  emoji,
  selected,
  onPress,
  testID,
}: {
  emoji: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Icon ${emoji}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.emojiButton,
        { borderColor: selected ? theme.primary : theme.border, backgroundColor: theme.background },
        selected && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.7,
  },
});
