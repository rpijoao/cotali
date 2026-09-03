import { describe, expect, it } from 'vitest';
import {
  calculateLineTotalInCents,
  calculateQuoteTotals,
  money,
  QuoteDomainError,
} from './index.js';

describe('money', () => {
  it('stores BRL as integer cents', () => {
    expect(money(12550)).toEqual({ amountInCents: 12550, currency: 'BRL' });
  });

  it('rejects invalid monetary values', () => {
    expect(() => money(1.5)).toThrow(QuoteDomainError);
    expect(() => money(-1)).toThrow(QuoteDomainError);
  });
});

describe('quote totals', () => {
  it('calculates services, materials, discount and total in cents', () => {
    expect(
      calculateQuoteTotals({
        discountInCents: 500,
        materials: [
          {
            description: 'Fio',
            quantity: '6',
            unit: 'm',
            unitPriceInCents: 250,
          },
        ],
        services: [
          {
            description: 'Troca de tomada',
            quantity: '2',
            unit: 'un',
            unitPriceInCents: 5000,
          },
        ],
      }),
    ).toEqual({
      discountInCents: 500,
      materialsInCents: 1500,
      servicesInCents: 10000,
      subtotalInCents: 11500,
      totalInCents: 11000,
    });
  });

  it('rounds fractional quantities to the nearest cent', () => {
    expect(
      calculateLineTotalInCents({
        description: 'Cabo',
        quantity: '1.005',
        unit: 'm',
        unitPriceInCents: 100,
      }),
    ).toBe(101);
  });

  it('keeps unpriced draft lines out of draft totals', () => {
    expect(
      calculateLineTotalInCents({
        description: 'Material a definir',
        quantity: '1',
        unit: 'un',
        unitPriceInCents: null,
      }),
    ).toBeNull();
  });

  it('enforces the common quote limits', () => {
    const line = {
      description: 'Serviço',
      quantity: '1',
      unit: null,
      unitPriceInCents: 1,
    };

    expect(() =>
      calculateQuoteTotals({
        discountInCents: 0,
        materials: [],
        services: Array.from({ length: 6 }, () => line),
      }),
    ).toThrowError(
      expect.objectContaining({ code: 'QUOTE_LIMIT_SERVICES_EXCEEDED' }),
    );
  });
});
