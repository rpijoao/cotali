import type {
  CreateQuoteDraft,
  QuoteDetails,
  QuoteDraft,
  QuoteLineInput,
  QuoteSummary,
} from '@cotali/contracts';
import { Prisma, type PrismaClient } from '@cotali/database';
import { calculateLineTotalInCents } from '@cotali/domain';
import {
  assertSameMutation,
  QuoteUpdateError,
  type PersistRevisionInput,
  type PersistDraftInput,
  type QuoteRepository,
} from './quote-service.js';

export class PrismaQuoteRepository implements QuoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDraft(input: PersistDraftInput): Promise<QuoteDraft> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.persist(input);
      } catch (error) {
        if (!isRetryableTransactionError(error)) throw error;
        const previous = await this.findMutation(
          input.authSubject,
          input.input.mutationId,
        );
        if (previous) {
          assertSameMutation(previous.fingerprint, input.fingerprint);
          return previous.quote as QuoteDraft;
        }
        if (attempt === 2) throw error;
      }
    }

    throw new Error('Unreachable transaction retry state.');
  }

  async listRecent(
    authSubject: string,
    limit: number,
  ): Promise<QuoteSummary[]> {
    const quotes = await this.prisma.quote.findMany({
      include: {
        client: true,
        currentRevision: { select: { revisionNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      where: {
        account: { authSubject },
        deletedAt: null,
      },
    });

    return quotes.map((quote) => ({
      client: { name: quote.client.name, phone: quote.client.phone },
      createdAt: quote.createdAt.toISOString(),
      id: quote.id,
      paymentStatus: mapPaymentStatus(quote.paymentStatus),
      revisionNumber: quote.currentRevision?.revisionNumber ?? 1,
      status: mapQuoteStatus(quote.status),
      totalInCents: toSafeInteger(quote.totalCents),
    }));
  }

  async createRevision(input: PersistRevisionInput): Promise<QuoteDetails> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.persistRevision(input);
      } catch (error) {
        if (!isRetryableTransactionError(error)) throw error;
        const previous = await this.findMutation(
          input.authSubject,
          input.input.mutationId,
        );
        if (previous) {
          assertSameMutation(previous.fingerprint, input.fingerprint);
          return previous.quote as unknown as QuoteDetails;
        }
        if (attempt === 2) throw error;
      }
    }

    throw new Error('Unreachable transaction retry state.');
  }

  async getById(
    authSubject: string,
    quoteId: string,
  ): Promise<QuoteDetails | null> {
    const quote = await this.prisma.quote.findFirst({
      include: {
        client: true,
        currentRevision: {
          include: {
            materials: { orderBy: { position: 'asc' } },
            services: { orderBy: { position: 'asc' } },
          },
        },
      },
      where: {
        account: { authSubject },
        deletedAt: null,
        id: quoteId,
      },
    });
    const revision = quote?.currentRevision;
    if (!quote || !revision) return null;

    return {
      client: { name: quote.client.name, phone: quote.client.phone },
      conditions: {
        executionDeadline: revision.executionDeadline,
        installmentCount: revision.installmentCount,
        notes: revision.notes,
        paymentMethod: revision.paymentMethod,
        paymentPlanType: mapStoredPaymentPlan(revision.paymentPlanType),
        validUntil: revision.validUntil
          ? revision.validUntil.toISOString().slice(0, 10)
          : null,
      },
      createdAt: quote.createdAt.toISOString(),
      discountInCents: toSafeInteger(revision.discountCents),
      id: quote.id,
      materials: revision.materials.map(toQuoteLine),
      paymentStatus: mapPaymentStatus(quote.paymentStatus),
      revisionNumber: revision.revisionNumber,
      services: revision.services.map(toQuoteLine),
      source: mapStoredSource(revision.source),
      status: mapQuoteStatus(quote.status),
      totals: {
        discountInCents: toSafeInteger(revision.discountCents),
        materialsInCents: toSafeInteger(revision.materialsSubtotal),
        servicesInCents: toSafeInteger(revision.servicesSubtotal),
        subtotalInCents: toSafeInteger(revision.subtotalCents),
        totalInCents: toSafeInteger(revision.totalCents),
      },
    };
  }

  private async persist(input: PersistDraftInput): Promise<QuoteDraft> {
    return await this.prisma.$transaction(
      async (transaction) => {
        const account = await transaction.account.upsert({
          create: { authSubject: input.authSubject },
          update: {},
          where: { authSubject: input.authSubject },
        });
        const previous = await transaction.mutation.findUnique({
          where: {
            accountId_mutationId: {
              accountId: account.id,
              mutationId: input.input.mutationId,
            },
          },
        });

        if (previous) {
          assertSameMutation(previous.fingerprint, input.fingerprint);
          return previous.result as unknown as QuoteDraft;
        }

        const client = await transaction.client.create({
          data: {
            accountId: account.id,
            name: input.input.client.name,
            phone: input.input.client.phone,
          },
        });
        const quote = await transaction.quote.create({
          data: {
            accountId: account.id,
            clientId: client.id,
            createdAt: new Date(input.quote.createdAt),
            id: input.quote.id,
            totalCents: BigInt(input.quote.totals.totalInCents),
          },
        });
        const revision = await transaction.quoteRevision.create({
          data: {
            createdAt: new Date(input.quote.createdAt),
            discountCents: BigInt(input.quote.totals.discountInCents),
            executionDeadline: input.input.conditions.executionDeadline,
            installmentCount: input.input.conditions.installmentCount,
            materials: { create: mapLines(input.input.materials) },
            materialsSubtotal: BigInt(input.quote.totals.materialsInCents),
            notes: input.input.conditions.notes,
            paymentMethod: input.input.conditions.paymentMethod,
            paymentPlanType: mapPaymentPlan(input.input),
            quoteId: quote.id,
            revisionNumber: input.quote.revisionNumber,
            services: { create: mapLines(input.input.services) },
            servicesSubtotal: BigInt(input.quote.totals.servicesInCents),
            source: mapSource(input.input.source),
            subtotalCents: BigInt(input.quote.totals.subtotalInCents),
            totalCents: BigInt(input.quote.totals.totalInCents),
            validUntil: input.input.conditions.validUntil
              ? new Date(`${input.input.conditions.validUntil}T00:00:00.000Z`)
              : null,
          },
        });

        await transaction.quote.update({
          data: { currentRevisionId: revision.id },
          where: { id: quote.id },
        });
        await transaction.mutation.create({
          data: {
            accountId: account.id,
            commandType: 'CreateQuote',
            fingerprint: input.fingerprint,
            mutationId: input.input.mutationId,
            result: toJson(input.quote),
          },
        });

        return input.quote;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async persistRevision(
    input: PersistRevisionInput,
  ): Promise<QuoteDetails> {
    return await this.prisma.$transaction(
      async (transaction) => {
        const account = await transaction.account.findUnique({
          where: { authSubject: input.authSubject },
        });
        if (!account) {
          throw new QuoteUpdateError(
            'QUOTE_NOT_FOUND',
            'The quote to update was not found.',
          );
        }

        const previous = await transaction.mutation.findUnique({
          where: {
            accountId_mutationId: {
              accountId: account.id,
              mutationId: input.input.mutationId,
            },
          },
        });
        if (previous) {
          assertSameMutation(previous.fingerprint, input.fingerprint);
          return previous.result as unknown as QuoteDetails;
        }

        const quote = await transaction.quote.findFirst({
          include: { currentRevision: true },
          where: {
            accountId: account.id,
            deletedAt: null,
            id: input.quoteId,
          },
        });
        if (!quote || !quote.currentRevision) {
          throw new QuoteUpdateError(
            'QUOTE_NOT_FOUND',
            'The quote to update was not found.',
          );
        }
        if (quote.paymentStatus !== 'PENDING') {
          throw new QuoteUpdateError(
            'QUOTE_EDIT_NOT_ALLOWED',
            'A quote with recorded payments cannot be edited.',
          );
        }

        const revisionNumber = quote.currentRevision.revisionNumber + 1;
        await transaction.client.update({
          data: {
            name: input.input.client.name,
            phone: input.input.client.phone,
          },
          where: {
            accountId_id: { accountId: account.id, id: quote.clientId },
          },
        });
        const revision = await transaction.quoteRevision.create({
          data: {
            createdAt: new Date(),
            discountCents: BigInt(input.quote.totals.discountInCents),
            executionDeadline: input.input.conditions.executionDeadline,
            installmentCount: input.input.conditions.installmentCount,
            materials: { create: mapLines(input.input.materials) },
            materialsSubtotal: BigInt(input.quote.totals.materialsInCents),
            notes: input.input.conditions.notes,
            paymentMethod: input.input.conditions.paymentMethod,
            paymentPlanType: mapPaymentPlan(input.input),
            quoteId: quote.id,
            revisionNumber,
            services: { create: mapLines(input.input.services) },
            servicesSubtotal: BigInt(input.quote.totals.servicesInCents),
            source: mapSource(input.input.source),
            subtotalCents: BigInt(input.quote.totals.subtotalInCents),
            totalCents: BigInt(input.quote.totals.totalInCents),
            validUntil: input.input.conditions.validUntil
              ? new Date(`${input.input.conditions.validUntil}T00:00:00.000Z`)
              : null,
          },
        });

        await transaction.quote.update({
          data: {
            currentRevisionId: revision.id,
            totalCents: BigInt(input.quote.totals.totalInCents),
          },
          where: { id: quote.id },
        });
        const result: QuoteDetails = {
          ...input.quote,
          revisionNumber,
        };
        await transaction.mutation.create({
          data: {
            accountId: account.id,
            commandType: 'UpdateQuoteRevision',
            fingerprint: input.fingerprint,
            mutationId: input.input.mutationId,
            result: toJson(result),
          },
        });
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async findMutation(
    authSubject: string,
    mutationId: string,
  ): Promise<Readonly<{
    fingerprint: string;
    quote: QuoteDraft | QuoteDetails;
  }> | null> {
    const mutation = await this.prisma.mutation.findFirst({
      where: { account: { authSubject }, mutationId },
    });
    return mutation
      ? {
          fingerprint: mutation.fingerprint,
          quote: mutation.result as unknown as QuoteDraft | QuoteDetails,
        }
      : null;
  }
}

function mapLines(lines: readonly QuoteLineInput[]) {
  return lines.map((line, position) => ({
    description: line.description,
    position,
    quantity: new Prisma.Decimal(line.quantity),
    totalCents: nullableBigInt(calculateLineTotalInCents(line)),
    unit: line.unit,
    unitPriceCents: nullableBigInt(line.unitPriceInCents),
  }));
}

function mapPaymentPlan(input: CreateQuoteDraft) {
  const values = {
    installments: 'INSTALLMENTS',
    integral: 'INTEGRAL',
    partial: 'PARTIAL',
  } as const;
  return values[input.conditions.paymentPlanType];
}

function mapSource(source: CreateQuoteDraft['source']) {
  const values = {
    interpretation: 'INTERPRETATION',
    manual: 'MANUAL',
    mixed: 'MIXED',
  } as const;
  return values[source];
}

function mapQuoteStatus(status: string): QuoteSummary['status'] {
  const values = {
    DRAFT: 'draft',
    READY_TO_SHARE: 'ready_to_share',
    SHARED: 'shared',
  } as const;
  return values[status as keyof typeof values] ?? 'draft';
}

function mapPaymentStatus(status: string): QuoteSummary['paymentStatus'] {
  const values = {
    PAID: 'paid',
    PARTIALLY_PAID: 'partially_paid',
    PENDING: 'pending',
  } as const;
  return values[status as keyof typeof values] ?? 'pending';
}

function mapStoredPaymentPlan(
  paymentPlanType: string,
): QuoteDetails['conditions']['paymentPlanType'] {
  const values = {
    INSTALLMENTS: 'installments',
    INTEGRAL: 'integral',
    PARTIAL: 'partial',
  } as const;
  return values[paymentPlanType as keyof typeof values] ?? 'integral';
}

function mapStoredSource(source: string): QuoteDetails['source'] {
  const values = {
    INTERPRETATION: 'interpretation',
    MANUAL: 'manual',
    MIXED: 'mixed',
  } as const;
  return values[source as keyof typeof values] ?? 'manual';
}

function toQuoteLine(line: {
  description: string;
  quantity: { toString(): string };
  unit: string | null;
  unitPriceCents: bigint | null;
}) {
  return {
    description: line.description,
    quantity: line.quantity.toString(),
    unit: line.unit,
    unitPriceInCents:
      line.unitPriceCents === null ? null : toSafeInteger(line.unitPriceCents),
  };
}

function toSafeInteger(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error('Quote total exceeds the supported money range.');
  }
  return number;
}

function nullableBigInt(value: number | null): bigint | null {
  return value === null ? null : BigInt(value);
}

function toJson(value: QuoteDraft | QuoteDetails): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2002' || error.code === 'P2034')
  );
}
