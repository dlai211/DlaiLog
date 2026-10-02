// Calendar math on `YYYY-MM-DD` day keys (local time, never timezones).
// Human-readable formatting lives in `format.ts`.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** `Date` → `YYYY-MM-DD` in local time. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

/** `YYYY-MM-DD` → local `Date` at midnight. */
export function parseKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, days: number): string {
  const date = parseKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

/** Monday-first index: Monday = 0 … Sunday = 6. */
export function mondayIndex(key: string): number {
  return (parseKey(key).getDay() + 6) % 7;
}

/** `Date.getDay` for a day key: Sunday = 0 … Saturday = 6. */
export function weekdayOf(key: string): number {
  return parseKey(key).getDay();
}

/** The 7 day keys of the Monday-first week containing `anchor`. */
export function weekStrip(anchor: string): string[] {
  const monday = addDays(anchor, -mondayIndex(anchor));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export interface MonthCell {
  key: string;
  dayNumber: number;
  inMonth: boolean;
}

/** The Monday-first calendar grid for a month, row by row. */
export function monthMatrix(year: number, monthIndex: number): MonthCell[][] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Mon = 0
  const totalCells = startOffset + daysInMonth;
  const weeks: MonthCell[][] = [];

  for (let week = 0; week < Math.ceil(totalCells / 7); week += 1) {
    const row: MonthCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const cellIndex = week * 7 + day;
      const cellDate = new Date(year, monthIndex, 1 - startOffset + cellIndex);
      row.push({
        key: dateKey(cellDate),
        dayNumber: cellDate.getDate(),
        inMonth: cellDate.getMonth() === monthIndex,
      });
    }
    weeks.push(row);
  }
  return weeks;
}

/** `YYYY-MM-DD` → `YYYY-MM`. */
export function monthKeyOf(key: string): string {
  return key.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/** Steps a `YYYY-MM` month key by whole months (negative = earlier). */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${pad2(shifted.getMonth() + 1)}`;
}

export function monthKeyParts(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}
