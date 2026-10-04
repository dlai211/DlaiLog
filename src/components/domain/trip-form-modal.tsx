import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AutocompleteField, type FieldHint, type Suggestion } from '@/components/ui/autocomplete-field';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-field';
import { IconButton } from '@/components/ui/icon-button';
import { IngredientPicker } from '@/components/ui/ingredient-picker';
import { AppModal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Radius, Spacing, soft } from '@/constants/theme';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { IngredientImage, guessIngredientTile } from '@/data/ingredient-images';
import { UNIT_LABELS, UNIT_OPTIONS } from '@/data/units';
import { useAccents, useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { newId } from '@/lib/id';
import {
  findSimilarItemName,
  findSimilarStore,
  itemMemory,
  itemSuggestions,
  recentTileKeys,
  storeSuggestions,
} from '@/store/selectors';
import type { Category, Purchase, Unit } from '@/store/types';

export interface TripItemValues {
  itemName: string;
  imageKey?: string;
  category: Category;
  amount: number;
  unit: Unit;
  /** What was paid for this item, after any savings. */
  totalPrice: number;
  savings?: number;
}

export interface TripFormValues {
  store: string;
  date: string;
  items: TripItemValues[];
}

interface TripRowDraft {
  key: string;
  name: string;
  imageKey: string;
  category: Category;
  quantity: string;
  unit: Unit;
  price: string;
  savings: string;
  /** True once the picture has been chosen by hand for this row. */
  pictureTouched: boolean;
}

function emptyRow(): TripRowDraft {
  return {
    key: newId(),
    name: '',
    imageKey: '',
    category: 'grocery',
    quantity: '1',
    unit: 'pcs',
    price: '',
    savings: '',
    pictureTouched: false,
  };
}

function parseNumber(text: string): number {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Logging a whole shopping trip at once (PRD §29).
 *
 * Entering a receipt one purchase at a time is slow, so this is the batch
 * form: the store and date once, then a row per item — each with the picture
 * the app guessed from its name, its category, quantity and unit, what was
 * paid and what was saved. Everything saves in one go, and the pantry moves
 * for every item exactly as it would have one at a time.
 */
export function TripFormModal({
  visible,
  allPurchases,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  allPurchases: Purchase[];
  onClose: () => void;
  onSubmit: (values: TripFormValues) => void;
}) {
  return (
    <AppModal
      visible={visible}
      title="Log shopping trip"
      size="wide"
      onClose={onClose}
      testID="trip-form">
      {visible ? (
        <TripForm allPurchases={allPurchases} onCancel={onClose} onSubmit={onSubmit} />
      ) : null}
    </AppModal>
  );
}

function TripForm({
  allPurchases,
  onCancel,
  onSubmit,
}: {
  allPurchases: Purchase[];
  onCancel: () => void;
  onSubmit: (values: TripFormValues) => void;
}) {
  const theme = useTheme();
  const accents = useAccents();

  const [store, setStore] = useState('');
  const [date, setDate] = useState(todayKey());
  const [rows, setRows] = useState<TripRowDraft[]>(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [openPictureFor, setOpenPictureFor] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | undefined>(undefined);
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const recent = useMemo(() => recentTileKeys(allPurchases), [allPurchases]);
  const storeSuggestionList = storeSuggestions(allPurchases, store).map((name) => ({
    value: name,
    label: name,
  }));
  const similarStore = findSimilarStore(allPurchases, store);
  const storeHint: FieldHint | null = similarStore
    ? {
        message: `You already shop at “${similarStore}”.`,
        actionLabel: 'Use it',
        onAction: () => setStore(similarStore),
      }
    : null;

  const filledRows = rows.filter((row) => row.name.trim().length > 0);

  const totals = rows.reduce(
    (sum, row) => {
      const paid = parseNumber(row.price);
      const saved = parseNumber(row.savings);
      return {
        gross: sum.gross + paid + saved,
        savings: sum.savings + saved,
        paid: sum.paid + paid,
      };
    },
    { gross: 0, savings: 0, paid: 0 }
  );

  const updateRow = (key: string, patch: Partial<TripRowDraft>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  /** Picking a past item fills in everything the app already knows about it. */
  const applyItemMemory = (key: string, name: string) => {
    const entry = itemMemory(allPurchases)[name.trim().toLowerCase()];
    if (!entry) {
      updateRow(key, { name });
      return;
    }

    updateRow(key, {
      name: entry.name,
      imageKey: entry.imageKey ?? guessIngredientTile(entry.name)?.key ?? '',
      category: entry.category,
      unit: entry.unit,
      price: String(entry.lastPrice),
      pictureTouched: Boolean(entry.imageKey),
    });

    if (!store.trim()) setStore(entry.store);
  };

  const handleSubmit = () => {
    const items: TripItemValues[] = [];
    const nextPriceErrors: Record<string, string> = {};

    for (const row of filledRows) {
      const paid = parseNumber(row.price);
      if (!(paid > 0)) {
        nextPriceErrors[row.key] = 'Enter what you paid';
        continue;
      }
      const amount = parseNumber(row.quantity);
      const saved = parseNumber(row.savings);
      items.push({
        itemName: row.name.trim(),
        imageKey: row.imageKey || guessIngredientTile(row.name)?.key,
        category: row.category,
        amount: amount > 0 ? amount : 1,
        unit: row.unit,
        totalPrice: paid,
        savings: saved > 0 ? saved : undefined,
      });
    }

    const nextStoreError = store.trim() ? undefined : 'Store is required';
    const nextFormError =
      filledRows.length === 0 ? 'Add at least one item with a name.' : undefined;

    setPriceErrors(nextPriceErrors);
    setStoreError(nextStoreError);
    setFormError(nextFormError);

    if (nextStoreError || nextFormError || Object.keys(nextPriceErrors).length > 0) return;

    onSubmit({ store: store.trim(), date, items });
  };

  return (
    <View style={styles.form}>
      <View style={styles.headerRow}>
        <View style={styles.headerField}>
          <AutocompleteField
            label="Store"
            required
            value={store}
            onChangeText={(text) => {
              setStore(text);
              if (storeError) setStoreError(undefined);
            }}
            suggestions={storeSuggestionList}
            onSelectSuggestion={(suggestion) => setStore(suggestion.value)}
            placeholder="e.g. Albertsons"
            error={storeError}
            testID="trip-store"
            hint={storeHint}
          />
        </View>
        <View style={styles.headerField}>
          <DatePicker label="Date" value={date} onChange={setDate} testID="trip-date" />
        </View>
      </View>

      <View style={styles.itemsHeader}>
        <ThemedText type="smallBold">Items</ThemedText>
        <ThemedText type="caption" themeColor="textTertiary">
          {`${filledRows.length} ${filledRows.length === 1 ? 'item' : 'items'}`}
        </ThemedText>
      </View>

      {rows.map((row, index) => {
        const suggestions: Suggestion[] = itemSuggestions(allPurchases, row.name, 4).map(
          (entry) => ({
            value: entry.name,
            label: entry.name,
            hint: `${entry.store} · last ${entry.lastPrice}`,
          })
        );
        const similarName = findSimilarItemName(allPurchases, row.name);
        const nameHint: FieldHint | null = similarName
          ? {
              message: `You already track “${similarName}”.`,
              actionLabel: 'Use it',
              onAction: () => applyItemMemory(row.key, similarName),
            }
          : null;

        return (
          <View
            key={row.key}
            testID={`trip-item-${index}`}
            style={[styles.itemCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <View style={styles.itemTop}>
              <Pressable
                testID={`trip-item-picture-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Choose a picture for item ${index + 1}`}
                onPress={() => setOpenPictureFor((current) => (current === row.key ? null : row.key))}>
                <IngredientImage imageKey={row.imageKey || undefined} size={40} />
              </Pressable>

              <View style={styles.itemName}>
                <AutocompleteField
                  label="Item name"
                  value={row.name}
                  onChangeText={(text) => {
                    updateRow(row.key, {
                      name: text,
                      imageKey: row.pictureTouched
                        ? row.imageKey
                        : (guessIngredientTile(text)?.key ?? ''),
                    });
                    if (formError) setFormError(undefined);
                  }}
                  suggestions={suggestions}
                  onSelectSuggestion={(suggestion) => applyItemMemory(row.key, suggestion.value)}
                  placeholder="e.g. Ketchup"
                  testID={`trip-item-name-${index}`}
                  hint={nameHint}
                />
              </View>

              <IconButton
                icon="close"
                label={`Remove item ${index + 1}`}
                onPress={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
                testID={`trip-item-remove-${index}`}
              />
            </View>

            {openPictureFor === row.key ? (
              <IngredientPicker
                value={row.imageKey}
                onChange={(key) => {
                  updateRow(row.key, { imageKey: key, pictureTouched: true });
                  setOpenPictureFor(null);
                }}
                recent={recent}
                testID={`trip-item-picker-${index}`}
              />
            ) : null}

            <View style={styles.fields}>
              <View style={styles.field}>
                <Select
                  label="Category"
                  value={row.category}
                  options={CATEGORY_ORDER.map((id) => ({
                    value: id,
                    label: CATEGORY_META[id].label,
                  }))}
                  onChange={(category) => updateRow(row.key, { category })}
                  testID={`trip-item-category-${index}`}
                />
              </View>
              <View style={styles.field}>
                <FormField
                  label="Qty"
                  value={row.quantity}
                  onChangeText={(quantity) => updateRow(row.key, { quantity })}
                  placeholder="1"
                  keyboardType="decimal-pad"
                  testID={`trip-item-qty-${index}`}
                />
              </View>
              <View style={styles.field}>
                <Select
                  label="Unit"
                  value={row.unit}
                  options={UNIT_OPTIONS.map((option) => ({
                    value: option,
                    label: UNIT_LABELS[option],
                  }))}
                  onChange={(unit) => updateRow(row.key, { unit })}
                  testID={`trip-item-unit-${index}`}
                />
              </View>
              <View style={styles.field}>
                <FormField
                  label="Paid"
                  value={row.price}
                  onChangeText={(price) => {
                    updateRow(row.key, { price });
                    if (priceErrors[row.key]) {
                      setPriceErrors((current) => {
                        const next = { ...current };
                        delete next[row.key];
                        return next;
                      });
                    }
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={priceErrors[row.key]}
                  testID={`trip-item-price-${index}`}
                />
              </View>
              <View style={styles.field}>
                <FormField
                  label="Saved"
                  value={row.savings}
                  onChangeText={(savings) => updateRow(row.key, { savings })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  testID={`trip-item-savings-${index}`}
                />
              </View>
            </View>
          </View>
        );
      })}

      <Button
        label="+ Add another item"
        variant="secondary"
        onPress={() => setRows((current) => [...current, emptyRow()])}
        testID="trip-add-item"
      />

      {formError ? (
        <ThemedText type="small" themeColor="dangerText" testID="trip-form-error">
          {formError}
        </ThemedText>
      ) : null}

      {/* The summary and the buttons stay put while the item list scrolls. */}
      <View style={[styles.summary, { borderColor: theme.border, backgroundColor: soft(accents.sage, '14') }]}>
        <View style={styles.summaryRow}>
          <ThemedText type="caption" themeColor="textSecondary">
            Items gross
          </ThemedText>
          <ThemedText type="smallBold" testID="trip-summary-gross">
            {formatMoney(totals.gross)}
          </ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText type="caption" themeColor="textSecondary">
            Total savings
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: accents.mint }} testID="trip-summary-savings">
            {totals.savings > 0 ? `−${formatMoney(totals.savings)}` : formatMoney(0)}
          </ThemedText>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal, { borderTopColor: theme.border }]}>
          <ThemedText type="smallBold">Final paid</ThemedText>
          <ThemedText type="heading" testID="trip-summary-paid">
            {formatMoney(totals.paid)}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onCancel} testID="trip-cancel" />
          <Button
            label={`Save trip (${filledRows.length} ${
              filledRows.length === 1 ? 'item' : 'items'
            })`}
            variant="primary"
            onPress={handleSubmit}
            testID="trip-save"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  headerField: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 200,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemCard: {
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.two,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
    minWidth: 160,
  },
  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  field: {
    flexGrow: 1,
    flexBasis: 110,
    minWidth: 96,
  },
  summary: {
    gap: Spacing.oneHalf,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryTotal: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
