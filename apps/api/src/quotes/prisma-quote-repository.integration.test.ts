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
const subjects = new Set([subject]);

afterAll(async () => {
  if (!prisma) return;
  for (const authSubject of subjects) {
    const account = await prisma.account.findUnique({
      where: { authSubject },
    });
    if (!account) continue;
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

    const updated = await service.updateDraft(subject, first.id, {
      ...input,
      client: { name: 'Cliente de integração atualizado', phone: null },
      mutationId: randomUUID(),
      services: [
        {
          description: 'Instalação revisada',
          quantity: '2',
          unit: 'un',
          unitPriceInCents: 15000,
        },
      ],
    });
    const storedUpdated = await prisma.quote.findUnique({
      include: {
        currentRevision: { include: { materials: true, services: true } },
      },
      where: { id: first.id },
    });

    expect(updated).toMatchObject({
      client: { name: 'Cliente de integração atualizado', phone: null },
      revisionNumber: 2,
      services: [
        {
          description: 'Instalação revisada',
          quantity: '2',
          unit: 'un',
          unitPriceInCents: 15000,
        },
      ],
      totals: {
        servicesInCents: 30000,
        totalInCents: 30000,
      },
    });
    expect(storedUpdated?.currentRevision?.revisionNumber).toBe(2);
    expect(storedUpdated?.totalCents).toBe(30000n);
  }, 20_000);

  it('does not expose one account quote through another account subject', async () => {
    if (!prisma) throw new Error('A database URL is required.');
    const firstSubject = `integration:${randomUUID()}`;
    const secondSubject = `integration:${randomUUID()}`;
    subjects.add(firstSubject);
    subjects.add(secondSubject);
    const service = new QuoteService(new PrismaQuoteRepository(prisma));
    const createInput = (name: string) => ({
      client: { name, phone: null },
      conditions: {
        executionDeadline: null,
        installmentCount: null,
        notes: null,
        paymentMethod: 'Pix',
        paymentPlanType: 'integral' as const,
        validUntil: null,
      },
      discountInCents: 0,
      materials: [],
      mutationId: randomUUID(),
      services: [
        {
          description: 'Serviço isolado',
          quantity: '1',
          unit: 'un',
          unitPriceInCents: 1000,
        },
      ],
      source: 'manual' as const,
    });

    const firstQuote = await service.createDraft(
      firstSubject,
      createInput('Cliente da primeira conta'),
    );
    const secondQuote = await service.createDraft(
      secondSubject,
      createInput('Cliente da segunda conta'),
    );
    const repository = new PrismaQuoteRepository(prisma);

    await expect(
      repository.getById(firstSubject, secondQuote.id),
    ).resolves.toBeNull();
    await expect(
      repository.getById(secondSubject, firstQuote.id),
    ).resolves.toBeNull();
    expect(await repository.listRecent(firstSubject, 20)).toEqual([
      expect.objectContaining({ id: firstQuote.id }),
    ]);
    expect(await repository.listRecent(secondSubject, 20)).toEqual([
      expect.objectContaining({ id: secondQuote.id }),
    ]);
  }, 20_000);
});
