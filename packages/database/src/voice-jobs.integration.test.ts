import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaVoiceJobRepository } from './voice-jobs.js';
import type { VoiceInterpretation } from '@cotali/contracts';

const databaseUrl =
  process.env.RUN_DATABASE_INTEGRATION === 'true'
    ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL)
    : undefined;
const run = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : null;
const subject = `voice-integration:${randomUUID()}`;

afterAll(async () => {
  if (!prisma) return;
  const account = await prisma.account.findUnique({
    where: { authSubject: subject },
  });
  if (account) {
    await prisma.voiceJob.deleteMany({ where: { accountId: account.id } });
    await prisma.account.delete({ where: { id: account.id } });
  }
  await prisma.$disconnect();
});

run('PrismaVoiceJobRepository', () => {
  it('persists, claims, retries, and completes a voice job idempotently', async () => {
    if (!prisma) throw new Error('A database URL is required.');
    const repository = new PrismaVoiceJobRepository(prisma);
    const mutationId = randomUUID();
    const input = {
      authSubject: subject,
      audio: Buffer.from('fake audio bytes'),
      filename: 'recording.m4a',
      mimeType: 'audio/m4a',
      mutationId,
    };

    const first = await repository.enqueue(input);
    const retry = await repository.enqueue(input);
    expect(retry).toEqual(first);
    expect(first.status).toBe('pending');
    const storedBeforeClaim = await prisma.voiceJob.findUnique({
      where: { id: first.id },
    });
    expect(storedBeforeClaim?.status).toBe('PENDING');

    const claimed = await claimEventually(repository, 'integration-worker');
    expect(claimed).toMatchObject({
      attempts: 1,
      filename: 'recording.m4a',
      mutationId,
      workerId: 'integration-worker',
    });
    if (!claimed) throw new Error('Expected a claimed job.');

    await repository.fail(claimed, 'temporary provider failure', 3, 0);
    const retried = await claimEventually(repository, 'integration-worker');
    expect(retried?.attempts).toBe(2);
    if (!retried) throw new Error('Expected the job to be retried.');

    await repository.complete(retried, fakeInterpretation(mutationId));
    const completed = await repository.find(subject, mutationId);
    expect(completed).toMatchObject({
      mutationId,
      status: 'completed',
      interpretation: { id: mutationId },
    });
    expect(
      await prisma.voiceJob.findUnique({ where: { id: first.id } }),
    ).toMatchObject({ audioBytes: null, attempts: 2, status: 'COMPLETED' });
  }, 20_000);
});

function fakeInterpretation(mutationId: string): VoiceInterpretation {
  return {
    ambiguities: [],
    client: { name: null, phone: null },
    conditions: {
      executionDeadline: null,
      installmentCount: null,
      notes: null,
      paymentMethod: null,
      paymentPlanType: null,
      validUntil: null,
    },
    createdAt: '2026-09-03T00:00:00.000Z',
    discountInCents: null,
    id: mutationId,
    materials: [],
    services: [],
    source: 'interpretation',
    transcript: 'teste',
    transcriptSegments: [],
  };
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function claimEventually(
  repository: PrismaVoiceJobRepository,
  workerId: string,
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const job = await repository.claimNext(workerId, 60_000);
    if (job) return job;
    await delay(500);
  }
  return null;
}
