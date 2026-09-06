import { describe, expect, it } from 'vitest';
import {
  applyQuoteClientNameEdit,
  applyQuoteLineEdit,
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

  it('accepts fractional quantities expressed in hundredths', () => {
    expect(
      calculateLineTotalInCents({
        description: 'Cabo',
        quantity: '0.08',
        unit: 'm',
        unitPriceInCents: 100,
      }),
    ).toBe(8);
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

describe('voice quote line edits', () => {
  const base = {
    materials: [
      {
        description: 'Refletor',
        quantity: '2',
        unit: 'un',
        unitPriceInCents: 1500,
      },
    ],
    services: [
      {
        description: 'Troca de tomadas',
        quantity: '2',
        unit: 'un',
        unitPriceInCents: 5000,
      },
      {
        description: 'Instalação de luminárias',
        quantity: '3',
        unit: 'un',
        unitPriceInCents: null,
      },
    ],
  } as const;

  it('updates exactly the first service quantity immutably', () => {
    const result = applyQuoteLineEdit({
      ...base,
      command: {
        section: 'services',
        index: 0,
        changes: { quantity: '3' },
      },
    });

    expect(result.services[0]?.quantity).toBe('3');
    expect(result.services[1]).toEqual(base.services[1]);
    expect(result.materials).toEqual(base.materials);
    expect(base.services[0]?.quantity).toBe('2');
  });

  it('supports clearing a unit while preserving other fields', () => {
    const result = applyQuoteLineEdit({
      ...base,
      command: {
        section: 'materials',
        index: 0,
        changes: { unit: null },
      },
    });

    expect(result.materials[0]).toEqual({
      ...base.materials[0],
      unit: null,
    });
  });

  it.each([
    {
      command: {
        section: 'services' as const,
        index: 9,
        changes: { quantity: '3' },
      },
      code: 'QUOTE_EDIT_TARGET_NOT_FOUND',
    },
    {
      command: {
        section: 'services' as const,
        index: 0,
        changes: {},
      },
      code: 'QUOTE_EDIT_NO_CHANGES',
    },
    {
      command: {
        section: 'services' as const,
        index: 0,
        changes: { quantity: '0' },
      },
      code: 'INVALID_QUANTITY',
    },
    {
      command: {
        section: 'services' as const,
        index: 0,
        changes: { unexpected: '3' },
      } as never,
      code: 'QUOTE_EDIT_INVALID_VALUE',
    },
  ])('rejects unsafe command %#', ({ command, code }) => {
    expect(() => applyQuoteLineEdit({ ...base, command })).toThrowError(
      expect.objectContaining({ code }),
    );
  });
});

describe('voice quote client edits', () => {
  it('trims and returns the proposed client name', () => {
    expect(
      applyQuoteClientNameEdit({ name: '  Roberto Pedro Pereira  ' }),
    ).toBe('Roberto Pedro Pereira');
  });

  it.each(['', '   ', 'a'.repeat(161)])(
    'rejects an invalid client name',
    (name) => {
      expect(() => applyQuoteClientNameEdit({ name })).toThrowError(
        expect.objectContaining({ code: 'QUOTE_EDIT_INVALID_VALUE' }),
      );
    },
  );
});
