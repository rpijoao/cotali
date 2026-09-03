import { describe, expect, it } from 'vitest';
import { formatDuration } from './voice-duration';

describe('formatDuration', () => {
  it('formats recording durations without rounding up', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(1_999)).toBe('00:01');
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(120_000)).toBe('02:00');
  });
});
