import { fitWithin, isPointInsideRect } from '@/lib/geometry';

describe('isPointInsideRect', () => {
  const rect = { x: 100, y: 200, width: 50, height: 80 };

  it('accepts a point inside the rectangle', () => {
    expect(isPointInsideRect(120, 240, rect)).toBe(true);
  });

  it('accepts the edges', () => {
    expect(isPointInsideRect(100, 200, rect)).toBe(true);
    expect(isPointInsideRect(150, 280, rect)).toBe(true);
  });

  it('rejects a point outside', () => {
    expect(isPointInsideRect(99, 240, rect)).toBe(false);
    expect(isPointInsideRect(120, 281, rect)).toBe(false);
    expect(isPointInsideRect(0, 0, rect)).toBe(false);
  });

  it('rejects everything when the target was never measured', () => {
    expect(isPointInsideRect(120, 240, null)).toBe(false);
  });
});

describe('fitWithin', () => {
  it('shrinks a large landscape picture to the limit', () => {
    expect(fitWithin(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
  });

  it('shrinks a large portrait picture to the limit', () => {
    expect(fitWithin(3000, 4000, 800)).toEqual({ width: 600, height: 800 });
  });

  it('leaves small pictures alone', () => {
    expect(fitWithin(320, 240, 800)).toEqual({ width: 320, height: 240 });
  });

  it('never divides by zero', () => {
    expect(fitWithin(0, 0, 800)).toEqual({ width: 800, height: 800 });
  });
});
