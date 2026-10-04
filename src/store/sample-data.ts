/**
 * The example dataset (PRD §19).
 *
 * It exists so a fresh install — and anyone the app is shown to — opens on a
 * living app rather than seven empty screens: a week of shopping with prices
 * that actually moved, a pantry with some things run out, dishes with their
 * ingredients, and a calendar with a repeating class on it.
 *
 * It is only ever written when there is nothing else saved (or when the
 * Backup & Restore dialog asks for it), so it can never overwrite real data.
 */

import { addDays, todayKey } from '@/lib/dates';
import { newId } from '@/lib/id';
import { normalizeItemName, round2 } from '@/store/selectors';
import {
  emptyDB,
  type DB,
  type NewPurchase,
  type Category,
  type Ingredient,
  type Meal,
  type Project,
  type Purchase,
  type ShoppingItem,
  type Task,
  type Unit,
  type Note,
} from '@/store/types';

/** One day of a sample purchase, filled in by `purchase()`. */
interface PurchaseSeed {
  daysAgo: number;
  itemName: string;
  imageKey: string;
  category: Category;
  amount: number;
  unit: Unit;
  totalPrice: number;
  store: string;
}

const PURCHASES: PurchaseSeed[] = [
  // Three weeks of a household's shopping, with two items bought more than
  // once at different prices — so the Grocery Tracker has real movement.
  { daysAgo: 21, itemName: 'Rice', imageKey: 'rice', category: 'grocery', amount: 5, unit: 'kg', totalPrice: 16.5, store: 'Sheng Siong' },
  { daysAgo: 21, itemName: 'Soy sauce', imageKey: 'soy-sauce', category: 'condiment', amount: 500, unit: 'ml', totalPrice: 4.2, store: 'Sheng Siong' },
  { daysAgo: 20, itemName: 'Eggs', imageKey: 'egg', category: 'grocery', amount: 30, unit: 'pcs', totalPrice: 7.9, store: 'NTUC FairPrice' },
  { daysAgo: 18, itemName: 'Pork belly', imageKey: 'pork-belly', category: 'grocery', amount: 1.2, unit: 'kg', totalPrice: 18.4, store: 'Asia Market' },
  { daysAgo: 18, itemName: 'Green onions', imageKey: 'green-onion', category: 'grocery', amount: 3, unit: 'pack', totalPrice: 2.7, store: 'Asia Market' },
  { daysAgo: 14, itemName: 'Rice', imageKey: 'rice', category: 'grocery', amount: 5, unit: 'kg', totalPrice: 18.2, store: 'Asia Market' },
  { daysAgo: 13, itemName: 'Tofu', imageKey: 'tofu', category: 'grocery', amount: 4, unit: 'pack', totalPrice: 3.6, store: 'NTUC FairPrice' },
  { daysAgo: 12, itemName: 'Cooking oil', imageKey: 'oil', category: 'condiment', amount: 2, unit: 'L', totalPrice: 9.8, store: 'Sheng Siong' },
  { daysAgo: 9, itemName: 'Soy sauce', imageKey: 'soy-sauce', category: 'condiment', amount: 500, unit: 'ml', totalPrice: 4.95, store: 'NTUC FairPrice' },
  { daysAgo: 7, itemName: 'Bok choy', imageKey: 'bok-choy', category: 'grocery', amount: 2, unit: 'pack', totalPrice: 3.1, store: 'Asia Market' },
  { daysAgo: 6, itemName: 'Milk', imageKey: 'milk', category: 'grocery', amount: 2, unit: 'L', totalPrice: 6.4, store: 'NTUC FairPrice' },
  { daysAgo: 5, itemName: 'Garlic', imageKey: 'garlic', category: 'grocery', amount: 500, unit: 'g', totalPrice: 2.8, store: 'Asia Market' },
  { daysAgo: 5, itemName: 'Ginger', imageKey: 'ginger', category: 'grocery', amount: 300, unit: 'g', totalPrice: 2.1, store: 'Asia Market' },
  { daysAgo: 4, itemName: 'Oyster sauce', imageKey: 'oyster-sauce', category: 'condiment', amount: 500, unit: 'ml', totalPrice: 5.6, store: 'Sheng Siong' },
  { daysAgo: 3, itemName: 'Dumplings', imageKey: 'dumpling', category: 'grocery', amount: 2, unit: 'pack', totalPrice: 11.4, store: 'Asia Market' },
  { daysAgo: 2, itemName: 'Noodles', imageKey: 'noodles', category: 'grocery', amount: 3, unit: 'pack', totalPrice: 4.35, store: 'NTUC FairPrice' },
  { daysAgo: 2, itemName: 'Chicken thigh', imageKey: 'chicken-thigh', category: 'grocery', amount: 800, unit: 'g', totalPrice: 8.9, store: 'NTUC FairPrice' },
  { daysAgo: 1, itemName: 'Tomatoes', imageKey: 'tomato', category: 'grocery', amount: 6, unit: 'pcs', totalPrice: 3.4, store: 'Sheng Siong' },
  { daysAgo: 1, itemName: 'Dish soap', imageKey: 'detergent', category: 'misc', amount: 1, unit: 'pcs', totalPrice: 4.1, store: 'Sheng Siong' },
  { daysAgo: 2, itemName: 'Soy sauce', imageKey: 'soy-sauce', category: 'condiment', amount: 500, unit: 'ml', totalPrice: 5.2, store: 'Asia Market' },
  { daysAgo: 1, itemName: 'Rice', imageKey: 'rice', category: 'grocery', amount: 5, unit: 'kg', totalPrice: 18.9, store: 'NTUC FairPrice' },
  { daysAgo: 0, itemName: 'Bitter melon', imageKey: 'bitter-melon', category: 'grocery', amount: 2, unit: 'pcs', totalPrice: 2.6, store: 'Asia Market' },
];

