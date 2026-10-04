import { addDays, daysBetween, todayKey, weekdayOf } from '@/lib/dates';
import {
  ALBERTSONS_STORE,
  ALBERTSONS_TRIP_DATE,
  ALBERTSONS_TRIP_ITEMS,
  buildAlbertsonsTrip,
  buildSampleDB,
} from '@/store/sample-data';
import { findIngredientTile } from '@/data/ingredient-images';
import { groceryItems, shoppingSuggestions, taskOccursOn } from '@/store/selectors';
import { isValidDB } from '@/store/storage';

const today = todayKey();
const db = buildSampleDB(today);

describe('the example dataset', () => {
  it('is a valid DlaiLog database with something in every list', () => {
    expect(isValidDB(db)).toBe(true);
    expect(db.tasks.length).toBeGreaterThan(0);
    expect(db.notes.length).toBeGreaterThan(0);
    expect(db.projects.length).toBeGreaterThan(0);
    expect(db.purchases.length).toBeGreaterThan(0);
    expect(db.inventory.length).toBeGreaterThan(0);
    expect(db.meals.length).toBeGreaterThan(0);
    expect(db.shopping.length).toBeGreaterThan(0);
  });

  it('gives every record an id of its own', () => {
    const ids = [
      ...db.tasks,
      ...db.notes,
      ...db.projects,
      ...db.purchases,
      ...db.inventory,
      ...db.meals,
      ...db.shopping,
      ...db.meals.flatMap((meal) => meal.ingredients),
    ].map((record) => record.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds itself around today, so the calendar is never empty', () => {
    for (const purchase of db.purchases) {
      const age = daysBetween(purchase.date, today);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThanOrEqual(30);
    }

    // Today has at least one of everything the Home screen shows.
    const todayTasks = db.tasks.filter((task) => taskOccursOn(task, today));
    expect(todayTasks.length).toBeGreaterThan(0);
  });

  it('includes the worked example: a class every Tuesday and Thursday', () => {
    const repeating = db.tasks.find((task) => task.repeat);
    expect(repeating).toBeDefined();
    expect(repeating?.repeat?.days).toEqual(expect.arrayContaining([2, 4]));
    expect(repeating?.time).toBe('12:00');
    expect(repeating?.endTime).toBe('14:00');
    expect(repeating?.repeat?.until).toBe(addDays(today, 60));

    // Whatever today is, the pattern is a real Tuesday/Thursday pattern.
    const nextTuesday = db.tasks.find((task) => task.title === 'Chinese class');
    expect(nextTuesday && weekdayOf(nextTuesday.date)).toBeLessThan(7);
  });

  it('has prices that moved, so the Grocery Tracker has something to say', () => {
    const items = groceryItems(db.purchases);
    expect(items.length).toBeGreaterThan(10);

    const moved = items.filter((item) => item.changePercent !== null);
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.some((item) => Math.abs(item.changePercent ?? 0) > 1)).toBe(true);
  });

  it('has a pantry with things run out, so the shopping list has suggestions', () => {
    expect(db.inventory.some((item) => item.quantity === 0)).toBe(true);

    const suggestions = shoppingSuggestions(db.inventory, db.meals, db.shopping);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('writes dishes that can be cooked: ingredients and steps', () => {
    for (const meal of db.meals) {
      expect(meal.ingredients.length).toBeGreaterThan(0);
      expect(meal.steps.length).toBeGreaterThan(20);
      for (const ingredient of meal.ingredients) {
        expect(ingredient.key).toBe(ingredient.name.toLowerCase());
      }
    }
  });

  it('uses the same spelling for pantry items and purchases', () => {
    const pantryKeys = new Set(db.inventory.map((item) => item.key));
    const boughtKeys = new Set(db.purchases.map((purchase) => purchase.itemName.toLowerCase()));

    const shared = [...pantryKeys].filter((key) => boughtKeys.has(key));
    expect(shared.length).toBeGreaterThan(5);
  });

  it('is built fresh each time, so two loads never share ids', () => {
    const other = buildSampleDB(today);
    expect(other.tasks[0].id).not.toBe(db.tasks[0].id);
  });
});

describe('the Albertsons receipt', () => {
  const trip = ALBERTSONS_TRIP_ITEMS;

  it('holds all fourteen lines of the trip, exactly as shopped', () => {
    expect(trip).toHaveLength(14);
    expect(trip[0]).toMatchObject({
      name: 'Signature Select Coffee Crystals Instant',
      imageKey: 'coffee',
      category: 'misc',
      amount: 12,
      unit: 'oz',
      paid: 10.99,
    });
    expect(trip[4]).toMatchObject({
      name: 'Signature Select Chicken Leg Quarter Value Pack',
      imageKey: 'chicken',
      amount: 6.56,
      unit: 'lb',
      paid: 8.46,
      savings: 4.59,
    });
    expect(trip[13]).toMatchObject({ name: 'Kerrygold Garlic & Herb Butter', imageKey: 'butter' });
  });

  it('adds up to the receipt: $79.72 paid, $5.90 saved', () => {
    const paid = trip.reduce((sum, item) => sum + item.paid, 0);
    const savings = trip.reduce((sum, item) => sum + (item.savings ?? 0), 0);

    expect(Math.round(paid * 100) / 100).toBe(79.72);
    expect(Math.round(savings * 100) / 100).toBe(5.9);
  });

  it('points every line at a picture the app actually has', () => {
    for (const item of trip) {
      expect(findIngredientTile(item.imageKey)).toBeDefined();
    }
  });

  it('is part of the example database, dated to the day it was built', () => {
    const built = buildSampleDB(today);
    const albertsons = built.purchases.filter((purchase) => purchase.store === ALBERTSONS_STORE);

    expect(albertsons).toHaveLength(14);
    expect(albertsons.every((purchase) => purchase.date === today)).toBe(true);
  });

  it('builds the same trip for the one-time import, dated to the receipt', () => {
    const imported = buildAlbertsonsTrip();

    expect(imported).toHaveLength(14);
    expect(imported.every((item) => item.date === ALBERTSONS_TRIP_DATE)).toBe(true);
    expect(imported.every((item) => item.store === ALBERTSONS_STORE)).toBe(true);
  });
});
