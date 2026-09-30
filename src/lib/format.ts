// Human-readable formatting: money, dates, quantities, percentages.

import { monthKeyParts, parseKey } from '@/lib/dates';

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `1234.5` → `"$1,234.50"` */
export function formatMoney(amount: number): string {
  const negative = amount < 0;
  const fixed = (Math.round(Math.abs(amount) * 100) / 100).toFixed(2);
  const [integerPart, decimals] = fixed.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${grouped}.${decimals}`;
}

/** Price per one unit, e.g. total $6.45 for 1 L → `"$6.45"`. Null when unknowable. */
export function formatUnitPrice(totalPrice: number, amount: number): string | null {
  if (!Number.isFinite(totalPrice) || !Number.isFinite(amount) || amount <= 0) return null;
  return formatMoney(totalPrice / amount);
}

/** `2` → `"2"`, `1.5` → `"1.5"` — no trailing noise. */
export function formatQty(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

/** `"2 L"`, `"500 ml"` */
export function formatAmountUnit(amount: number, unit: string): string {
  return `${formatQty(amount)} ${unit}`;
}

/** `"2026-09-30"` → `"Tue, Sep 30"` */
export function formatLongDate(key: string): string {
  const date = parseKey(key);
  const weekday = WEEKDAY_SHORT[(date.getDay() + 6) % 7];
  return `${weekday}, ${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** `"2026-09-30"` → `"Sep 30"` */
export function formatShortDate(key: string): string {
  const date = parseKey(key);
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** `(2026, 8)` → `"September 2026"` */
export function formatMonthTitle(year: number, monthIndex: number): string {
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

/** `"2026-09"` → `"September 2026"` */
export function formatMonthKey(monthKey: string): string {
  const { year, monthIndex } = monthKeyParts(monthKey);
  return formatMonthTitle(year, monthIndex);
}

/** `12.3` → `"+12%"`, `-5` → `"-5%"`, `0` → `"0%"` */
export function formatPercentChange(percent: number): string {
  const rounded = Math.round(percent);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

/** Shortens long text for tight spaces: `"Buy the new…"` */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