/** What is in the pantry, and how much of it. */
const PANTRY: { name: string; imageKey: string; category: Category; quantity: number; unit: Unit }[] = [
  { name: 'Rice', imageKey: 'rice', category: 'grocery', quantity: 4.2, unit: 'kg' },
  { name: 'Soy sauce', imageKey: 'soy-sauce', category: 'condiment', quantity: 380, unit: 'ml' },
  { name: 'Eggs', imageKey: 'egg', category: 'grocery', quantity: 9, unit: 'pcs' },
  { name: 'Cooking oil', imageKey: 'oil', category: 'condiment', quantity: 1.4, unit: 'L' },
  { name: 'Oyster sauce', imageKey: 'oyster-sauce', category: 'condiment', quantity: 420, unit: 'ml' },
  { name: 'Garlic', imageKey: 'garlic', category: 'grocery', quantity: 260, unit: 'g' },
  { name: 'Ginger', imageKey: 'ginger', category: 'grocery', quantity: 180, unit: 'g' },
  { name: 'Noodles', imageKey: 'noodles', category: 'grocery', quantity: 2, unit: 'pack' },
  { name: 'Milk', imageKey: 'milk', category: 'grocery', quantity: 0, unit: 'L' },
  { name: 'Green onions', imageKey: 'green-onion', category: 'grocery', quantity: 0, unit: 'pack' },
  { name: 'Tofu', imageKey: 'tofu', category: 'grocery', quantity: 0, unit: 'pack' },
];

