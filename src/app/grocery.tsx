import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { LineChart, Sparkline } from '@/components/ui/line-chart';
import { PageHeader } from '@/components/ui/page-header';
import { Spacing } from '@/constants/theme';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { IngredientImage } from '@/data/ingredient-images';
import { useScreenAccent, useTheme } from '@/hooks/use-theme';
import {
  formatAmountUnit,
  formatMoney,
  formatPercentChange,
  formatShortDate,
  formatUnitPrice,
} from '@/lib/format';
import { useData } from '@/store/data-provider';
import { categoryCounts, groceryItems, type GroceryItem } from '@/store/selectors';
import type { Category } from '@/store/types';
import { fluid } from '@/lib/fluid';

export default function GroceryScreen() {
  const accent = useScreenAccent('grocery');
  const { db } = useData();
  const theme = useTheme();
  const router = useRouter();

  const [category, setCategory] = useState<Category>('condiment');
  const [search, setSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const items = groceryItems(db.purchases);
  const counts = categoryCounts(items);
  const query = search.trim().toLowerCase();
  const visibleItems = items.filter(
    (item) => item.category === category && (!query || item.name.toLowerCase().includes(query))
  );

  const hasAnyItems = items.length > 0;

  return (
    <>
      <PageHeader
        title="Grocery Tracker"
        accent={accent}
        subtitle="Built automatically from your Spending entries — nothing to add here"
      />

      <View style={styles.tabs}>
        {CATEGORY_ORDER.map((id) => {
          const meta = CATEGORY_META[id];
          return (
            <Chip
              key={id}
              label={`${meta.label} (${counts[id]})`}
              color={theme[meta.colorKey]}
              selected={category === id}
              onPress={() => setCategory(id)}
              testID={`grocery-tab-${id}`}
            />
          );
        })}
      </View>

      <View style={styles.searchRow}>
        <FormField
          label="Search items"
          value={search}
          onChangeText={setSearch}
          placeholder="e.g. soy"
          testID="grocery-search"
        />
      </View>

      {!hasAnyItems ? (
        <EmptyState
          icon="cart"
          message="No items yet — log a purchase in Spending and it appears here automatically."
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon="search"
          message={query ? 'No items match your search.' : `Nothing in ${CATEGORY_META[category].label} yet.`}
        />
      ) : (
        visibleItems.map((item) => (
          <GroceryItemCard
            key={item.key}
            item={item}
            expanded={expandedKey === item.key}
            onToggle={() => setExpandedKey(expandedKey === item.key ? null : item.key)}
            onEditEntry={(purchaseId) =>
              router.push({ pathname: '/spending', params: { edit: purchaseId } })
            }
          />
        ))
      )}
    </>
  );
}

function GroceryItemCard({
  item,
  expanded,
  onToggle,
  onEditEntry,
}: {
  item: GroceryItem;
  expanded: boolean;
  onToggle: () => void;
  onEditEntry: (purchaseId: string) => void;
}) {
  const theme = useTheme();
  const categoryColor = theme[CATEGORY_META[item.category].colorKey];
  const unitPriceLabel = formatUnitPrice(item.latestUnitPrice, 1);

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Pressable
        testID={`grocery-item-${item.key}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.cardHeader}>
        <IngredientImage imageKey={item.imageKey} icon={item.icon} size={36} />

        <View style={styles.cardBody}>
          <ThemedText type="smallBold" testID={`grocery-name-${item.key}`}>
            {item.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            {`last bought ${formatShortDate(item.lastDate)} · ${item.lastStore}`}
          </ThemedText>
        </View>

        <View style={styles.priceBlock}>
          <ThemedText type="smallBold" testID={`grocery-price-${item.key}`}>
            {unitPriceLabel ? `${unitPriceLabel}/${item.unit}` : '—'}
          </ThemedText>
          <ChangeLabel item={item} />
        </View>

        <Sparkline
          values={item.history.map((entry) => entry.unitPrice)}
          testID={`grocery-sparkline-${item.key}`}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.details} testID={`grocery-details-${item.key}`}>
          <LineChart
            testID={`grocery-chart-${item.key}`}
            points={item.history.map((entry) => ({
              label: formatShortDate(entry.date),
              value: entry.unitPrice,
            }))}
          />

          <ThemedText type="small" themeColor="textSecondary" testID={`grocery-stats-${item.key}`}>
            {`Low ${formatMoney(item.low)} · High ${formatMoney(item.high)} · Average ${formatMoney(
              item.average
            )} · Total spent ${formatMoney(item.totalSpent)}  (per ${item.unit})`}
          </ThemedText>

          <View style={styles.history}>
            {item.history.map((entry) => (
              <View key={entry.id} style={styles.historyRow} testID={`grocery-history-${entry.id}`}>
                <ThemedText type="caption" style={styles.historyDate}>
                  {formatShortDate(entry.date)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.historyStore}>
                  {entry.store}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {`${formatAmountUnit(entry.amount, entry.unit)} · ${formatMoney(entry.totalPrice)}`}
                </ThemedText>
                <ThemedText type="caption" style={{ color: categoryColor }}>
                  {formatUnitPrice(entry.unitPrice, 1) ?? '—'}
                </ThemedText>
                <Pressable
                  testID={`grocery-edit-${entry.id}`}
                  accessibilityRole="button"
                  onPress={() => onEditEntry(entry.id)}>
                  <ThemedText type="caption" themeColor="primary">
                    edit in Spending ↗
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ChangeLabel({ item }: { item: GroceryItem }) {
  if (item.changePercent === null) {
    return (
      <ThemedText type="caption" themeColor="textTertiary" testID={`grocery-change-${item.key}`}>
        — first purchase
      </ThemedText>
    );
  }

  if (Math.abs(item.changePercent) < 0.5) {
    return (
      <ThemedText type="caption" themeColor="textTertiary" testID={`grocery-change-${item.key}`}>
        — same
      </ThemedText>
    );
  }

  const rising = item.changePercent > 0;

  return (
    <ThemedText
      type="caption"
      themeColor={rising ? 'dangerText' : 'successText'}
      testID={`grocery-change-${item.key}`}>
      {`${rising ? '▲' : '▼'} ${formatPercentChange(item.changePercent)}`}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  searchRow: {
    maxWidth: fluid(320),
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  icon: {
    fontSize: 22,
    lineHeight: 28,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
    minWidth: fluid(140),
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  details: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  history: {
    gap: Spacing.one,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  historyDate: {
    minWidth: fluid(52),
  },
  historyStore: {
    minWidth: fluid(90),
  },
});
