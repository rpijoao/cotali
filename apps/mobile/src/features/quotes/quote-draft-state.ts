import type { EditableQuoteLine } from './QuoteLineEditor';

export type PaymentPlan = 'installments' | 'integral' | 'partial';
export type QuoteSource = 'interpretation' | 'manual' | 'mixed';

export type LocalQuoteDraft = Readonly<{
  clientName: string;
  clientPhone: string;
  discount: string;
  executionDeadline: string;
  installmentCount: string;
  materials: EditableQuoteLine[];
  mutationId: string;
  notes: string;
  paymentMethod: string;
  paymentPlan: PaymentPlan;
  source: QuoteSource;
  services: EditableQuoteLine[];
  validUntil?: string;
  version: 1;
}>;

export function hasLocalQuoteDraftContent(draft: LocalQuoteDraft): boolean {
  return (
    draft.clientName.trim() !== '' ||
    draft.clientPhone.trim() !== '' ||
    draft.discount.trim() !== '' ||
    draft.executionDeadline.trim() !== '' ||
    draft.installmentCount !== '2' ||
    (draft.validUntil?.trim() ?? '') !== '' ||
    draft.materials.some(
      (line) => line.description.trim() !== '' || line.unitPrice !== '',
    ) ||
    draft.notes.trim() !== '' ||
    draft.services.some(
      (line) => line.description.trim() !== '' || line.unitPrice !== '',
    ) ||
    draft.source === 'interpretation'
  );
}

export function parseLocalQuoteDraft(value: string): LocalQuoteDraft | null {
  try {
    const candidate: unknown = JSON.parse(value);
    if (!isRecord(candidate) || candidate.version !== 1) return null;
    if (!isNonEmptyString(candidate.mutationId)) return null;
    if (!isPaymentPlan(candidate.paymentPlan)) return null;
    if (!isQuoteSource(candidate.source)) return null;
    if (
      !isQuoteLines(candidate.services) ||
      !isQuoteLines(candidate.materials)
    ) {
      return null;
    }
    if (
      candidate.validUntil !== undefined &&
      typeof candidate.validUntil !== 'string'
    ) {
      return null;
    }

    const stringFields = [
      'clientName',
      'clientPhone',
      'discount',
      'executionDeadline',
      'installmentCount',
      'notes',
      'paymentMethod',
    ] as const;
    if (stringFields.some((field) => typeof candidate[field] !== 'string')) {
      return null;
    }

    return candidate as LocalQuoteDraft;
  } catch {
    return null;
  }
}

function isQuoteLines(value: unknown): value is EditableQuoteLine[] {
  return (
    Array.isArray(value) &&
    value.every(
      (line) =>
        isRecord(line) &&
        typeof line.description === 'string' &&
        typeof line.quantity === 'string' &&
        typeof line.unit === 'string' &&
        typeof line.unitPrice === 'string',
    )
  );
}

function isPaymentPlan(value: unknown): value is PaymentPlan {
  return (
    value === 'installments' || value === 'integral' || value === 'partial'
  );
}

function isQuoteSource(value: unknown): value is QuoteSource {
  return value === 'interpretation' || value === 'manual' || value === 'mixed';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
