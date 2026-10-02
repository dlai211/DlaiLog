import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AutocompleteField } from '@/components/ui/autocomplete-field';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { AppModal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { UNIT_LABELS, UNIT_OPTIONS } from '@/data/units';
import { useTheme } from '@/hooks/use-theme';
import { newId } from '@/lib/id';
import { pickPhotoAsDataUrl } from '@/lib/photo';
import { ingredientNameSuggestions, normalizeItemName } from '@/store/selectors';
import type { Ingredient, Meal, MealIngredient, Purchase, Unit } from '@/store/types';

export interface MealFormValues {
  name: string;
  photo?: string;
  ingredients: MealIngredient[];
  steps: string;
  notes?: string;
}

interface IngredientDraft {
  id: string;
  name: string;
  amount: string;
  unit: Unit;
}

function toDraft(ingredient: MealIngredient): IngredientDraft {
  return {
    id: ingredient.id,
    name: ingredient.name,
    amount: ingredient.amount === undefined ? '' : String(ingredient.amount),
    unit: ingredient.unit ?? 'pcs',
  };
}

/** Add or edit a dish: its picture, its ingredients and how to cook it. */
export function MealFormModal({
  visible,
  initial,
  allPurchases,
  inventory,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial?: Meal | null;
  allPurchases: Purchase[];
  inventory: Ingredient[];
  onClose: () => void;
  onSubmit: (values: MealFormValues) => void;
}) {
  return (
    <AppModal
      visible={visible}
      title={initial ? 'Edit meal' : 'New meal'}
      onClose={onClose}
      testID="meal-form">
      {visible ? (
        <MealForm
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

function MealForm({
  initial,
  allPurchases,
  inventory,
  onCancel,
  onSubmit,
}: {
  initial: Meal | null;
  allPurchases: Purchase[];
  inventory: Ingredient[];
  onCancel: () => void;
  onSubmit: (values: MealFormValues) => void;
}) {
  const theme = useTheme();
  const { showToast } = useToast();

  const [name, setName] = useState(initial?.name ?? '');
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [steps, setSteps] = useState(initial?.steps ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initial ? initial.ingredients.map(toDraft) : [{ id: newId(), name: '', amount: '', unit: 'pcs' }]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateIngredient = (id: string, patch: Partial<IngredientDraft>) => {
    setIngredients((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  };

  const removeIngredient = (id: string) => {
    setIngredients((current) => current.filter((draft) => draft.id !== id));
  };

  const addIngredient = () => {
    setIngredients((current) => [...current, { id: newId(), name: '', amount: '', unit: 'pcs' }]);
  };

  const handlePhoto = async () => {
    if (Platform.OS !== 'web') {
      showToast('Choosing a photo needs the browser version.');
      return;
    }
    const dataUrl = await pickPhotoAsDataUrl();
    if (!dataUrl) return; // cancelled
    setPhoto(dataUrl);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const nextErrors: Record<string, string> = {};
    if (!trimmedName) nextErrors.name = 'Name is required';

    const cleaned: MealIngredient[] = [];
    for (const draft of ingredients) {
      const ingredientName = draft.name.trim();
      if (!ingredientName) continue;
      const amount = draft.amount.trim() === '' ? undefined : Number(draft.amount.replace(',', '.'));
      cleaned.push({
        id: draft.id,
        name: ingredientName,
        key: normalizeItemName(ingredientName),
        amount: amount !== undefined && Number.isFinite(amount) && amount > 0 ? amount : undefined,
        unit: draft.amount.trim() === '' ? undefined : draft.unit,
      });
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: trimmedName,
      photo,
      ingredients: cleaned,
      steps: steps.trim(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <View style={styles.form}>
      <FormField
        label="Dish"
        required
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (errors.name) setErrors({});
        }}
        placeholder="e.g. Braised pork rice"
        error={errors.name}
        testID="meal-name"
      />

      {/* The finished dish, uploaded from this computer */}
      <View style={styles.photoBlock}>
        <ThemedText type="label">Finished dish picture</ThemedText>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={[styles.photo, { borderColor: theme.border }]}
            testID="meal-photo-preview"
          />
        ) : (
          <View
            testID="meal-photo-empty"
            style={[styles.photoPlaceholder, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
            <Icon name="image" size={24} color={theme.textTertiary} />
            <ThemedText type="caption" themeColor="textTertiary">
              No picture yet
            </ThemedText>
          </View>
        )}
        <View style={styles.photoActions}>
          <Button
            label={photo ? 'Replace photo' : 'Upload photo'}
            icon="upload"
            variant="secondary"
            onPress={handlePhoto}
            testID="meal-photo-upload"
          />
          {photo ? (
            <Button
              label="Remove"
              icon="close"
              variant="ghost"
              onPress={() => setPhoto(undefined)}
              testID="meal-photo-remove"
            />
          ) : null}
        </View>
        <ThemedText type="caption" themeColor="textTertiary">
          Photos are shrunk to 800px so they fit in your saved data.
        </ThemedText>
      </View>

      {/* What goes in */}
      <View style={styles.ingredientsBlock}>
        <View style={styles.sectionHeader}>
          <ThemedText type="label">Ingredients</ThemedText>
          <Button label="+ Add ingredient" variant="ghost" onPress={addIngredient} testID="meal-add-ingredient" />
        </View>

        {ingredients.length === 0 ? (
          <ThemedText type="caption" themeColor="textTertiary">
            No ingredients yet.
          </ThemedText>
        ) : (
          ingredients.map((draft, index) => (
            <View key={draft.id} style={styles.ingredientRow} testID={`meal-ingredient-${index}`}>
              <View style={styles.ingredientName}>
                <AutocompleteField
                  label={index === 0 ? 'Ingredient' : ''}
                  value={draft.name}
                  onChangeText={(text) => updateIngredient(draft.id, { name: text })}
                  suggestions={ingredientNameSuggestions(allPurchases, inventory, draft.name).map(
                    (suggestion) => ({
                      value: suggestion.name,
                      label: suggestion.name,
                      hint: suggestion.hint,
                    })
                  )}
                  onSelectSuggestion={(suggestion) =>
                    updateIngredient(draft.id, { name: suggestion.value })
                  }
                  placeholder="e.g. Soy sauce"
                  testID={`meal-ingredient-name-${index}`}
                />
              </View>
              <View style={styles.ingredientAmount}>
                <FormField
                  label={index === 0 ? 'Amount' : ''}
                  value={draft.amount}
                  onChangeText={(text) => updateIngredient(draft.id, { amount: text })}
                  placeholder="2"
                  keyboardType="decimal-pad"
                  testID={`meal-ingredient-amount-${index}`}
                />
              </View>
              <View style={styles.ingredientUnit}>
                <Select
                  label={index === 0 ? 'Unit' : ''}
                  value={draft.unit}
                  options={UNIT_OPTIONS.map((option) => ({ value: option, label: UNIT_LABELS[option] }))}
                  onChange={(unit) => updateIngredient(draft.id, { unit })}
                  testID={`meal-ingredient-unit-${index}`}
                />
              </View>
              <Pressable
                testID={`meal-ingredient-remove-${index}`}
                accessibilityRole="button"
                accessibilityLabel="Remove ingredient"
                onPress={() => removeIngredient(draft.id)}
                style={styles.removeButton}>
                <Icon name="trash" size={16} color={theme.textTertiary} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <FormField
        label="Steps to cook"
        value={steps}
        onChangeText={setSteps}
        multiline
        placeholder={'1. Heat the pan…\n2. Add the sauce…'}
        testID="meal-steps"
      />

      <FormField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Anything worth remembering"
        testID="meal-notes"
      />

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} testID="meal-cancel" />
        <Button
          label={initial ? 'Save changes' : 'Save meal'}
          variant="primary"
          onPress={handleSubmit}
          testID="meal-save"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  photoBlock: {
    gap: Spacing.two,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  ingredientsBlock: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  ingredientName: {
    flex: 3,
    minWidth: 140,
  },
  ingredientAmount: {
    flex: 1,
    minWidth: 70,
  },
  ingredientUnit: {
    flex: 1,
    minWidth: 80,
  },
  removeButton: {
    padding: Spacing.one + 2,
    marginTop: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
