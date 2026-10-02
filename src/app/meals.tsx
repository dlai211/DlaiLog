import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MealFormModal, type MealFormValues } from '@/components/domain/meal-form-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { RowActions } from '@/components/ui/row-actions';
import { useToast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useAccents, useScreenAccent, useTheme } from '@/hooks/use-theme';
import { formatAmountUnit } from '@/lib/format';
import { useData } from '@/store/data-provider';
import { mealIngredientStatuses, missingIngredients } from '@/store/selectors';
import type { Ingredient, Meal, ShoppingItem } from '@/store/types';
import { fluid } from '@/lib/fluid';

export default function MealsScreen() {
  const accent = useScreenAccent('meals');
  const { db, addMeal, updateMeal, deleteMeal, addShoppingItem } = useData();
  const { showToast } = useToast();

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Meal | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const meals = [...db.meals].sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = (values: MealFormValues) => {
    if (editing) {
      updateMeal(editing.id, values);
    } else {
      addMeal(values);
    }
    setFormVisible(false);
    setEditing(null);
  };

  const addMissingToShopping = (meal: Meal) => {
    const missing = missingIngredients(meal, db.inventory, db.shopping);
    if (missing.length === 0) {
      showToast('Nothing missing — you have everything for this dish.');
      return;
    }
    for (const ingredient of missing) {
      addShoppingItem({
        name: ingredient.name,
        key: ingredient.key,
        amount: ingredient.amount,
        unit: ingredient.unit,
        source: 'meal',
        sourceLabel: meal.name,
        done: false,
      });
    }
    showToast(
      missing.length === 1
        ? '1 ingredient added to the shopping list.'
        : `${missing.length} ingredients added to the shopping list.`
    );
  };

  return (
    <>
      <PageHeader
        title="Meals"
        accent={accent}
        subtitle="Your dishes, and what they need"
        action={
          <Button
            label="+ New meal"
            variant="primary"
            testID="new-meal"
            onPress={() => {
              setEditing(null);
              setFormVisible(true);
            }}
          />
        }
      />

      {meals.length === 0 ? (
        <EmptyState
          icon="plate"
          message="No meals yet — add the first dish you cook."
          hint="A picture, its ingredients, and the steps to cook it."
        />
      ) : (
        meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            inventory={db.inventory}
            shopping={db.shopping}
            expanded={expandedId === meal.id}
            onToggle={() => setExpandedId(expandedId === meal.id ? null : meal.id)}
            onEdit={() => {
              setEditing(meal);
              setFormVisible(true);
            }}
            onDelete={() => setPendingDelete(meal)}
            onAddMissing={() => addMissingToShopping(meal)}
          />
        ))
      )}

      <MealFormModal
        visible={formVisible}
        initial={editing}
        allPurchases={db.purchases}
        inventory={db.inventory}
        onClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete this meal?"
        message={`"${pendingDelete?.name ?? ''}" and its ingredients will be removed. This can't be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMeal(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

function MealCard({
  meal,
  inventory,
  shopping,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddMissing,
}: {
  meal: Meal;
  inventory: Ingredient[];
  shopping: ShoppingItem[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddMissing: () => void;
}) {
  const theme = useTheme();
  const accents = useAccents();

  // One pass over the ingredients: what is in stock, what is missing, and
  // what is already waiting on the shopping list.
  const statuses = mealIngredientStatuses(meal, inventory, shopping);
  const missing = statuses.filter((status) => !status.inStock).length;
  const allInStock = meal.ingredients.length > 0 && missing === 0;

  return (
    <Card testID={`meal-card-${meal.id}`}>
      <View style={styles.header}>
        {meal.photo ? (
          <Image source={{ uri: meal.photo }} style={[styles.thumb, { borderColor: theme.border }]} />
        ) : (
          <View
            style={[styles.thumb, styles.thumbPlaceholder, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
            <Icon name="plate" size={20} color={theme.textTertiary} />
          </View>
        )}

        <Pressable
          testID={`meal-open-${meal.id}`}
          onPress={onToggle}
          style={styles.headerBody}>
          <ThemedText type="smallBold" testID={`meal-name-${meal.id}`}>
            {meal.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            {`${meal.ingredients.length} ${meal.ingredients.length === 1 ? 'ingredient' : 'ingredients'}`}
            {meal.ingredients.length > 0
              ? allInStock
                ? ' · all in stock'
                : ` · ${missing} missing`
              : ''}
          </ThemedText>
        </Pressable>

        {meal.ingredients.length > 0 ? (
          <Chip
            label={allInStock ? 'In stock' : `${missing} missing`}
            color={allInStock ? accents.mint : accents.rose}
            selected
            testID={`meal-status-${meal.id}`}
          />
        ) : null}

        <RowActions
          onEdit={onEdit}
          onDelete={onDelete}
          editTestID={`meal-edit-${meal.id}`}
          deleteTestID={`meal-delete-${meal.id}`}
        />
      </View>

      {expanded ? (
        <View style={styles.details} testID={`meal-details-${meal.id}`}>
          {meal.ingredients.length > 0 ? (
            <View style={styles.ingredients}>
              {statuses.map((status) => (
                <View key={status.ingredient.id} style={styles.ingredientLine}>
                  <Icon
                    name={status.inStock ? 'check' : 'alert'}
                    size={14}
                    color={status.inStock ? theme.successText : theme.dangerText}
                  />
                  <ThemedText type="small" style={styles.ingredientName}>
                    {status.ingredient.name}
                  </ThemedText>
                  {status.ingredient.amount !== undefined ? (
                    <ThemedText type="caption" themeColor="textTertiary">
                      {formatAmountUnit(status.ingredient.amount, status.ingredient.unit ?? '')}
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    type="caption"
                    themeColor={status.inStock ? 'successText' : 'dangerText'}
                    testID={`meal-ingredient-status-${status.ingredient.id}`}>
                    {status.inStock
                      ? `in stock (${status.stockQuantity})`
                      : status.onShoppingList
                        ? 'missing · on the shopping list'
                        : 'missing'}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {meal.steps ? (
            <View style={styles.stepsBlock}>
              <ThemedText type="label">Steps to cook</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" testID={`meal-steps-${meal.id}`}>
                {meal.steps}
              </ThemedText>
            </View>
          ) : null}

          {meal.notes ? (
            <ThemedText type="caption" themeColor="textTertiary">
              {meal.notes}
            </ThemedText>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Add missing to shopping list"
              icon="cart"
              variant="secondary"
              onPress={onAddMissing}
              testID={`meal-add-missing-${meal.id}`}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  thumb: {
    width: fluid(56),
    height: fluid(56),
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    flex: 1,
    minWidth: fluid(140),
    gap: Spacing.half,
  },
  details: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  ingredients: {
    gap: Spacing.one,
  },
  ingredientLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  ingredientName: {
    flex: 1,
    minWidth: fluid(120),
  },
  stepsBlock: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
});
