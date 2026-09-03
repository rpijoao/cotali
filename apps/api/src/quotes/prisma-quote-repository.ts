import type {
  CreateQuoteDraft,
  QuoteDraft,
  QuoteLineInput,
} from '@cotali/contracts';
import { Prisma, type PrismaClient } from '@cotali/database';
import { calculateLineTotalInCents } from '@cotali/domain';
import {
  assertSameMutation,
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
          return previous.quote;
        }
        if (attempt === 2) throw error;
      }
    }

    throw new Error('Unreachable transaction retry state.');
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

  private async findMutation(
    authSubject: string,
    mutationId: string,
  ): Promise<Readonly<{ fingerprint: string; quote: QuoteDraft }> | null> {
    const mutation = await this.prisma.mutation.findFirst({
      where: { account: { authSubject }, mutationId },
    });
    return mutation
      ? {
          fingerprint: mutation.fingerprint,
          quote: mutation.result as unknown as QuoteDraft,
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

function nullableBigInt(value: number | null): bigint | null {
  return value === null ? null : BigInt(value);
}

function toJson(value: QuoteDraft): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2002' || error.code === 'P2034')
  );
}
