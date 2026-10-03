// Human-readable formatting: money, dates, quantities, percentages.

import { monthKeyParts, pad2, parseKey } from '@/lib/dates';

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

/** `"12:00"` → `"12:00 pm"`. */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad2(minutes)} ${suffix}`;
}

/** `("12:00", "14:00")` → `"12:00 – 2:00 pm"`; a lone start stays as it is. */
export function formatTimeRange(start: string, end?: string): string {
  if (!end || end === start) return formatTime(start);
  return `${formatTime(start).replace(/ (am|pm)$/, '')} – ${formatTime(end)}`;
}

/** `0` → `"Sun"` … `6` → `"Sat"` (0 = Sunday, matching `Date.getDay`). */
export function weekdayName(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? '';
}

/**
 * A repeating task's pattern in words: `"Every Tue & Thu"`. Consecutive days
 * are folded away when the pattern covers the whole week.
 */
export function formatRepeatDays(days: number[]): string {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 0) return 'Never';
  if (sorted.length === 7) return 'Every day';
  // Weekends and weekdays have names of their own.
  const isWeekdays = sorted.length === 5 && sorted.every((day) => day >= 1 && day <= 5);
  if (isWeekdays) return 'Every weekday';
  const isWeekend = sorted.length === 2 && sorted.includes(0) && sorted.includes(6);
  if (isWeekend) return 'Every weekend';

  const names = sorted.map(weekdayName);
  return `Every ${names.slice(0, -1).join(', ')}${names.length > 1 ? ' & ' : ' '}${names[names.length - 1]}`;
}
