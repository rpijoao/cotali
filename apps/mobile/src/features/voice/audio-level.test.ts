import { describe, expect, it } from 'vitest';
import { pcmBufferToDecibels } from './audio-level';

describe('pcmBufferToDecibels', () => {
  it('maps silent PCM chunks to the meter floor', () => {
    expect(pcmBufferToDecibels(new ArrayBuffer(0), 'int16')).toBe(-60);
    expect(pcmBufferToDecibels(new Int16Array([0, 0]).buffer, 'int16')).toBe(
      -60,
    );
  });

  it('calculates the level of int16 samples', () => {
    expect(
      pcmBufferToDecibels(new Int16Array([16384, -16384]).buffer, 'int16'),
    ).toBeCloseTo(-6.02, 1);
  });

  it('calculates the level of float32 samples', () => {
    expect(
      pcmBufferToDecibels(new Float32Array([0.5, -0.5]).buffer, 'float32'),
    ).toBeCloseTo(-6.02, 1);
  });
});
