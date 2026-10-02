import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  PurchaseFormModal,
  type PurchaseFormValues,
} from '@/components/domain/purchase-form-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/ui/page-header';
import { RowActions } from '@/components/ui/row-actions';
import { Select } from '@/components/ui/select';
import { Radius, Spacing } from '@/constants/theme';
import { fluid } from '@/lib/fluid';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { IngredientImage } from '@/data/ingredient-images';
import { useScreenAccent, useTheme } from '@/hooks/use-theme';
import { currentMonthKey, shiftMonthKey } from '@/lib/dates';
import { formatAmountUnit, formatLongDate, formatMoney, formatMonthKey, formatUnitPrice } from '@/lib/format';
import { useData } from '@/store/data-provider';
import {
  filterPurchases,
  groupPurchasesByDay,
  monthSummary,
  round2,
  storesInUse,
  type CategoryFilter,
} from '@/store/selectors';
import type { Category, Purchase } from '@/store/types';

const ALL = 'all';

export default function SpendingScreen() {
  const accent = useScreenAccent('spending');
  const { db, addPurchase, updatePurchase, deletePurchase } = useData();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();

  const [month, setMonth] = useState(currentMonthKey());
  const [category, setCategory] = useState<CategoryFilter>(ALL);
  const [store, setStore] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Purchase | null>(null);

  // The Grocery Tracker links here with ?edit=<id> to jump straight into a
  // purchase's editor.
  const editId = typeof params.edit === 'string' ? params.edit : null;
  const editingFromUrl = editId ? (db.purchases.find((item) => item.id === editId) ?? null) : null;

  const filtered = filterPurchases(db.purchases, { month, category, store, search });
  const groups = groupPurchasesByDay(filtered);
  const summary = monthSummary(db.purchases, month);
  // What share of the month went on each category — the breakdown bar.
  const monthTotals = CATEGORY_ORDER.map((id) => ({
    category: id,
    total: round2(
      db.purchases
        .filter((purchase) => purchase.date.startsWith(month) && purchase.category === id)
        .reduce((sum, purchase) => sum + purchase.totalPrice, 0)
    ),
  })).filter((entry) => entry.total > 0);
  const stores = storesInUse(db.purchases);

  const hasAnyPurchase = db.purchases.length > 0;
  const modalVisible = formVisible || editingFromUrl !== null;
  const modalInitial = editing ?? editingFromUrl;

  const closeForm = () => {
    setFormVisible(false);
    setEditing(null);
    if (editingFromUrl) router.replace('/spending');
  };

  const handleSubmit = (values: PurchaseFormValues) => {
    const target = editing ?? editingFromUrl;
    if (target) {
      updatePurchase(target.id, values);
    } else {
      addPurchase(values);
    }
    closeForm();
  };

  const confirmDelete = () => {
    if (pendingDelete) deletePurchase(pendingDelete.id);
    setPendingDelete(null);
  };

  const openEdit = (purchase: Purchase) => {
    setEditing(purchase);
    setFormVisible(true);
  };

  return (
    <>
      <PageHeader
        title="Spending"
        accent={accent}
        subtitle="Everything you buy, and where"
        action={
          <Button
            label="+ Add purchase"
            variant="primary"
            testID="new-purchase"
            onPress={() => {
              setEditing(null);
              setFormVisible(true);
            }}
          />
        }
      />

      <Card testID="spending-filters">
        <View style={styles.monthRow}>
          <Button
            label="◀"
            variant="secondary"
            testID="spending-prev-month"
            onPress={() => setMonth((current) => shiftMonthKey(current, -1))}
          />
          <ThemedText type="smallBold" testID="spending-month">
            {formatMonthKey(month)}
          </ThemedText>
          <Button
            label="▶"
            variant="secondary"
            testID="spending-next-month"
            onPress={() => setMonth((current) => shiftMonthKey(current, 1))}
          />
          <Button
            label="This month"
            variant="ghost"
            testID="spending-this-month"
            onPress={() => setMonth(currentMonthKey())}
          />
        </View>

        <View style={styles.chipRow}>
          <Chip
            label="All"
            selected={category === ALL}
            onPress={() => setCategory(ALL)}
            testID="spending-category-all"
          />
          {CATEGORY_ORDER.map((id) => {
            const meta = CATEGORY_META[id];
            return (
              <Chip
                key={id}
                label={meta.label}
                color={theme[meta.colorKey]}
                selected={category === id}
                onPress={() => setCategory(id)}
                testID={`spending-category-${id}`}
              />
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Select
              label="Store"
              value={store}
              options={[{ value: ALL, label: 'All stores' }, ...stores.map((name) => ({ value: name, label: name }))]}
              onChange={setStore}
              testID="spending-store"
            />
          </View>
          <View style={styles.rowItem}>
            <FormField
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder="Item name"
              testID="spending-search"
            />
          </View>
        </View>
      </Card>

      <ThemedText type="small" themeColor="textSecondary" testID="spending-summary">
        {`${formatMonthKey(month)}: ${formatMoney(summary.total)} · ${summary.count} ${
          summary.count === 1 ? 'entry' : 'entries'
        }${summary.topStore ? ` · Top store: ${summary.topStore}` : ''}`}
      </ThemedText>

      {summary.total > 0 ? (
        <Card testID="spending-breakdown">
          <ThemedText type="smallBold">Where it went</ThemedText>
          <View style={styles.breakdownBar}>
            {categoryShares(monthTotals).map((share) => (
              <View
                key={share.category}
                testID={`spending-share-${share.category}`}
                style={{
                  width: `${share.percent}%`,
                  backgroundColor: theme[CATEGORY_META[share.category].colorKey],
                }}
              />
            ))}
          </View>
          <View style={styles.breakdownLegend}>
            {categoryShares(monthTotals).map((share) => (
              <View key={share.category} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: theme[CATEGORY_META[share.category].colorKey] }]}
                />
                <ThemedText type="caption" themeColor="textSecondary">
                  {`${CATEGORY_META[share.category].label} ${formatMoney(share.total)}`}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          icon="spending"
          message={
            hasAnyPurchase
              ? 'No purchases match your filters.'
              : 'No purchases yet — log your first one.'
          }
          hint={hasAnyPurchase ? 'Try another month or clear the filters.' : undefined}
        />
      ) : (
        groups.map((group) => (
          <Card key={group.date} testID={`spending-day-${group.date}`}>
            <View style={styles.dayHeader}>
              <ThemedText type="smallBold">{formatLongDate(group.date)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" testID={`spending-day-total-${group.date}`}>
                {`day total ${formatMoney(group.dayTotal)}`}
              </ThemedText>
            </View>

            {group.purchases.map((purchase) => (
              <PurchaseRow
                key={purchase.id}
                purchase={purchase}
                onEdit={() => openEdit(purchase)}
                onDelete={() => setPendingDelete(purchase)}
              />
            ))}
          </Card>
        ))
      )}

      <PurchaseFormModal
        visible={modalVisible}
        initial={modalInitial}
        allPurchases={db.purchases}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete this purchase?"
        message={`"${pendingDelete?.itemName ?? ''}" will be removed, and its price history too.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function PurchaseRow({
  purchase,
  onEdit,
  onDelete,
}: {
  purchase: Purchase;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const categoryColor = theme[CATEGORY_META[purchase.category].colorKey];
  const unitPrice = formatUnitPrice(purchase.totalPrice, purchase.amount);

  return (
    <View style={styles.purchaseRow} testID={`purchase-row-${purchase.id}`}>
      <IngredientImage
        imageKey={purchase.imageKey}
        icon={purchase.icon}
        size={36}
        testID={`purchase-picture-${purchase.id}`}
      />

      <Pressable
        testID={`purchase-open-${purchase.id}`}
        accessibilityRole="button"
        onPress={onEdit}
        style={styles.purchaseBody}>
        <View style={styles.purchaseNameRow}>
          <ThemedText type="smallBold" testID={`purchase-name-${purchase.id}`}>
            {purchase.itemName}
          </ThemedText>
          <Chip
            label={CATEGORY_META[purchase.category].label}
            color={categoryColor}
            selected
            testID={`purchase-category-chip-${purchase.id}`}
          />
        </View>
        <ThemedText type="caption" themeColor="textTertiary">
          {`${purchase.store} · ${formatAmountUnit(purchase.amount, purchase.unit)}${
            unitPrice ? ` · ${unitPrice}/${purchase.unit}` : ''
          }`}
        </ThemedText>
      </Pressable>

      <ThemedText type="smallBold" testID={`purchase-total-${purchase.id}`}>
        {formatMoney(purchase.totalPrice)}
      </ThemedText>

      <RowActions
        onEdit={onEdit}
        onDelete={onDelete}
        editTestID={`purchase-edit-${purchase.id}`}
        deleteTestID={`purchase-delete-${purchase.id}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  rowItem: {
    flex: 1,
    minWidth: fluid(180),
  },
  breakdownBar: {
    flexDirection: 'row',
    height: fluid(14),
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  breakdownLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: fluid(10),
    height: fluid(10),
    borderRadius: Radius.pill,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  purchaseIcon: {
    fontSize: 22,
    lineHeight: 28,
  },
  purchaseBody: {
    flex: 1,
    gap: Spacing.half,
  },
  purchaseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
});

/** The month's spending split across categories, as percentages of the total. */
function categoryShares(entries: { category: Category; total: number }[]) {
  const total = entries.reduce((sum, entry) => sum + entry.total, 0);
  return entries.map((entry) => ({
    ...entry,
    percent: total > 0 ? (entry.total / total) * 100 : 0,
  }));
}
