import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient, type VoiceJob } from '@prisma/client';
import type {
  VoiceInterpretation,
  VoiceInterpretationJob,
} from '@cotali/contracts';

export type EnqueueVoiceJobInput = Readonly<{
  authSubject: string;
  audio: Buffer;
  filename: string;
  mimeType: string;
  mutationId: string;
}>;

export type ClaimedVoiceJob = Readonly<{
  id: string;
  mutationId: string;
  audio: Buffer;
  filename: string;
  mimeType: string;
  attempts: number;
  workerId: string;
}>;

export interface VoiceJobRepository {
  enqueue(input: EnqueueVoiceJobInput): Promise<VoiceInterpretationJob>;
  find(
    authSubject: string,
    mutationId: string,
  ): Promise<VoiceInterpretationJob | null>;
}

export class VoiceJobConflictError extends Error {
  constructor() {
    super('The mutation identifier was already used with different audio.');
    this.name = 'VoiceJobConflictError';
  }
}

export class VoiceJobLeaseLostError extends Error {
  constructor() {
    super('The voice job lease is no longer owned by this worker.');
    this.name = 'VoiceJobLeaseLostError';
  }
}

export class PrismaVoiceJobRepository implements VoiceJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async enqueue(input: EnqueueVoiceJobInput): Promise<VoiceInterpretationJob> {
    const fingerprint = createHash('sha256').update(input.audio).digest('hex');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const job = await this.prisma.$transaction(
          async (transaction) => {
            const account = await transaction.account.upsert({
              create: { authSubject: input.authSubject },
              update: {},
              where: { authSubject: input.authSubject },
            });
            const previous = await transaction.voiceJob.findUnique({
              where: {
                accountId_mutationId: {
                  accountId: account.id,
                  mutationId: input.mutationId,
                },
              },
            });

            if (previous) {
              assertSameFingerprint(previous.fingerprint, fingerprint);
              return previous;
            }

            return await transaction.voiceJob.create({
              data: {
                accountId: account.id,
                audioBytes: Uint8Array.from(input.audio),
                filename: input.filename,
                fingerprint,
                mimeType: input.mimeType,
                mutationId: input.mutationId,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return mapVoiceJob(job);
      } catch (error) {
        if (!isRetryableTransactionError(error)) throw error;
        const previous = await this.findByMutation(
          input.authSubject,
          input.mutationId,
        );
        if (previous) {
          assertSameFingerprint(previous.fingerprint, fingerprint);
          return mapVoiceJob(previous);
        }
        if (attempt === 2) throw error;
      }
    }

    throw new Error('Unreachable voice job retry state.');
  }

  async find(
    authSubject: string,
    mutationId: string,
  ): Promise<VoiceInterpretationJob | null> {
    const job = await this.findByMutation(authSubject, mutationId);
    return job ? mapVoiceJob(job) : null;
  }

  async claimNext(
    workerId: string,
    staleAfterMs = 5 * 60 * 1_000,
  ): Promise<ClaimedVoiceJob | null> {
    const staleBefore = new Date(Date.now() - staleAfterMs);
    return await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<VoiceJobClaimRow[]>`
        WITH candidate AS (
          SELECT "id"
          FROM "voice_jobs"
          WHERE "audio_bytes" IS NOT NULL
            AND "available_at" <= CURRENT_TIMESTAMP
            AND (
              "status" = 'PENDING'
              OR ("status" = 'PROCESSING' AND "locked_at" <= ${staleBefore})
            )
          ORDER BY "available_at" ASC, "created_at" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "voice_jobs" AS job
        SET
          "status" = 'PROCESSING',
          "attempts" = job."attempts" + 1,
          "locked_at" = CURRENT_TIMESTAMP,
          "locked_by" = ${workerId},
          "started_at" = COALESCE(job."started_at", CURRENT_TIMESTAMP),
          "updated_at" = CURRENT_TIMESTAMP
        FROM candidate
        WHERE job."id" = candidate."id"
        RETURNING
          job."id",
          job."mutation_id",
          job."audio_bytes",
          job."filename",
          job."mime_type",
          job."attempts"
      `;
      const row = rows[0];
      if (!row || !row.audio_bytes) return null;
      return {
        id: row.id,
        mutationId: row.mutation_id,
        audio: row.audio_bytes,
        filename: row.filename,
        mimeType: row.mime_type,
        attempts: row.attempts,
        workerId,
      };
    });
  }

  async complete(
    job: ClaimedVoiceJob,
    interpretation: VoiceInterpretation,
  ): Promise<void> {
    const updated = await this.prisma.voiceJob.updateMany({
      where: {
        id: job.id,
        lockedBy: job.workerId,
        status: 'PROCESSING',
      },
      data: {
        audioBytes: null,
        errorMessage: null,
        interpretation: toJson(interpretation),
        lockedAt: null,
        lockedBy: null,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    if (updated.count !== 1) throw new VoiceJobLeaseLostError();
  }

  async fail(
    job: ClaimedVoiceJob,
    message: string,
    maxAttempts: number,
    retryDelayMs: number,
  ): Promise<void> {
    const terminal = job.attempts >= maxAttempts;
    const updated = await this.prisma.voiceJob.updateMany({
      where: {
        id: job.id,
        lockedBy: job.workerId,
        status: 'PROCESSING',
      },
      data: {
        ...(terminal
          ? { audioBytes: null }
          : { availableAt: new Date(Date.now() + retryDelayMs) }),
        errorMessage: message.slice(0, 2_000),
        lockedAt: null,
        lockedBy: null,
        status: terminal ? 'FAILED' : 'PENDING',
      },
    });
    if (updated.count !== 1) throw new VoiceJobLeaseLostError();
  }

  private async findByMutation(
    authSubject: string,
    mutationId: string,
  ): Promise<VoiceJob | null> {
    return await this.prisma.voiceJob.findFirst({
      where: { account: { authSubject }, mutationId },
    });
  }
}

type VoiceJobClaimRow = {
  id: string;
  mutation_id: string;
  audio_bytes: Buffer | null;
  filename: string;
  mime_type: string;
  attempts: number;
};

function mapVoiceJob(job: VoiceJob): VoiceInterpretationJob {
  return {
    id: job.id,
    mutationId: job.mutationId,
    status: job.status.toLowerCase() as VoiceInterpretationJob['status'],
    attempts: job.attempts,
    interpretation: job.interpretation
      ? (job.interpretation as unknown as VoiceInterpretation)
      : null,
    error: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function assertSameFingerprint(previous: string, current: string): void {
  if (previous !== current) throw new VoiceJobConflictError();
}

function toJson(value: VoiceInterpretation): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2002' || error.code === 'P2034')
  );
}
