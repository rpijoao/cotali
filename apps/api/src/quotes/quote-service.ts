import { createHash, randomUUID } from 'node:crypto';
import type { CreateQuoteDraft, QuoteDraft } from '@cotali/contracts';
import { calculateQuoteTotals } from '@cotali/domain';

export type CreateQuoteErrorCode =
  'IDEMPOTENCY_KEY_REUSED' | 'INVALID_PAYMENT_PLAN';

export class CreateQuoteError extends Error {
  constructor(
    readonly code: CreateQuoteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CreateQuoteError';
  }
}

export type PersistDraftInput = Readonly<{
  authSubject: string;
  fingerprint: string;
  input: CreateQuoteDraft;
  quote: QuoteDraft;
}>;

export interface QuoteRepository {
  createDraft(input: PersistDraftInput): Promise<QuoteDraft>;
}

export class MemoryQuoteRepository implements QuoteRepository {
  readonly #mutations = new Map<
    string,
    Readonly<{ fingerprint: string; quote: QuoteDraft }>
  >();

  async createDraft(input: PersistDraftInput): Promise<QuoteDraft> {
    const key = `${input.authSubject}:${input.input.mutationId}`;
    const previous = this.#mutations.get(key);

    if (previous) {
      assertSameMutation(previous.fingerprint, input.fingerprint);
      return previous.quote;
    }

    this.#mutations.set(key, {
      fingerprint: input.fingerprint,
      quote: input.quote,
    });
    return input.quote;
  }
}

export class QuoteService {
  constructor(
    private readonly repository: QuoteRepository = new MemoryQuoteRepository(),
  ) {}

  async createDraft(
    authSubject: string,
    input: CreateQuoteDraft,
  ): Promise<QuoteDraft> {
    validatePaymentPlan(input);
    const totals = calculateQuoteTotals({
      discountInCents: input.discountInCents,
      materials: input.materials,
      services: input.services,
    });
    const quote: QuoteDraft = Object.freeze({
      ...input,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      revisionNumber: 1,
      status: 'draft',
      totals,
    });
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');

    return await this.repository.createDraft({
      authSubject,
      fingerprint,
      input,
      quote,
    });
  }
}

export function assertSameMutation(previous: string, current: string): void {
  if (previous !== current) {
    throw new CreateQuoteError(
      'IDEMPOTENCY_KEY_REUSED',
      'The mutation identifier was already used with different data.',
    );
  }
}

function validatePaymentPlan(input: CreateQuoteDraft): void {
  const { installmentCount, paymentPlanType } = input.conditions;

  if (paymentPlanType === 'installments' && installmentCount === null) {
    throw new CreateQuoteError(
      'INVALID_PAYMENT_PLAN',
      'An installment plan requires the number of installments.',
    );
  }

  if (paymentPlanType !== 'installments' && installmentCount !== null) {
    throw new CreateQuoteError(
      'INVALID_PAYMENT_PLAN',
      'Only an installment plan can define the number of installments.',
    );
  }
}