/** Dishes, with what they need and how to cook them. */
const MEALS: { name: string; ingredients: [string, string, number?, Unit?][]; steps: string; notes?: string }[] = [
  {
    name: 'Braised pork belly',
    ingredients: [
      ['Pork belly', 'pork-belly', 600, 'g'],
      ['Soy sauce', 'soy-sauce', 80, 'ml'],
      ['Garlic', 'garlic', 20, 'g'],
      ['Ginger', 'ginger', 20, 'g'],
      ['Rice', 'rice', 300, 'g'],
    ],
    steps:
      '1. Cut the pork belly into thick slices.\n2. Brown them in a dry pan, then add garlic and ginger.\n3. Pour in the soy sauce and enough water to almost cover.\n4. Simmer gently for 45 minutes, until the sauce thickens.\n5. Serve over rice.',
    notes: 'Better the next day. Add a boiled egg at the end.',
  },
  {
    name: 'Bitter melon with eggs',
    ingredients: [
      ['Bitter melon', 'bitter-melon', 2, 'pcs'],
      ['Eggs', 'egg', 3, 'pcs'],
      ['Garlic', 'garlic', 10, 'g'],
    ],
    steps:
      '1. Slice the bitter melon, salt it and leave for 10 minutes, then squeeze dry.\n2. Beat the eggs with a pinch of salt.\n3. Fry the garlic, add the melon, then the eggs. Stir until just set.',
  },
  {
    name: 'Wonton noodle soup',
    ingredients: [
      ['Dumplings', 'dumpling', 1, 'pack'],
      ['Noodles', 'noodles', 1, 'pack'],
      ['Bok choy', 'bok-choy', 1, 'pack'],
      ['Oyster sauce', 'oyster-sauce', 20, 'ml'],
      ['Green onions', 'green-onion', 1, 'pack'],
    ],
    steps:
      '1. Boil the dumplings in lightly salted water until they float.\n2. Cook the noodles separately, then the bok choy for a minute.\n3. Assemble in bowls, season with oyster sauce, and top with spring onion.',
  },
];

// ---------------------------------------------------------------------------
// The Albertsons receipt (PRD §30)
// ---------------------------------------------------------------------------
//
// A real 14-item shopping trip, kept item for item: the store, the day it was
// shopped, what each item cost and what the discounts took off. It is part of
// the example data, and the same list is what the one-time import in the
// settings dialog writes — so the trip can be added to an app that already has
// data, without touching anything else in it.

export const ALBERTSONS_STORE = 'Albertsons';
/** The day of the receipt. */
export const ALBERTSONS_TRIP_DATE = '2026-10-03';

interface TripItemSeed {
  name: string;
  /** Ingredient-tile key — see the mapping notes in ingredient-images.tsx. */
  imageKey: string;
  category: Category;
  amount: number;
  unit: Unit;
  /** What was paid for the line, after savings. */
  paid: number;
  /** What the discounts took off, where the receipt shows any. */
  savings?: number;
}

export const ALBERTSONS_TRIP_ITEMS: TripItemSeed[] = [
  { name: 'Signature Select Coffee Crystals Instant', imageKey: 'coffee', category: 'misc', amount: 12, unit: 'oz', paid: 10.99 },
  { name: 'Signature Select Ketchup Less Sodium Less Sugar', imageKey: 'ketchup', category: 'condiment', amount: 19.5, unit: 'oz', paid: 3.99 },
  { name: 'Signature Select Oil Vegetable', imageKey: 'oil', category: 'condiment', amount: 24, unit: 'oz', paid: 3.99, savings: 0.3 },
  { name: 'USDA Choice Beef Top Loin NY Strip Steak Boneless', imageKey: 'steak', category: 'grocery', amount: 0.83, unit: 'lb', paid: 16.59 },
  { name: 'Signature Select Chicken Leg Quarter Value Pack', imageKey: 'chicken', category: 'grocery', amount: 6.56, unit: 'lb', paid: 8.46, savings: 4.59 },
  { name: 'Lettuce Green Leaf', imageKey: 'chinese-cabbage', category: 'grocery', amount: 1, unit: 'pcs', paid: 2.99 },
  { name: 'Tomatoes On The Vine Red Cluster', imageKey: 'tomato', category: 'grocery', amount: 1.6, unit: 'lb', paid: 3.18, savings: 0.41 },
  { name: 'Signature Select/Farms Baby Bella Mushrooms', imageKey: 'mushroom', category: 'grocery', amount: 20, unit: 'oz', paid: 5.99 },
  { name: 'Signature Select/Farms Potatoes Russet', imageKey: 'potato', category: 'grocery', amount: 10, unit: 'lb', paid: 4.99 },
  { name: 'Carrots', imageKey: 'carrot', category: 'grocery', amount: 2, unit: 'lb', paid: 1.99, savings: 0.6 },
  { name: 'O Organics Apples Fuji', imageKey: 'apple', category: 'grocery', amount: 1, unit: 'pack', paid: 4.99 },
  { name: 'Lucerne Cage Free Large Grade A Eggs', imageKey: 'egg', category: 'grocery', amount: 18, unit: 'pcs', paid: 4.29 },
  { name: 'Lucerne 1% Low Fat Milk', imageKey: 'milk', category: 'grocery', amount: 1, unit: 'pack', paid: 2.99 },
  { name: 'Kerrygold Garlic & Herb Butter', imageKey: 'butter', category: 'grocery', amount: 3.5, unit: 'oz', paid: 4.29 },
];

