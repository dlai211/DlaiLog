import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  InventoryFormModal,
  type InventoryFormValues,
} from '@/components/domain/inventory-form-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckToggle } from '@/components/ui/check-toggle';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Draggable, useDropZone } from '@/components/ui/drag-drop';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { IngredientImage } from '@/data/ingredient-images';
import { PageHeader } from '@/components/ui/page-header';
import { Segmented } from '@/components/ui/segmented';
import { useToast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { CATEGORY_META } from '@/data/categories';
import { quantityStep } from '@/data/units';
import { useScreenAccent, useTheme } from '@/hooks/use-theme';
import { formatAmountUnit, formatMoney, formatQty, formatShortDate } from '@/lib/format';
import { useData } from '@/store/data-provider';
import {
  findInventoryItem,
  isOutOfStock,
  lastPurchaseFor,
  stockLevel,
  shoppingCounts,
  shoppingSuggestions,
  sortInventory,
  type ShoppingSuggestion,
} from '@/store/selectors';
import type { Ingredient, ShoppingItem } from '@/store/types';

type Tab = 'stock' | 'shopping';

export default function InventoryScreen() {
  const accent = useScreenAccent('inventory');
  const {
    db,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    adjustIngredientQuantity,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearDoneShopping,
  } = useData();
  const { showToast } = useToast();
  const theme = useTheme();

  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Ingredient | null>(null);

  const counts = shoppingCounts(db.shopping);
  const {
    setNode: setCartNode,
    measure: measureCart,
    contains: cartContains,
    highlighted: cartHighlighted,
    setHighlighted: setCartHighlighted,
  } = useDropZone();

  const query = search.trim().toLowerCase();
  const stock = sortInventory(db.inventory).filter(
    (item) => !query || item.name.toLowerCase().includes(query)
  );
  const open = db.shopping.filter((item) => !item.done);
  const done = db.shopping.filter((item) => item.done);
  const suggestions = shoppingSuggestions(db.inventory, db.meals, db.shopping);

  const handleSubmit = (values: InventoryFormValues) => {
    if (editing) {
      updateIngredient(editing.id, values);
    } else {
      // "soy-sauce" and "Soy sauce" are the same item: add to what is there
      // instead of starting a second row.
      const existing = findInventoryItem(db.inventory, values.name);
      if (existing) {
        updateIngredient(existing.id, { quantity: existing.quantity + values.quantity });
      } else {
        addIngredient(values);
      }
    }
    setFormVisible(false);
    setEditing(null);
  };

  const addToCart = (suggestion: {
    name: string;
    key: string;
    amount?: number;
    unit?: ShoppingItem['unit'];
    source: ShoppingItem['source'];
    sourceLabel?: string;
  }) => {
    addShoppingItem({ ...suggestion, done: false });
    showToast(`${suggestion.name} added to the shopping list.`);
  };

  return (
    <>
      <PageHeader
        title="Inventory"
        accent={accent}
        subtitle="What's in stock, and what to buy"
        action={
          <Button
            label="+ Add item"
            variant="primary"
            testID="new-inventory-item"
            onPress={() => {
              setEditing(null);
              setFormVisible(true);
            }}
          />
        }
      />

      <View style={styles.toolbar}>
        <Segmented
          options={[
            { value: 'stock', label: `Stock (${db.inventory.length})` },
            { value: 'shopping', label: `Shopping list (${counts.open})` },
          ]}
          value={tab}
          onChange={setTab}
          testID="inventory-tabs"
        />
        <View style={styles.search}>
          <FormField
            value={search}
            onChangeText={setSearch}
            placeholder="Search items…"
            testID="inventory-search"
          />
        </View>
      </View>

      {tab === 'stock' ? (
        stock.length === 0 ? (
          <EmptyState
            icon="box"
            message={
              db.inventory.length === 0
                ? 'Nothing in the pantry yet — log a purchase in Spending and it appears here.'
                : 'No items match your search.'
            }
            hint={db.inventory.length === 0 ? 'Or add something by hand.' : undefined}
          />
        ) : (
          <Card>
            {stock.map((item) => (
              <StockRow
                key={item.id}
                item={item}
                lastBought={lastPurchaseFor(db.purchases, item.key)}
                onAdjust={(delta) => adjustIngredientQuantity(item.id, delta)}
                onAddToCart={() =>
                  addToCart({
                    name: item.name,
                    key: item.key,
                    unit: item.unit,
                    source: 'inventory',
                    sourceLabel: 'Pantry',
                  })
                }
                onEdit={() => {
                  setEditing(item);
                  setFormVisible(true);
                }}
                onDelete={() => setPendingDelete(item)}
              />
            ))}
          </Card>
        )
      ) : (
        <View style={styles.shoppingGrid}>
          {/* Left: everything that could go on the list */}
          <Card testID="shopping-suggestions" style={styles.shoppingColumn}>
            <ThemedText type="smallBold">Could go on the list</ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              Drag an item into the cart, or press its cart button.
            </ThemedText>

            {suggestions.length === 0 ? (
              <EmptyState
                icon="cart"
                message="Nothing to suggest — your pantry covers what your meals need."
              />
            ) : (
              <View style={styles.suggestionList}>
                {suggestions.map((suggestion) => (
                  <SuggestionRow
                    key={`${suggestion.kind}-${suggestion.key}`}
                    suggestion={suggestion}
                    onAdd={() =>
                      addToCart({
                        name: suggestion.name,
                        key: suggestion.key,
                        amount: suggestion.amount,
                        unit: suggestion.unit,
                        source: suggestion.kind,
                        sourceLabel: suggestion.sourceLabel,
                      })
                    }
                    onDragStart={measureCart}
                    onDragMove={(point) => {
                      // Light the cart up the moment the pointer is over it.
                      cartContains(point.x, point.y);
                    }}
                    onDrop={(point) => {
                      if (cartContains(point.x, point.y)) {
                        addToCart({
                          name: suggestion.name,
                          key: suggestion.key,
                          amount: suggestion.amount,
                          unit: suggestion.unit,
                          source: suggestion.kind,
                          sourceLabel: suggestion.sourceLabel,
                        });
                      }
                      setCartHighlighted(false);
                    }}
                  />
                ))}
              </View>
            )}
          </Card>

          {/* Right: the cart */}
          <View
            ref={setCartNode}
            onLayout={measureCart}
            testID="shopping-cart"
            style={[
              styles.cart,
              {
                borderColor: cartHighlighted ? theme.primary : theme.border,
                backgroundColor: cartHighlighted ? theme.backgroundSelected : theme.backgroundElement,
              },
            ]}>
            <View style={styles.cartHeader}>
              <ThemedText type="smallBold">{`Shopping list (${counts.open})`}</ThemedText>
              {counts.done > 0 ? (
                <Button
                  label="Clear bought"
                  variant="ghost"
                  onPress={clearDoneShopping}
                  testID="shopping-clear"
                />
              ) : null}
            </View>

            {open.length === 0 && done.length === 0 ? (
              <EmptyState icon="cart" message="The list is empty — drop something here." />
            ) : (
              <View style={styles.cartList}>
                {[...open, ...done].map((item) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleShoppingItem(item.id)}
                    onRemove={() => deleteShoppingItem(item.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      <InventoryFormModal
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
        title="Remove from the pantry?"
        message={`"${pendingDelete?.name ?? ''}" will be removed from your stock. Past purchases are untouched.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteIngredient(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

function StockRow({
  item,
  lastBought,
  onAdjust,
  onAddToCart,
  onEdit,
  onDelete,
}: {
  item: Ingredient;
  lastBought: ReturnType<typeof lastPurchaseFor>;
  onAdjust: (delta: number) => void;
  onAddToCart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const step = quantityStep(item.unit);

  return (
    <View style={styles.stockRow} testID={`stock-row-${item.id}`}>
      <IngredientImage imageKey={item.imageKey} icon={item.icon} size={36} />

      <View style={styles.stockBody}>
        <View style={styles.stockNameRow}>
          <ThemedText type="smallBold" testID={`stock-name-${item.id}`}>
            {item.name}
          </ThemedText>
          {isOutOfStock(item) ? (
            <Chip label="Out of stock" color={theme.dangerText} selected testID={`stock-out-${item.id}`} />
          ) : null}
        </View>
        {lastBought ? (
          <ThemedText type="caption" themeColor="textTertiary">
            {`last bought ${formatShortDate(lastBought.date)} · ${formatMoney(lastBought.totalPrice)} at ${lastBought.store}`}
          </ThemedText>
        ) : (
          <ThemedText type="caption" themeColor="textTertiary">
            Added by hand
          </ThemedText>
        )}

        {/* How much is left against what a full pantry of this item holds,
            in the item's category colour. */}
        <View style={[styles.stockTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View
            testID={`stock-level-${item.id}`}
            style={{
              width: `${stockLevel(item, lastBought)}%`,
              backgroundColor: isOutOfStock(item)
                ? theme.danger
                : theme[CATEGORY_META[item.category].colorKey],
              height: '100%',
            }}
          />
        </View>
      </View>

      <View style={styles.stepper}>
        <IconButton
          icon="minus"
          label={`Use ${formatQty(step)} ${item.unit} of ${item.name}`}
          onPress={() => onAdjust(-step)}
          testID={`stock-dec-${item.id}`}
          variant="solid"
        />
        <ThemedText type="smallBold" style={styles.quantity} testID={`stock-qty-${item.id}`}>
          {formatAmountUnit(item.quantity, item.unit)}
        </ThemedText>
        <IconButton
          icon="plus"
          label={`Add ${formatQty(step)} ${item.unit} to ${item.name}`}
          onPress={() => onAdjust(step)}
          testID={`stock-inc-${item.id}`}
          variant="solid"
        />
      </View>

      <IconButton
        icon="cart"
        label={`Add ${item.name} to the shopping list`}
        onPress={onAddToCart}
        testID={`stock-cart-${item.id}`}
      />
      <IconButton icon="pencil" label={`Edit ${item.name}`} onPress={onEdit} testID={`stock-edit-${item.id}`} />
      <IconButton
        icon="trash"
        label={`Remove ${item.name}`}
        onPress={onDelete}
        testID={`stock-delete-${item.id}`}
        tone="danger"
      />
    </View>
  );
}

function SuggestionRow({
  suggestion,
  onAdd,
  onDragStart,
  onDragMove,
  onDrop,
}: {
  suggestion: ShoppingSuggestion;
  onAdd: () => void;
  /** Called as the drag begins, so the cart can measure itself afresh. */
  onDragStart: () => void;
  /** Called as the pointer moves, so the cart lights up under it. */
  onDragMove: (point: { x: number; y: number }) => void;
  onDrop: (point: { x: number; y: number }) => void;
}) {
  const theme = useTheme();

  return (
    <Draggable
      testID={`suggestion-${suggestion.key}`}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDrop={onDrop}
      renderHandle={(handleProps) => (
        // The grab area: dragging starts here, so the row's own buttons keep
        // working normally.
        <View
          {...handleProps}
          testID={`suggestion-grip-${suggestion.key}`}
          accessibilityLabel={`Drag ${suggestion.name} to the shopping list`}
          style={styles.grip}>
          <Icon name="grip" size={16} color={theme.textTertiary} />
        </View>
      )}>
      <IngredientImage imageKey={suggestion.imageKey} icon={suggestion.icon} size={28} />
      <View style={styles.suggestionBody}>
        <ThemedText type="small" testID={`suggestion-name-${suggestion.key}`}>
          {suggestion.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textTertiary">
          {suggestion.kind === 'inventory'
            ? 'ran out'
            : `needed for ${suggestion.sourceLabel ?? 'a meal'}`}
        </ThemedText>
      </View>
      <IconButton
        icon="cart"
        label={`Add ${suggestion.name} to the cart`}
        onPress={onAdd}
        testID={`suggestion-add-${suggestion.key}`}
        tone="primary"
      />
    </Draggable>
  );
}

function CartRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.cartRow} testID={`cart-row-${item.id}`}>
      <CheckToggle
        checked={item.done}
        onToggle={onToggle}
        label={`Mark ${item.name} as bought`}
        testID={`cart-check-${item.id}`}
      />
      <View style={styles.cartBody}>
        <ThemedText
          type="small"
          testID={`cart-name-${item.id}`}
          style={item.done ? [styles.boughtText, { color: theme.textTertiary }] : undefined}>
          {item.name}
          {item.amount !== undefined && item.unit ? ` · ${formatAmountUnit(item.amount, item.unit)}` : ''}
        </ThemedText>
        <ThemedText type="caption" themeColor="textTertiary">
          {item.source === 'inventory'
            ? 'from the pantry'
            : item.source === 'meal'
              ? `from ${item.sourceLabel ?? 'a meal'}`
              : 'added by hand'}
        </ThemedText>
      </View>
      <IconButton
        icon="close"
        label={`Remove ${item.name} from the list`}
        onPress={onRemove}
        testID={`cart-remove-${item.id}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  search: {
    minWidth: 200,
    flexGrow: 1,
    maxWidth: 320,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.oneHalf,
    flexWrap: 'wrap',
  },
  stockBody: {
    flex: 1,
    minWidth: 150,
    gap: Spacing.half,
  },
  stockNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  stockTrack: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  quantity: {
    minWidth: 64,
    textAlign: 'center',
  },
  shoppingGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  shoppingColumn: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 260,
  },
  suggestionList: {
    gap: Spacing.two,
  },
  grip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.half,
  },
  suggestionBody: {
    flex: 1,
    gap: Spacing.half,
  },
  cart: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 260,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cartList: {
    gap: Spacing.one,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  cartBody: {
    flex: 1,
    gap: Spacing.half,
  },
  boughtText: {
    textDecorationLine: 'line-through',
  },
});
