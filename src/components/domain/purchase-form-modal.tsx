import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AutocompleteField, type FieldHint } from '@/components/ui/autocomplete-field';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-field';
import { IngredientPicker } from '@/components/ui/ingredient-picker';
import { AppModal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { guessIngredientTile } from '@/data/ingredient-images';
import { UNIT_LABELS, UNIT_OPTIONS } from '@/data/units';
import { useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/lib/dates';
import { formatUnitPrice } from '@/lib/format';
import {
  findSimilarItemName,
  findSimilarStore,
  itemMemory,
  itemSuggestions,
  normalizeItemName,
  recentTileKeys,
  storeSuggestions,
} from '@/store/selectors';
import type { Category, Purchase, Unit } from '@/store/types';

export interface PurchaseFormValues {
  date: string;
  itemName: string;
  imageKey?: string;
  category: Category;
  amount: number;
  unit: Unit;
  totalPrice: number;
  store: string;
}

/**
 * The add/edit pop-up for a purchase — with the item memory (pick a past item
 * and everything fills itself in), the live "= $x per unit" preview, and the
 * saved-name notices that keep one item from being stored twice.
 */
export function PurchaseFormModal({
  visible,
  initial,
  allPurchases,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial?: Purchase | null;
  allPurchases: Purchase[];
  onClose: () => void;
  onSubmit: (values: PurchaseFormValues) => void;
}) {
  return (
    <AppModal
      visible={visible}
      title={initial ? 'Edit purchase' : 'Add purchase'}
      onClose={onClose}
      testID="purchase-form">
      {visible ? (
        <PurchaseForm
          key={initial?.id ?? 'new'}
          initial={initial ?? null}
          allPurchases={allPurchases}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </AppModal>
  );
}

function parseNumber(text: string): number {
  return Number(text.replace(',', '.'));
}

function PurchaseForm({
  initial,
  allPurchases,
  onCancel,
  onSubmit,
}: {
  initial: Purchase | null;
  allPurchases: Purchase[];
  onCancel: () => void;
  onSubmit: (values: PurchaseFormValues) => void;
}) {
  const theme = useTheme();

  const [itemName, setItemName] = useState(initial?.itemName ?? '');
  // Old (version-1) rows carry an emoji instead of a tile; guess the matching
  // picture from the name so editing them does not start with a blank square.
  const [imageKey, setImageKey] = useState(
    initial?.imageKey ?? guessIngredientTile(initial?.itemName ?? '')?.key ?? ''
  );
  const [pictureTouched, setPictureTouched] = useState(Boolean(initial?.imageKey));
  const hasLegacyIcon = Boolean(initial?.icon);
  const [category, setCategory] = useState<Category>(initial?.category ?? 'grocery');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'pcs');
  const [totalPrice, setTotalPrice] = useState(initial ? String(initial.totalPrice) : '');
  const [store, setStore] = useState(initial?.store ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const recent = useMemo(() => recentTileKeys(allPurchases), [allPurchases]);

  const nameSuggestions = itemSuggestions(allPurchases, itemName).map((entry) => ({
    value: entry.name,
    label: entry.name,
    hint: `${entry.store} · last ${entry.lastDate}`,
  }));
  const storeSuggestionList = storeSuggestions(allPurchases, store).map((name) => ({
    value: name,
    label: name,
  }));

  /** The saved name this looks like a misspelling of. */
  const similarName = findSimilarItemName(allPurchases, itemName);
  const similarStore = findSimilarStore(allPurchases, store);

  const nameHint: FieldHint | null = similarName
    ? {
        message: `You already track “${similarName}”.`,
        actionLabel: 'Use it',
        onAction: () => applyItemMemory(similarName),
      }
    : null;

  const storeHint: FieldHint | null = similarStore
    ? {
        message: `You already shop at “${similarStore}”.`,
        actionLabel: 'Use it',
        onAction: () => setStore(similarStore),
      }
    : null;

  const amountValue = parseNumber(amount);
  const totalValue = parseNumber(totalPrice);
  const unitPrice = formatUnitPrice(totalValue, amountValue);

  /** Typing a name picks the closest picture until one is chosen by hand. */
  const handleNameChange = (text: string) => {
    setItemName(text);
    if (!pictureTouched) {
      setImageKey(guessIngredientTile(text)?.key ?? '');
    }
  };

  /** Picking a past item fills in everything the app already knows about it. */
  const applyItemMemory = (name: string) => {
    const entry = itemMemory(allPurchases)[normalizeItemName(name)];
    if (!entry) {
      handleNameChange(name);
      return;
    }
    setItemName(entry.name);
    if (entry.imageKey) {
      setImageKey(entry.imageKey);
      setPictureTouched(true);
    } else {
      handleNameChange(entry.name);
    }
    setCategory(entry.category);
    setUnit(entry.unit);
    setStore(entry.store);
  };

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!itemName.trim()) nextErrors.itemName = 'Item name is required';
    if (!imageKey && !hasLegacyIcon) nextErrors.imageKey = 'Pick a picture';
    if (!(amountValue > 0)) nextErrors.amount = 'Enter an amount above 0';
    if (!(totalValue > 0)) nextErrors.totalPrice = 'Enter a price above 0';
    if (!store.trim()) nextErrors.store = 'Store is required';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      date,
      itemName: itemName.trim(),
      imageKey,
      category,
      amount: amountValue,
      unit,
      totalPrice: totalValue,
      store: store.trim(),
    });
  };

  return (
    <View style={styles.form}>
      <AutocompleteField
        label="Item name"
        required
        value={itemName}
        onChangeText={handleNameChange}
        suggestions={nameSuggestions}
        onSelectSuggestion={(suggestion) => applyItemMemory(suggestion.value)}
        placeholder="e.g. Soy sauce"
        error={errors.itemName}
        testID="purchase-name"
        hint={nameHint}
      />

      <IngredientPicker
        value={imageKey}
        onChange={(key) => {
          setImageKey(key);
          setPictureTouched(true);
        }}
        recent={recent}
        testID="purchase-picture"
      />
      {errors.imageKey ? (
        <ThemedText type="caption" themeColor="dangerText">
          {errors.imageKey}
        </ThemedText>
      ) : null}

      <View style={styles.field}>
        <ThemedText type="label">Category</ThemedText>
        <View style={styles.categoryRow}>
          {CATEGORY_ORDER.map((id) => {
            const meta = CATEGORY_META[id];
            const color = theme[meta.colorKey];
            const selected = category === id;
            return (
              <Pressable
                key={id}
                testID={`purchase-category-${id}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCategory(id)}
                style={({ pressed }) => [
                  styles.categoryButton,
                  {
                    borderColor: selected ? color : theme.border,
                    borderStyle: selected ? 'solid' : 'dashed',
                    backgroundColor: selected ? theme.backgroundSelected : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="caption"
                  style={{ color: selected ? color : theme.textSecondary, fontWeight: selected ? 700 : 500 }}>
                  {meta.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <FormField
            label="Amount"
            required
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 2"
            keyboardType="decimal-pad"
            error={errors.amount}
            testID="purchase-amount"
          />
        </View>
        <View style={styles.rowItem}>
          <Select
            label="Unit"
            value={unit}
            options={UNIT_OPTIONS.map((option) => ({ value: option, label: UNIT_LABELS[option] }))}
            onChange={setUnit}
            testID="purchase-unit"
          />
        </View>
      </View>

      <FormField
        label="Total price"
        required
        value={totalPrice}
        onChangeText={setTotalPrice}
        placeholder="e.g. 6.45"
        keyboardType="decimal-pad"
        error={errors.totalPrice}
        testID="purchase-total"
      />

      <ThemedText type="smallBold" themeColor="textSecondary" testID="unit-price-preview">
        {unitPrice ? `= ${unitPrice} per ${unit}` : '= price per unit appears here'}
      </ThemedText>

      <AutocompleteField
        label="Store"
        required
        value={store}
        onChangeText={setStore}
        suggestions={storeSuggestionList}
        onSelectSuggestion={(suggestion) => setStore(suggestion.value)}
        placeholder="e.g. SuperMart"
        error={errors.store}
        testID="purchase-store"
        onSubmitEditing={handleSubmit}
        hint={storeHint}
      />

      <DatePicker label="Date" value={date} onChange={setDate} testID="purchase-date" />

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} testID="purchase-cancel" />
        <Button
          label={initial ? 'Save changes' : 'Add purchase'}
          variant="primary"
          onPress={handleSubmit}
          testID="purchase-save"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowItem: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.75,
  },
});
