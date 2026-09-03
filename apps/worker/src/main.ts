import { hostname } from 'node:os';
import dotenv from 'dotenv';
import {
  PrismaClient,
  PrismaVoiceJobRepository,
  VoiceJobLeaseLostError,
  type ClaimedVoiceJob,
} from '@cotali/database';
import { GroqVoiceInterpreter } from '@cotali/voice';

dotenv.config({ path: '../api/.env' });
dotenv.config();

const pollIntervalMs = readPositiveInteger(
  process.env.VOICE_WORKER_POLL_INTERVAL_MS,
  1_000,
);
const maxAttempts = readPositiveInteger(
  process.env.VOICE_WORKER_MAX_ATTEMPTS,
  3,
);
const retryDelayMs = readPositiveInteger(
  process.env.VOICE_WORKER_RETRY_DELAY_MS,
  5_000,
);
const workerId = `voice-worker:${hostname()}:${process.pid}`;
const prisma = new PrismaClient();
const jobs = new PrismaVoiceJobRepository(prisma);
const interpreter = process.env.GROQ_API_KEY
  ? new GroqVoiceInterpreter({
      apiKey: process.env.GROQ_API_KEY,
      extractionModel: process.env.GROQ_EXTRACTION_MODEL,
      transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL,
    })
  : null;

let stopping = false;
process.once('SIGINT', () => {
  stopping = true;
});
process.once('SIGTERM', () => {
  stopping = true;
});

if (!interpreter) {
  console.error(
    JSON.stringify({
      service: 'cotali-worker',
      status: 'disabled',
      reason: 'GROQ_API_KEY is missing',
    }),
  );
  await prisma.$disconnect();
  process.exitCode = 1;
} else {
  console.info(
    JSON.stringify({
      service: 'cotali-worker',
      status: 'ready',
      workerId,
      pollIntervalMs,
      maxAttempts,
    }),
  );

  try {
    while (!stopping) {
      let claimed = false;
      try {
        let job = await jobs.claimNext(workerId);
        while (job && !stopping) {
          claimed = true;
          await processJob(job);
          job = await jobs.claimNext(workerId);
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            service: 'cotali-worker',
            event: 'poll_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      }

      if (!claimed) await delay(pollIntervalMs);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function processJob(job: ClaimedVoiceJob): Promise<void> {
  if (!interpreter) return;
  try {
    const interpretation = await interpreter.interpret({
      audio: job.audio,
      filename: job.filename,
      mimeType: job.mimeType,
      mutationId: job.mutationId,
    });
    await jobs.complete(job, interpretation);
    console.info(
      JSON.stringify({
        service: 'cotali-worker',
        event: 'job_completed',
        jobId: job.id,
        mutationId: job.mutationId,
        attempts: job.attempts,
      }),
    );
  } catch (error) {
    if (error instanceof VoiceJobLeaseLostError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    try {
      await jobs.fail(job, message, maxAttempts, retryDelayMs);
    } catch (leaseError) {
      if (!(leaseError instanceof VoiceJobLeaseLostError)) throw leaseError;
    }
    console.error(
      JSON.stringify({
        service: 'cotali-worker',
        event: 'job_failed',
        jobId: job.id,
        mutationId: job.mutationId,
        attempts: job.attempts,
        message,
      }),
    );
  }
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
