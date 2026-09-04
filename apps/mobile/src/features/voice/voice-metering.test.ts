import { describe, expect, it } from 'vitest';
import {
  activeMeterBars,
  METER_BAR_COUNT,
  normalizeMetering,
} from './voice-metering';

describe('voice metering', () => {
  it('maps silence and loud input to the meter range', () => {
    expect(normalizeMetering(undefined)).toBe(0);
    expect(normalizeMetering(-60)).toBe(0);
    expect(normalizeMetering(-30)).toBe(0.5);
    expect(normalizeMetering(0)).toBe(1);
    expect(normalizeMetering(5)).toBe(1);
  });

  it('converts the normalized level into visible bars', () => {
    expect(activeMeterBars(-60)).toBe(0);
    expect(activeMeterBars(-30)).toBe(Math.round(METER_BAR_COUNT / 2));
    expect(activeMeterBars(0)).toBe(METER_BAR_COUNT);
  });
});
