import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AutocompleteField } from '@/components/ui/autocomplete-field';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { IngredientPicker } from '@/components/ui/ingredient-picker';
import { AppModal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { guessIngredientTile } from '@/data/ingredient-images';
import { UNIT_LABELS, UNIT_OPTIONS } from '@/data/units';
import { useTheme } from '@/hooks/use-theme';
import {
  findSimilarItemName,
  ingredientNameSuggestions,
  itemMemory,
  normalizeItemName,
} from '@/store/selectors';
import type { Category, Ingredient, Purchase, Unit } from '@/store/types';

export interface InventoryFormValues {
  name: string;
  key: string;
  imageKey?: string;
  category: Category;
  quantity: number;
  unit: Unit;
}

/** Add or edit a pantry item by hand (purchases add to the pantry on their own). */
export function InventoryFormModal({
  visible,
  initial,
  allPurchases,
  inventory,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial?: Ingredient | null;
  allPurchases: Purchase[];
  inventory: Ingredient[];
  onClose: () => void;
  onSubmit: (values: InventoryFormValues) => void;
}) {
  return (
    <AppModal
      visible={visible}
      title={initial ? 'Edit pantry item' : 'Add pantry item'}
      onClose={onClose}
      testID="inventory-form">
      {visible ? (
        <InventoryForm
          key={initial?.id ?? 'new'}
          initial={initial ?? null}
          allPurchases={allPurchases}
          inventory={inventory}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </AppModal>
  );
}

function InventoryForm({
  initial,
  allPurchases,
  inventory,
  onCancel,
  onSubmit,
}: {
  initial: Ingredient | null;
  allPurchases: Purchase[];
  inventory: Ingredient[];
  onCancel: () => void;
  onSubmit: (values: InventoryFormValues) => void;
}) {
  const theme = useTheme();

  const [name, setName] = useState(initial?.name ?? '');
  const [imageKey, setImageKey] = useState(
    initial?.imageKey ?? guessIngredientTile(initial?.name ?? '')?.key ?? ''
  );
  const [category, setCategory] = useState<Category>(initial?.category ?? 'grocery');
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '1');
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'pcs');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const suggestions = ingredientNameSuggestions(allPurchases, inventory, name).map((entry) => ({
    value: entry.name,
    label: entry.name,
    hint: entry.hint,
  }));

  const similar = findSimilarItemName(allPurchases, name);
  const key = normalizeItemName(name);

  const applyName = (picked: string) => {
    setName(picked);
    const known =
      inventory.find((item) => item.key === normalizeItemName(picked)) ??
      undefined;
    if (known) {
      setCategory(known.category);
      setUnit(known.unit);
      if (known.imageKey) setImageKey(known.imageKey);
      return;
    }
    const memory = itemMemory(allPurchases)[normalizeItemName(picked)];
    if (memory) {
      setCategory(memory.category);
      setUnit(memory.unit);
      if (memory.imageKey) setImageKey(memory.imageKey);
    }
  };

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Name is required';
    const quantityValue = Number(quantity.replace(',', '.'));
    if (!(quantityValue >= 0)) nextErrors.quantity = 'Enter an amount (0 or more)';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: name.trim(),
      key,
      imageKey: imageKey || undefined,
      category,
      quantity: quantityValue,
      unit,
    });
  };

  return (
    <View style={styles.form}>
      <AutocompleteField
        label="Item"
        required
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (!initial?.imageKey) setImageKey(guessIngredientTile(text)?.key ?? '');
        }}
        suggestions={suggestions}
        onSelectSuggestion={(suggestion) => applyName(suggestion.value)}
        placeholder="e.g. Olive oil"
        error={errors.name}
        testID="inventory-name"
        hint={
          similar
            ? {
                message: `You already track “${similar}”.`,
                actionLabel: 'Use it',
                onAction: () => applyName(similar),
              }
            : null
        }
      />

      <IngredientPicker value={imageKey} onChange={setImageKey} testID="inventory-picture" />

      <View style={styles.field}>
        <ThemedText type="label">Category</ThemedText>
        <View style={styles.row}>
          {CATEGORY_ORDER.map((id) => {
            const meta = CATEGORY_META[id];
            const color = theme[meta.colorKey];
            const selected = category === id;
            return (
              <Pressable
                key={id}
                testID={`inventory-category-${id}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCategory(id)}
                style={[
                  styles.categoryButton,
                  {
                    borderColor: selected ? color : theme.border,
                    borderStyle: selected ? 'solid' : 'dashed',
                    backgroundColor: selected ? theme.backgroundSelected : 'transparent',
                  },
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
            label="In stock"
            required
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 2"
            keyboardType="decimal-pad"
            error={errors.quantity}
            testID="inventory-quantity"
          />
        </View>
        <View style={styles.rowItem}>
          <Select
            label="Unit"
            value={unit}
            options={UNIT_OPTIONS.map((option) => ({ value: option, label: UNIT_LABELS[option] }))}
            onChange={setUnit}
            testID="inventory-unit"
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} testID="inventory-cancel" />
        <Button
          label={initial ? 'Save changes' : 'Add to pantry'}
          variant="primary"
          onPress={handleSubmit}
          testID="inventory-save"
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
});
