import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@cotali/database';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaQuoteRepository } from './prisma-quote-repository.js';
import { QuoteService } from './quote-service.js';

const databaseUrl =
  process.env.RUN_DATABASE_INTEGRATION === 'true'
    ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL)
    : undefined;
const run = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : null;
const subject = `integration:${randomUUID()}`;

afterAll(async () => {
  if (!prisma) return;
  const account = await prisma.account.findUnique({
    where: { authSubject: subject },
  });
  if (account) {
    await prisma.mutation.deleteMany({ where: { accountId: account.id } });
    await prisma.quote.deleteMany({ where: { accountId: account.id } });
    await prisma.client.deleteMany({ where: { accountId: account.id } });
    await prisma.account.delete({ where: { id: account.id } });
  }
  await prisma.$disconnect();
});

run('PrismaQuoteRepository', () => {
  it('persists one complete and idempotent quote aggregate', async () => {
    if (!prisma) throw new Error('A database URL is required.');
    const service = new QuoteService(new PrismaQuoteRepository(prisma));
    const mutationId = randomUUID();
    const input = {
      client: { name: 'Cliente de integração', phone: '+5511999999999' },
      conditions: {
        executionDeadline: '5 dias úteis',
        installmentCount: null,
        notes: null,
        paymentMethod: 'Pix',
        paymentPlanType: 'integral' as const,
        validUntil: null,
      },
      discountInCents: 0,
      materials: [],
      mutationId,
      services: [
        {
          description: 'Instalação',
          quantity: '1',
          unit: 'un',
          unitPriceInCents: 15000,
        },
      ],
      source: 'manual' as const,
    };

    const first = await service.createDraft(subject, input);
    const retry = await service.createDraft(subject, input);
    const stored = await prisma.quote.findUnique({
      include: {
        currentRevision: { include: { materials: true, services: true } },
      },
      where: { id: first.id },
    });

    expect(retry).toEqual(first);
    expect(stored?.currentRevision?.services).toHaveLength(1);
    expect(stored?.totalCents).toBe(15000n);
    expect(
      await prisma.mutation.count({
        where: { account: { authSubject: subject }, mutationId },
      }),
    ).toBe(1);

    const details = await new PrismaQuoteRepository(prisma).getById(
      subject,
      first.id,
    );
    expect(details).toMatchObject({
      client: input.client,
      id: first.id,
      paymentStatus: 'pending',
      services: input.services,
      source: 'manual',
      status: 'draft',
    });
  }, 20_000);
});
