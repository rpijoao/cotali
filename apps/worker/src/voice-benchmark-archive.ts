import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import type { ClaimedVoiceJob } from '@cotali/database';

type ArchiveableVoiceJob = Pick<
  ClaimedVoiceJob,
  'audio' | 'filename' | 'mimeType' | 'mutationId'
>;

/**
 * Archives a voice job only when an explicit non-production benchmark folder
 * is configured. Normal development and production runs never copy audio.
 */
export async function archiveVoiceAudio(
  job: ArchiveableVoiceJob,
): Promise<void> {
  const directory = benchmarkAudioDirectory();
  if (!directory) return;

  await mkdir(directory, { recursive: true });
  const extension = safeExtension(job.filename);
  const basename = `${safeStem(job.mutationId || randomUUID())}${extension}`;
  const audioPath = resolve(directory, basename);

  try {
    await writeFile(audioPath, job.audio, { flag: 'wx' });
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
  }

  try {
    await writeFile(
      `${audioPath}.json`,
      `${JSON.stringify(
        {
          filename: job.filename,
          mimeType: job.mimeType,
          mutationId: job.mutationId,
          bytes: job.audio.byteLength,
          archivedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
  }
}

function benchmarkAudioDirectory(): string | null {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.VOICE_BENCHMARK_RUN !== 'true'
  )
    return null;
  const configured = process.env.VOICE_BENCHMARK_AUDIO_DIR?.trim();
  return configured ? resolve(configured) : null;
}

function safeExtension(filename: string): string {
  const extension = extname(filename).toLowerCase();
  return /^[.][a-z0-9]{1,8}$/.test(extension) ? extension : '.audio';
}

function safeStem(value: string): string {
  const normalized = value.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 96);
  return normalized || randomUUID();
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'EEXIST'
  );
}
