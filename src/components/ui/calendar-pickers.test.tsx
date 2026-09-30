import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DatePicker } from '@/components/ui/date-picker';
import { MonthGrid } from '@/components/ui/month-grid';
import { monthKeyOf, monthKeyParts, shiftMonthKey, todayKey } from '@/lib/dates';
import { formatLongDate, formatMonthTitle } from '@/lib/format';

describe('MonthGrid', () => {
  it('renders the weekday header and the days of the month', () => {
    render(<MonthGrid year={2026} monthIndex={8} testID="grid" />);

    expect(screen.getAllByText('M').length).toBeGreaterThan(0);
    expect(screen.getByTestId('grid-day-2026-09-01')).toBeOnTheScreen();
    expect(screen.getByTestId('grid-day-2026-09-30')).toBeOnTheScreen();
    // The grid stops after the week that contains the last day of the month…
    expect(screen.getByTestId('grid-day-2026-10-04')).toBeOnTheScreen(); // padding
    expect(screen.queryByTestId('grid-day-2026-10-05')).not.toBeOnTheScreen();
  });

  it('reports the tapped day', () => {
    const onSelectDay = jest.fn();
    render(<MonthGrid year={2026} monthIndex={8} onSelectDay={onSelectDay} testID="grid" />);

    fireEvent.press(screen.getByTestId('grid-day-2026-09-15'));
    expect(onSelectDay).toHaveBeenCalledWith('2026-09-15');
  });

  it('marks the selected day', () => {
    render(
      <MonthGrid year={2026} monthIndex={8} selectedKey="2026-09-15" today="2026-09-30" testID="grid" />
    );

    expect(screen.getByTestId('grid-day-2026-09-15')).toBeSelected();
    expect(screen.getByTestId('grid-day-2026-09-16')).not.toBeSelected();
  });

  it('shows days of the neighbouring months as padding', () => {
    render(<MonthGrid year={2026} monthIndex={8} testID="grid" />);
    // September 2026 starts on a Tuesday, so the grid pads with Aug 31.
    expect(screen.getByTestId('grid-day-2026-08-31')).toBeOnTheScreen();
  });
});

describe('DatePicker', () => {
  function Host() {
    const [value, setValue] = useState<string | null>(null);
    return <DatePicker label="Target date" value={value} onChange={setValue} testID="dp" />;
  }

  it('picks a day from the calendar and closes again', () => {
    const today = todayKey();
    const pickable = `${monthKeyOf(today)}-15`;

    render(<Host />);
    expect(screen.queryByTestId('dp-modal')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('dp'));
    expect(screen.getByTestId('dp-modal')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(`dp-grid-day-${pickable}`));
    expect(screen.queryByTestId('dp-modal')).not.toBeOnTheScreen();
    expect(screen.getByText(formatLongDate(pickable))).toBeOnTheScreen();
  });

  it('jumps back to today', () => {
    render(<Host />);

    fireEvent.press(screen.getByTestId('dp'));
    fireEvent.press(screen.getByTestId('dp-today'));

    expect(screen.queryByTestId('dp-modal')).not.toBeOnTheScreen();
    expect(screen.getByText(formatLongDate(todayKey()))).toBeOnTheScreen();
  });

  it('walks between months', () => {
    const thisMonth = monthKeyOf(todayKey());
    const next = monthKeyParts(shiftMonthKey(thisMonth, 1));

    render(<Host />);
    fireEvent.press(screen.getByTestId('dp'));
    fireEvent.press(screen.getByTestId('dp-next'));

    expect(screen.getByText(formatMonthTitle(next.year, next.monthIndex))).toBeOnTheScreen();
  });

  it('opens on the month of the currently selected date', () => {
    render(
      <DatePicker label="Target date" value="2026-09-30" onChange={() => {}} testID="dp" />
    );

    fireEvent.press(screen.getByTestId('dp'));
    expect(screen.getByText(formatMonthTitle(2026, 8))).toBeOnTheScreen();
    expect(screen.getByTestId('dp-grid-day-2026-09-30')).toBeSelected();
  });
});