/** The receipt as purchases, ready for the store. */
export function buildAlbertsonsTrip(
  date: string = ALBERTSONS_TRIP_DATE,
  store: string = ALBERTSONS_STORE
): NewPurchase[] {
  return ALBERTSONS_TRIP_ITEMS.map((item) => ({
    date,
    itemName: item.name,
    imageKey: item.imageKey,
    category: item.category,
    amount: item.amount,
    unit: item.unit,
    totalPrice: round2(item.paid),
    ...(item.savings ? { savings: round2(item.savings) } : {}),
    store,
  }));
}

function samplePurchases(today: string): Purchase[] {
  return PURCHASES.map((seed) => {
    const date = addDays(today, -seed.daysAgo);
    return {
      id: newId(),
      date,
      itemName: seed.itemName,
      imageKey: seed.imageKey,
      category: seed.category,
      amount: seed.amount,
      unit: seed.unit,
      totalPrice: round2(seed.totalPrice),
      store: seed.store,
      // Mid-day timestamps keep the newest-first ordering stable within a day.
      createdAt: `${date}T12:00:00.000Z`,
    } satisfies Purchase;
  });
}

function sampleInventory(today: string): Ingredient[] {
  return PANTRY.map((item) => ({
    id: newId(),
    name: item.name,
    key: normalizeItemName(item.name),
    imageKey: item.imageKey,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    createdAt: `${addDays(today, -20)}T09:00:00.000Z`,
    updatedAt: `${today}T09:00:00.000Z`,
  }));
}

function sampleMeals(today: string): Meal[] {
  return MEALS.map((meal) => ({
    id: newId(),
    name: meal.name,
    ingredients: meal.ingredients.map(([name, imageKey, amount, unit]) => ({
      id: newId(),
      name,
      key: normalizeItemName(name),
      amount,
      unit,
      imageKey,
    })),
    steps: meal.steps,
    notes: meal.notes,
    createdAt: `${addDays(today, -14)}T19:00:00.000Z`,
    updatedAt: `${addDays(today, -14)}T19:00:00.000Z`,
  }));
}

function sampleTasks(today: string): Task[] {
  const stamp = `${addDays(today, -10)}T08:00:00.000Z`;

  return [
    {
      id: newId(),
      title: 'Standup meeting',
      date: today,
      time: '09:30',
      done: false,
      createdAt: stamp,
    },
    {
      id: newId(),
      title: 'Chinese class',
      date: addDays(today, -1),
      time: '12:00',
      endTime: '14:00',
      note: 'Room 3, bring the workbook',
      done: false,
      repeat: { days: [2, 4], until: addDays(today, 60) },
      doneDates: [],
      createdAt: stamp,
    },
    {
      id: newId(),
      title: 'Buy paint for the study',
      date: today,
      done: false,
      note: 'Two coats — eggshell white',
      createdAt: stamp,
    },
    {
      id: newId(),
      title: 'Weekly grocery run',
      date: addDays(today, -2),
      time: '10:00',
      done: false,
      repeat: { days: [6] },
      doneDates: [],
      createdAt: stamp,
    },
    {
      id: newId(),
      title: 'Renew home insurance',
      date: addDays(today, -4),
      done: false,
      createdAt: stamp,
    },
    {
      id: newId(),
      title: 'Call the plumber',
      date: today,
      done: true,
      createdAt: stamp,
    },
    {
      id: newId(),
      title: 'Plan the weekend menu',
      date: addDays(today, 1),
      done: false,
      createdAt: stamp,
    },
  ];
}

