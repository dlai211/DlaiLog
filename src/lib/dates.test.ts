import {
  addDays,
  currentMonthKey,
  dateKey,
  daysBetween,
  mondayIndex,
  monthKeyOf,
  monthKeyParts,
  monthMatrix,
  pad2,
  parseKey,
  shiftMonthKey,
  todayKey,
  weekStrip,
} from '@/lib/dates';

describe('day keys', () => {
  it('formats a Date as a local YYYY-MM-DD key', () => {
    expect(dateKey(new Date(2026, 8, 30))).toBe('2026-09-30');
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('derives today from a given clock', () => {
    expect(todayKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
  });

  it('parses back to local midnight', () => {
    const parsed = parseKey('2026-09-30');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(30);
  });

  it('pads single digits', () => {
    expect(pad2(5)).toBe('05');
    expect(pad2(12)).toBe('12');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-09-15', 0)).toBe('2026-09-15');
  });
});

describe('daysBetween', () => {
  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-09-01', '2026-09-30')).toBe(29);
    expect(daysBetween('2026-09-30', '2026-09-01')).toBe(-29);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-09-30', '2026-09-30')).toBe(0);
  });
});

describe('weekStrip', () => {
  it('returns the Monday-first week containing the anchor', () => {
    // 2026-09-30 is a Wednesday → the week runs Mon 28 Sep … Sun 4 Oct.
    const week = weekStrip('2026-09-30');
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-09-28');
    expect(week[6]).toBe('2026-10-04');
    expect(week).toContain('2026-09-30');
  });

  it('keeps a Monday as the first day of its own week', () => {
    expect(weekStrip('2026-09-28')[0]).toBe('2026-09-28');
  });

  it('puts Sunday at the end of the week', () => {
    // 2026-10-04 is a Sunday.
    expect(mondayIndex('2026-10-04')).toBe(6);
    expect(weekStrip('2026-10-04')[0]).toBe('2026-09-28');
  });
});

describe('monthMatrix', () => {
  it('lays out September 2026 as 5 Monday-first weeks', () => {
    const weeks = monthMatrix(2026, 8); // September (0-based month 8)
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toHaveLength(7);

    // Sept 1 2026 is a Tuesday, so the grid starts on Mon Aug 31.
    expect(weeks[0][0]).toEqual({ key: '2026-08-31', dayNumber: 31, inMonth: false });
    expect(weeks[0][1]).toEqual({ key: '2026-09-01', dayNumber: 1, inMonth: true });

    // The last cell is Sun Oct 4.
    expect(weeks[4][6]).toEqual({ key: '2026-10-04', dayNumber: 4, inMonth: false });
  });

  it('contains every day of the month exactly once', () => {
    const weeks = monthMatrix(2026, 8);
    const inMonth = weeks.flat().filter((cell) => cell.inMonth);
    expect(inMonth).toHaveLength(30);
    expect(inMonth[0].key).toBe('2026-09-01');
    expect(inMonth[29].key).toBe('2026-09-30');
  });

  it('lays out February 2027 (starts on a Monday, 28 days) as exactly 4 weeks', () => {
    const weeks = monthMatrix(2027, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0].key).toBe('2027-02-01');
    expect(weeks[0][0].inMonth).toBe(true);
  });
});

describe('month keys', () => {
  it('extracts a month key from a day key', () => {
    expect(monthKeyOf('2026-09-30')).toBe('2026-09');
  });

  it('derives the current month from a clock', () => {
    expect(currentMonthKey(new Date(2026, 8, 30))).toBe('2026-09');
  });

  it('steps months across year boundaries', () => {
    expect(shiftMonthKey('2026-09', 1)).toBe('2026-10');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
  });

  it('splits a month key into year and month index', () => {
    expect(monthKeyParts('2026-09')).toEqual({ year: 2026, monthIndex: 8 });
  });
});
