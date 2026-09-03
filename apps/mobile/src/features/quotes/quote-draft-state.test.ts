import { describe, expect, it } from 'vitest';
import { parseLocalQuoteDraft } from './quote-draft-state';

const validDraft = {
  clientName: 'Maria',
  clientPhone: '11999999999',
  discount: '500',
  executionDeadline: '5 dias',
  installmentCount: '2',
  materials: [],
  mutationId: '73070f7c-a464-47d7-90bf-b06ac2ce7a1e',
  notes: '',
  paymentMethod: 'Pix',
  paymentPlan: 'integral',
  services: [
    {
      description: 'Instalação',
      quantity: '1',
      unit: 'un',
      unitPrice: '10000',
    },
  ],
  version: 1,
} as const;

describe('parseLocalQuoteDraft', () => {
  it('restores a valid versioned draft', () => {
    expect(parseLocalQuoteDraft(JSON.stringify(validDraft))).toEqual(
      validDraft,
    );
  });

  it.each([
    'not-json',
    JSON.stringify({ ...validDraft, version: 2 }),
    JSON.stringify({ ...validDraft, mutationId: '' }),
    JSON.stringify({ ...validDraft, services: [{ description: 12 }] }),
  ])('rejects malformed or unsupported persisted data', (value) => {
    expect(parseLocalQuoteDraft(value)).toBeNull();
  });
});
