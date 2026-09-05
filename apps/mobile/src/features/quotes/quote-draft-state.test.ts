import { describe, expect, it } from 'vitest';
import {
  hasLocalQuoteDraftContent,
  parseLocalQuoteDraft,
  type LocalQuoteDraft,
} from './quote-draft-state';

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
  source: 'manual',
  services: [
    {
      description: 'Instalação',
      quantity: '1',
      unit: 'un',
      unitPrice: '10000',
    },
  ],
  validUntil: '2026-09-30',
  version: 1,
} satisfies LocalQuoteDraft;

function withoutValidity(draft: LocalQuoteDraft): LocalQuoteDraft {
  const copy = { ...draft };
  delete copy.validUntil;
  return copy;
}

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

describe('hasLocalQuoteDraftContent', () => {
  it('detects a draft worth resuming', () => {
    expect(hasLocalQuoteDraftContent(validDraft)).toBe(true);
  });

  it('does not surface the untouched initial form', () => {
    expect(
      hasLocalQuoteDraftContent({
        ...withoutValidity(validDraft),
        clientName: '',
        clientPhone: '',
        discount: '',
        executionDeadline: '',
        materials: [],
        notes: '',
        paymentMethod: 'Pix',
        services: [
          {
            description: '',
            quantity: '1',
            unit: 'un',
            unitPrice: '',
          },
        ],
      }),
    ).toBe(false);
  });

  it('surfaces a draft whose only meaningful field is validity', () => {
    expect(
      hasLocalQuoteDraftContent({
        ...validDraft,
        clientName: '',
        clientPhone: '',
        discount: '',
        executionDeadline: '',
        materials: [],
        notes: '',
        paymentMethod: 'Pix',
        services: [
          {
            description: '',
            quantity: '1',
            unit: 'un',
            unitPrice: '',
          },
        ],
        validUntil: '2026-09-30',
      }),
    ).toBe(true);
  });
});
