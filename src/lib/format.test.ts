import {
  formatAmountUnit,
  formatLongDate,
  formatMoney,
  formatMonthKey,
  formatMonthTitle,
  formatPercentChange,
  formatQty,
  formatShortDate,
  formatUnitPrice,
} from '@/lib/format';

describe('formatMoney', () => {
  it('always shows two decimals with a dollar sign', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(9)).toBe('$9.00');
    expect(formatMoney(9.5)).toBe('$9.50');
  });

  it('groups thousands', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(formatMoney(1234567.89)).toBe('$1,234,567.89');
  });

  it('handles negative amounts', () => {
    expect(formatMoney(-12.3)).toBe('-$12.30');
  });
});

describe('formatUnitPrice', () => {
  it('divides the total by the amount', () => {
    expect(formatUnitPrice(6.45, 1)).toBe('$6.45');
    expect(formatUnitPrice(9, 2)).toBe('$4.50');
    expect(formatUnitPrice(10.5, 5)).toBe('$2.10');
  });

  it('refuses to divide by zero or nonsense', () => {
    expect(formatUnitPrice(9, 0)).toBeNull();
    expect(formatUnitPrice(9, -1)).toBeNull();
    expect(formatUnitPrice(Number.NaN, 2)).toBeNull();
  });
});

describe('quantities', () => {
  it('formats amounts without trailing noise', () => {
    expect(formatQty(2)).toBe('2');
    expect(formatQty(1.5)).toBe('1.5');
    expect(formatQty(0.33333)).toBe('0.333');
  });

  it('combines amount and unit', () => {
    expect(formatAmountUnit(2, 'L')).toBe('2 L');
    expect(formatAmountUnit(500, 'ml')).toBe('500 ml');
  });
});

describe('dates', () => {
  it('formats long dates like "Wed, Sep 30"', () => {
    expect(formatLongDate('2026-09-30')).toBe('Wed, Sep 30');
    expect(formatLongDate('2026-01-01')).toBe('Thu, Jan 1');
  });

  it('formats short dates like "Sep 30"', () => {
    expect(formatShortDate('2026-09-30')).toBe('Sep 30');
  });

  it('formats month titles', () => {
    expect(formatMonthTitle(2026, 8)).toBe('September 2026');
    expect(formatMonthKey('2026-12')).toBe('December 2026');
  });
});

describe('formatPercentChange', () => {
  it('shows a plus sign for rises and a minus for falls', () => {
    expect(formatPercentChange(12.3)).toBe('+12%');
    expect(formatPercentChange(-5)).toBe('-5%');
    expect(formatPercentChange(0)).toBe('0%');
  });
});
