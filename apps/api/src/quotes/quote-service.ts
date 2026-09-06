import { createHash, randomUUID } from 'node:crypto';
import type {
  CreateQuoteDraft,
  QuoteDetails,
  QuoteDraft,
  QuoteSummary,
  UpdateQuoteRevision,
} from '@cotali/contracts';
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

export type PersistRevisionInput = Readonly<{
  authSubject: string;
  fingerprint: string;
  input: UpdateQuoteRevision;
  quote: QuoteDetails;
  quoteId: string;
}>;

export type QuoteUpdateErrorCode =
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'QUOTE_EDIT_NOT_ALLOWED'
  | 'QUOTE_NOT_FOUND'
  | 'INVALID_PAYMENT_PLAN';

export class QuoteUpdateError extends Error {
  constructor(
    readonly code: QuoteUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'QuoteUpdateError';
  }
}

export interface QuoteRepository {
  createDraft(input: PersistDraftInput): Promise<QuoteDraft>;
  createRevision(input: PersistRevisionInput): Promise<QuoteDetails>;
  getById(authSubject: string, quoteId: string): Promise<QuoteDetails | null>;
  listRecent(authSubject: string, limit: number): Promise<QuoteSummary[]>;
}

export class MemoryQuoteRepository implements QuoteRepository {
  readonly #mutations = new Map<
    string,
    Readonly<{ fingerprint: string; quote: QuoteDraft }>
  >();
  readonly #quotes = new Map<string, QuoteSummary>();
  readonly #details = new Map<string, QuoteDetails>();
  readonly #revisionMutations = new Map<
    string,
    Readonly<{ fingerprint: string; quote: QuoteDetails }>
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
    this.#quotes.set(
      `${input.authSubject}:${input.quote.id}`,
      summarizeQuote(input.quote),
    );
    this.#details.set(
      `${input.authSubject}:${input.quote.id}`,
      toQuoteDetails(input.quote),
    );
    return input.quote;
  }

  async getById(
    authSubject: string,
    quoteId: string,
  ): Promise<QuoteDetails | null> {
    return this.#details.get(`${authSubject}:${quoteId}`) ?? null;
  }

  async createRevision(input: PersistRevisionInput): Promise<QuoteDetails> {
    const mutationKey = `${input.authSubject}:${input.input.mutationId}`;
    const previous = this.#revisionMutations.get(mutationKey);
    if (previous) {
      assertSameMutation(previous.fingerprint, input.fingerprint);
      return previous.quote;
    }

    const current = this.#details.get(`${input.authSubject}:${input.quoteId}`);
    if (!current) {
      throw new QuoteUpdateError(
        'QUOTE_NOT_FOUND',
        'The quote to update was not found.',
      );
    }

    const quote = {
      ...input.quote,
      revisionNumber: current.revisionNumber + 1,
    } satisfies QuoteDetails;

    this.#revisionMutations.set(mutationKey, {
      fingerprint: input.fingerprint,
      quote,
    });
    this.#quotes.set(
      `${input.authSubject}:${input.quoteId}`,
      summarizeDetails(quote),
    );
    this.#details.set(`${input.authSubject}:${input.quoteId}`, quote);
    return quote;
  }

  async listRecent(
    authSubject: string,
    limit: number,
  ): Promise<QuoteSummary[]> {
    return [...this.#quotes.entries()]
      .filter(([key]) => key.startsWith(`${authSubject}:`))
      .map(([, quote]) => quote)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
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

  async updateDraft(
    authSubject: string,
    quoteId: string,
    input: UpdateQuoteRevision,
  ): Promise<QuoteDetails> {
    validatePaymentPlan(input);
    const current = await this.repository.getById(authSubject, quoteId);
    if (!current) {
      throw new QuoteUpdateError(
        'QUOTE_NOT_FOUND',
        'The quote to update was not found.',
      );
    }
    if (current.paymentStatus !== 'pending') {
      throw new QuoteUpdateError(
        'QUOTE_EDIT_NOT_ALLOWED',
        'A quote with recorded payments cannot be edited.',
      );
    }

    const totals = calculateQuoteTotals({
      discountInCents: input.discountInCents,
      materials: input.materials,
      services: input.services,
    });
    const quote: QuoteDetails = {
      client: input.client,
      conditions: input.conditions,
      createdAt: current.createdAt,
      discountInCents: input.discountInCents,
      id: current.id,
      materials: input.materials,
      paymentStatus: current.paymentStatus,
      revisionNumber: current.revisionNumber + 1,
      services: input.services,
      source: input.source,
      status: current.status,
      totals,
    };
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ quoteId, ...input }))
      .digest('hex');

    return await this.repository.createRevision({
      authSubject,
      fingerprint,
      input,
      quote,
      quoteId,
    });
  }

  async listRecent(authSubject: string, limit = 20): Promise<QuoteSummary[]> {
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 50)
      : 20;
    return await this.repository.listRecent(authSubject, safeLimit);
  }

  async getById(
    authSubject: string,
    quoteId: string,
  ): Promise<QuoteDetails | null> {
    return await this.repository.getById(authSubject, quoteId);
  }
}

function summarizeQuote(quote: QuoteDraft): QuoteSummary {
  return {
    client: quote.client,
    createdAt: quote.createdAt,
    id: quote.id,
    paymentStatus: 'pending',
    revisionNumber: quote.revisionNumber,
    status: quote.status,
    totalInCents: quote.totals.totalInCents,
  };
}

function summarizeDetails(quote: QuoteDetails): QuoteSummary {
  return {
    client: quote.client,
    createdAt: quote.createdAt,
    id: quote.id,
    paymentStatus: quote.paymentStatus,
    revisionNumber: quote.revisionNumber,
    status: quote.status,
    totalInCents: quote.totals.totalInCents,
  };
}

function toQuoteDetails(quote: QuoteDraft): QuoteDetails {
  return {
    client: quote.client,
    conditions: quote.conditions,
    createdAt: quote.createdAt,
    discountInCents: quote.discountInCents,
    id: quote.id,
    materials: quote.materials,
    paymentStatus: 'pending',
    revisionNumber: quote.revisionNumber,
    services: quote.services,
    source: quote.source,
    status: quote.status,
    totals: quote.totals,
  };
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
