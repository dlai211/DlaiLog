import { DESIGN_WIDTH, MAX_SCALE, MIN_SCALE, fluid, fluidMax, fluidText, scaleForWidth } from '@/lib/fluid';

describe('fluid sizes', () => {
  it('writes a clamp with a floor, a share of the window and a ceiling', () => {
    expect(fluidText(fluid(16))).toBe('clamp(13.6px, 1.11vw, 20px)');
  });

  it('puts the design value at the design width', () => {
    const [middle] = /clamp\([\d.]+px, ([\d.]+)vw, [\d.]+px\)/.exec(fluidText(fluid(144)))!.slice(1);
    // 10vw of a 1440px window is 144px — the size the design asked for.
    expect((Number(middle) / 100) * DESIGN_WIDTH).toBeCloseTo(144, 1);
  });

  it('accepts explicit floors and ceilings for text that must stay readable', () => {
    expect(fluidText(fluid(48, { min: 32, max: 54 }))).toBe('clamp(32px, 3.33vw, 54px)');
  });

  it('keeps small values positive, so nothing collapses to zero', () => {
    const match = /^clamp\(([\d.]+)px/.exec(fluidText(fluid(2)));
    expect(Number(match![1])).toBeGreaterThan(0);
  });

  it('builds a ceiling that also leaves a margin on narrow windows', () => {
    expect(fluidText(fluidMax(1180, 92))).toBe('min(1180px, 92vw)');
  });

  it('scales numbers by the same curve as the CSS clamps', () => {
    expect(scaleForWidth(DESIGN_WIDTH)).toBe(1);
    expect(scaleForWidth(DESIGN_WIDTH * 4)).toBe(MAX_SCALE);
    expect(scaleForWidth(200)).toBe(MIN_SCALE);
    // No window yet (server render, or a test) — a plain 1 is the safe answer.
    expect(scaleForWidth(0)).toBe(1);
  });
});
