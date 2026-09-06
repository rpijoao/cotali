import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { QuoteLineInputSchema } from './index.js';

describe('quote line contract', () => {
  it('accepts positive quantities expressed in hundredths', () => {
    expect(
      Value.Check(QuoteLineInputSchema, {
        description: 'Cabo',
        quantity: '0.08',
        unit: 'm',
        unitPriceInCents: 100,
      }),
    ).toBe(true);
  });

  it('rejects a zero quantity', () => {
    expect(
      Value.Check(QuoteLineInputSchema, {
        description: 'Cabo',
        quantity: '0.000',
        unit: 'm',
        unitPriceInCents: 100,
      }),
    ).toBe(false);
  });
});
