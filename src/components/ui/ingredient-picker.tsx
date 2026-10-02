import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormField } from '@/components/ui/form-field';
import { Radius, Spacing } from '@/constants/theme';
import {
  NEUTRAL_TILE,
  findIngredientTile,
  searchIngredientTiles,
  type IngredientTile,
} from '@/data/ingredient-images';
import { IngredientPicture } from '@/data/ingredient-images';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { fluid } from '@/lib/fluid';

/**
 * The picture picker that replaced the emoji grid: search by name, then tap a
 * drawn tile. Recently used pictures appear first.
 */
export function IngredientPicker({
  value,
  onChange,
  recent = [],
  testID = 'ingredient-picker',
}: {
  /** The selected tile key. */
  value: string;
  onChange: (tileKey: string) => void;
  /** Tile keys used recently, newest first. */
  recent?: string[];
  testID?: string;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchIngredientTiles(query), [query]);
  const selected = findIngredientTile(value);

  const recentTiles = recent
    .map((key) => findIngredientTile(key))
    .filter((tile): tile is IngredientTile => Boolean(tile))
    .slice(0, 6);

  const showRecent = query.trim().length === 0 && recentTiles.length > 0;

  return (
    <View style={styles.wrap} testID={testID}>
      <FormField
        label="Picture"
        value={query}
        onChangeText={setQuery}
        placeholder="Search — try 'oil', 'soap', 'rice'"
        testID={`${testID}-search`}
      />

      {showRecent ? (
        <View style={styles.section}>
          <ThemedText type="caption" themeColor="textTertiary">
            Recently used
          </ThemedText>
          <View style={styles.grid}>
            {recentTiles.map((tile) => (
              <TileButton
                key={`recent-${tile.key}`}
                tile={tile}
                selected={tile.key === value}
                onPress={() => onChange(tile.key)}
                testID={`${testID}-recent-${tile.key}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.grid}>
        {results.map((tile) => (
          <TileButton
            key={tile.key}
            tile={tile}
            selected={tile.key === value}
            onPress={() => onChange(tile.key)}
            testID={`${testID}-option-${tile.key}`}
          />
        ))}
      </View>

      {results.length === 0 ? (
        <ThemedText type="caption" themeColor="textTertiary" testID={`${testID}-empty`}>
          {`No picture matches "${query}" — pick the closest one.`}
        </ThemedText>
      ) : null}

      <View style={styles.selectedRow}>
        {selected ? (
          <>
            <IngredientPicture tile={selected} size={28} />
            <ThemedText type="caption" themeColor="textSecondary" testID={`${testID}-selected`}>
              {selected.label}
            </ThemedText>
          </>
        ) : (
          <ThemedText type="caption" themeColor="textTertiary">
            No picture chosen yet — tap one above.
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function TileButton({
  tile,
  selected,
  onPress,
  testID,
}: {
  tile: IngredientTile;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={tile.label}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: selected ? theme.primary : theme.border },
        hovered && { borderColor: theme.borderStrong, backgroundColor: theme.hover, transform: [{ scale: 1.03 }] },
        pressed && styles.pressed,
      ]}>
      <IngredientPicture tile={tile} size={38} />
      <ThemedText type="caption" themeColor={selected ? 'text' : 'textSecondary'} numberOfLines={1}>
        {tile.label}
      </ThemedText>
    </Pressable>
  );
}

/** Convenience for callers that only have a free-text name (e.g. a new item). */
export function pickerFallbackTile(): IngredientTile {
  return NEUTRAL_TILE;
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
    gap: Spacing.two,
  },
  tile: {
    width: fluid(68),
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.half,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
