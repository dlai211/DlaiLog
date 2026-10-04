import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import MealsScreen from '@/app/meals';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type DB, type Ingredient, type Meal } from '@/store/types';

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'i1',
    name: 'Soy sauce',
    key: 'soy sauce',
    category: 'condiment',
    quantity: 1,
    unit: 'L',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'm1',
    name: 'Braised pork rice',
    ingredients: [
      { id: 'ing1', name: 'Soy sauce', key: 'soy sauce', amount: 2, unit: 'L' },
      { id: 'ing2', name: 'Pork belly', key: 'pork belly', amount: 500, unit: 'g' },
    ],
    steps: '1. Brown the pork\n2. Add the sauce',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

async function seed(partial: Partial<DB>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), ...partial }));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Meals', () => {
  it('explains itself when there are no meals yet', async () => {
    await renderScreen(<MealsScreen />);

    await waitFor(() =>
      expect(screen.getByText('No meals yet — add the first dish you cook.')).toBeOnTheScreen()
    );
  });

  it('labels how many ingredients are missing, and which ones', async () => {
    await seed({
      meals: [makeMeal()],
      inventory: [makeIngredient({ key: 'soy sauce', quantity: 1 })],
    });

    await renderScreen(<MealsScreen />);
    await waitFor(() => expect(screen.getByTestId('meal-name-m1')).toBeOnTheScreen());

    // One ingredient is missing (the pork), the sauce is in the pantry.
    expect(screen.getByTestId('meal-status-m1')).toHaveTextContent('1 missing');
    expect(screen.getByText(/2 ingredients · 1 missing/)).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('meal-open-m1'));

    expect(screen.getByTestId('meal-ingredient-status-ing1')).toHaveTextContent('in stock (1)');
    expect(screen.getByTestId('meal-ingredient-status-ing2')).toHaveTextContent('missing');
    expect(screen.getByTestId('meal-steps-m1')).toHaveTextContent(/1\. Brown the pork/);
  });

  it('says so when everything is in stock', async () => {
    await seed({
      meals: [makeMeal({ ingredients: [{ id: 'ing1', name: 'Soy sauce', key: 'soy sauce' }] })],
      inventory: [makeIngredient({ key: 'soy sauce', quantity: 1 })],
    });

    await renderScreen(<MealsScreen />);

    await waitFor(() => expect(screen.getByTestId('meal-status-m1')).toHaveTextContent('In stock'));
  });

  it('puts the missing ingredients on the shopping list in one press', async () => {
    await seed({
      meals: [makeMeal()],
      inventory: [makeIngredient({ key: 'soy sauce', quantity: 1 })],
    });

    await renderScreen(<MealsScreen />);
    await waitFor(() => expect(screen.getByTestId('meal-open-m1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('meal-open-m1'));
    fireEvent.press(screen.getByTestId('meal-add-missing-m1'));

    await waitFor(() => expect(screen.getByText('1 ingredient added to the shopping list.')).toBeOnTheScreen());
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const shopping = JSON.parse(raw as string).shopping;
      expect(shopping).toHaveLength(1);
      expect(shopping[0]).toMatchObject({
        name: 'Pork belly',
        key: 'pork belly',
        amount: 500,
        unit: 'g',
        source: 'meal',
        sourceLabel: 'Braised pork rice',
      });
    });
  });

  it('creates a meal from the form, with its ingredients and steps', async () => {
    await renderScreen(<MealsScreen />);
    await waitFor(() => expect(screen.getByTestId('new-meal')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('new-meal'));
    fireEvent.changeText(screen.getByTestId('meal-name'), 'Tomato eggs');
    fireEvent.changeText(screen.getByTestId('meal-ingredient-name-0'), 'Tomatoes');
    fireEvent.changeText(screen.getByTestId('meal-ingredient-amount-0'), '3');
    fireEvent.changeText(screen.getByTestId('meal-steps'), '1. Scramble the eggs');
    fireEvent.press(screen.getByTestId('meal-save'));

    await waitFor(() => expect(screen.getByText('Tomato eggs')).toBeOnTheScreen());

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const meal = JSON.parse(raw as string).meals[0];
      expect(meal).toMatchObject({ name: 'Tomato eggs', steps: '1. Scramble the eggs' });
      expect(meal.ingredients).toHaveLength(1);
      expect(meal.ingredients[0]).toMatchObject({ name: 'Tomatoes', key: 'tomatoes', amount: 3 });
    });
  });

  it('refuses a meal with no name', async () => {
    await renderScreen(<MealsScreen />);
    await waitFor(() => expect(screen.getByTestId('new-meal')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('new-meal'));
    fireEvent.press(screen.getByTestId('meal-save'));

    expect(screen.getByText('Name is required')).toBeOnTheScreen();
    expect(screen.getByTestId('meal-form')).toBeOnTheScreen();
  });

  it('edits and deletes a meal', async () => {
    await seed({ meals: [makeMeal()] });
    await renderScreen(<MealsScreen />);
    await waitFor(() => expect(screen.getByTestId('meal-name-m1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('meal-edit-m1'));
    expect(screen.getByTestId('meal-name').props.value).toBe('Braised pork rice');
    fireEvent.changeText(screen.getByTestId('meal-name'), 'Pork rice bowl');
    fireEvent.press(screen.getByTestId('meal-save'));
    await waitFor(() => expect(screen.getByText('Pork rice bowl')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('meal-delete-m1'));
    expect(screen.getByText('Delete this meal?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() =>
      expect(screen.getByText('No meals yet — add the first dish you cook.')).toBeOnTheScreen()
    );
  });
});

describe('Meals — ingredient pictures', () => {
  it('takes an ingredient’s picture from the pantry, or from its name', async () => {
    await seed({
      inventory: [
        {
          id: 'i1',
          name: 'Bok choy',
          key: 'bok choy',
          imageKey: 'bok-choy',
          category: 'grocery',
          quantity: 1,
          unit: 'pack',
          createdAt: '2026-09-30T08:00:00.000Z',
          updatedAt: '2026-09-30T08:00:00.000Z',
        },
      ],
    });

    await renderScreen(<MealsScreen />);
    fireEvent.press(screen.getByTestId('new-meal'));

    fireEvent.changeText(screen.getByTestId('meal-name'), 'Greens and dumplings');
    fireEvent.changeText(screen.getByTestId('meal-ingredient-name-0'), 'Bok choy');
    fireEvent.press(screen.getByTestId('meal-add-ingredient'));
    fireEvent.changeText(screen.getByTestId('meal-ingredient-name-1'), 'Pork belly');
    fireEvent.changeText(screen.getByTestId('meal-steps'), 'Steam, then fry.');
    fireEvent.press(screen.getByTestId('meal-save'));

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = JSON.parse(raw as string).meals[0];
      expect(saved.ingredients).toMatchObject([
        { name: 'Bok choy', imageKey: 'bok-choy' },
        { name: 'Pork belly', imageKey: 'pork-belly' },
      ]);
    });
  });
});

describe('Meals — ingredient units', () => {
  it('offers the cooking measures and the catch-all when adding a meal', async () => {
    await renderScreen(<MealsScreen />);
    fireEvent.press(screen.getByTestId('new-meal'));

    fireEvent.press(screen.getByTestId('meal-ingredient-unit-0'));

    for (const unit of ['tbsp', 'tsp', 'clove', 'stalk', 'qty']) {
      expect(screen.getByTestId(`meal-ingredient-unit-0-option-${unit}`)).toBeOnTheScreen();
    }
  });
});
