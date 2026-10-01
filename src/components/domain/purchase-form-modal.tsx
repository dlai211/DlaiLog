import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AutocompleteField } from '@/components/ui/autocomplete-field';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { FormField } from '@/components/ui/form-field';
import { AppModal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Spacing } from '@/constants/theme';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { UNIT_LABELS, UNIT_OPTIONS } from '@/data/units';
import { useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/lib/dates';
import { formatUnitPrice } from '@/lib/format';
import {
  itemMemory,
  itemSuggestions,
  normalizeItemName,
  recentIcons,
  storeSuggestions,
} from '@/store/selectors';
import type { Category, Purchase, Unit } from '@/store/types';

export interface PurchaseFormValues {
  date: string;
  itemName: string;
  icon: string;
  category: Category;
  amount: number;
  unit: Unit;
  totalPrice: number;
  store: string;
}

/**
 * The add/edit pop-up for a purchase (PRD §5.4) — including the item memory
 * (pick a past item and its icon/category/unit/store fill themselves in) and
 * the live "= $x per unit" preview.
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
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'grocery');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'pcs');
  const [totalPrice, setTotalPrice] = useState(initial ? String(initial.totalPrice) : '');
  const [store, setStore] = useState(initial?.store ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const recent = useMemo(() => recentIcons(allPurchases), [allPurchases]);
  const nameSuggestions = itemSuggestions(allPurchases, itemName).map((entry) => ({
    value: entry.name,
    label: entry.name,
    hint: `${entry.icon} ${CATEGORY_META[entry.category].label} · ${entry.store}`,
  }));
  const storeSuggestionList = storeSuggestions(allPurchases, store).map((name) => ({
    value: name,
    label: name,
  }));

  const amountValue = parseNumber(amount);
  const totalValue = parseNumber(totalPrice);
  const unitPrice = formatUnitPrice(totalValue, amountValue);

  /** Picking a past item fills in everything the app already knows about it. */
  const applyItemMemory = (name: string) => {
    const entry = itemMemory(allPurchases)[normalizeItemName(name)];
    if (!entry) {
      setItemName(name);
      return;
    }
    setItemName(entry.name);
    setIcon(entry.icon);
    setCategory(entry.category);
    setUnit(entry.unit);
    setStore(entry.store);
  };

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!itemName.trim()) nextErrors.itemName = 'Item name is required';
    if (!icon) nextErrors.icon = 'Pick an icon';
    if (!(amountValue > 0)) nextErrors.amount = 'Enter an amount above 0';
    if (!(totalValue > 0)) nextErrors.totalPrice = 'Enter a price above 0';
    if (!store.trim()) nextErrors.store = 'Store is required';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      date,
      itemName: itemName.trim(),
      icon,
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
        onChangeText={setItemName}
        suggestions={nameSuggestions}
        onSelectSuggestion={(suggestion) => applyItemMemory(suggestion.value)}
        placeholder="e.g. Soy sauce"
        error={errors.itemName}
        testID="purchase-name"
      />

      <EmojiPicker value={icon} onChange={setIcon} recent={recent} testID="purchase-icon" />
      {errors.icon ? (
        <ThemedText type="caption" themeColor="dangerText">
          {errors.icon}
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
                    backgroundColor: selected ? theme.backgroundSelected : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small">{meta.emoji}</ThemedText>
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

      <ThemedText
        type="smallBold"
        themeColor="textSecondary"
        testID="unit-price-preview">
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
    gap: Spacing.half,
    borderWidth: 1,
    borderRadius: Spacing.two,
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