function sampleProjects(today: string): Project[] {
  const stamp = `${addDays(today, -30)}T08:00:00.000Z`;

  return [
    {
      id: newId(),
      name: 'Kitchen renovation',
      description: 'New cabinets, a deeper counter and better lighting.',
      status: 'in-progress',
      progress: 65,
      targetDate: addDays(today, 21),
      notes: 'Cabinet doors arrive next week.',
      createdAt: stamp,
      updatedAt: `${addDays(today, -2)}T18:00:00.000Z`,
    },
    {
      id: newId(),
      name: 'Learn 500 Chinese words',
      description: 'Twenty a week, with the class on Tuesdays and Thursdays.',
      status: 'in-progress',
      progress: 40,
      targetDate: addDays(today, 90),
      createdAt: stamp,
      updatedAt: `${addDays(today, -1)}T20:00:00.000Z`,
    },
    {
      id: newId(),
      name: 'Trip to Japan',
      description: 'Flights, a rail pass and somewhere to stay in Osaka.',
      status: 'not-started',
      progress: 10,
      targetDate: addDays(today, 150),
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: newId(),
      name: 'Digitise the photo albums',
      status: 'done',
      progress: 100,
      createdAt: stamp,
      updatedAt: `${addDays(today, -15)}T20:00:00.000Z`,
    },
  ];
}

function sampleNotes(today: string): Note[] {
  return [
    { id: newId(), text: 'The Asia Market on the corner is cheaper for greens.', createdAt: `${today}T08:10:00.000Z` },
    { id: newId(), text: 'Freezer is full — use the dumplings first.', createdAt: `${today}T08:05:00.000Z` },
    { id: newId(), text: 'Ask about the bulk rice price next time.', createdAt: `${addDays(today, -3)}T18:30:00.000Z` },
  ];
}

function sampleShopping(today: string): ShoppingItem[] {
  return [
    {
      id: newId(),
      name: 'Green onions',
      key: 'green onions',
      amount: 1,
      unit: 'pack',
      source: 'inventory',
      done: false,
      createdAt: `${today}T09:00:00.000Z`,
    },
    {
      id: newId(),
      name: 'Tofu',
      key: 'tofu',
      amount: 1,
      unit: 'pack',
      source: 'meal',
      sourceLabel: 'Wonton noodle soup',
      done: false,
      createdAt: `${today}T09:01:00.000Z`,
    },
    {
      id: newId(),
      name: 'Milk',
      key: 'milk',
      amount: 2,
      unit: 'L',
      source: 'inventory',
      done: true,
      createdAt: `${addDays(today, -1)}T17:00:00.000Z`,
    },
  ];
}

/** The whole example database, dated around `today`. */
export function buildSampleDB(today: string = todayKey()): DB {
  return {
    ...emptyDB(),
    tasks: sampleTasks(today),
    notes: sampleNotes(today),
    projects: sampleProjects(today),
    purchases: samplePurchases(today).concat(
      buildAlbertsonsTrip(today).map((input) => ({
        ...input,
        id: newId(),
        createdAt: `${today}T17:30:00.000Z`,
      }))
    ),
    inventory: sampleInventory(today),
    meals: sampleMeals(today),
    shopping: sampleShopping(today),
  };
}
