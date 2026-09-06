import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { archiveVoiceAudio } from './voice-benchmark-archive';

const originalBenchmarkRun = process.env.VOICE_BENCHMARK_RUN;
const originalAudioDirectory = process.env.VOICE_BENCHMARK_AUDIO_DIR;
const originalNodeEnv = process.env.NODE_ENV;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  restoreEnvironment('VOICE_BENCHMARK_RUN', originalBenchmarkRun);
  restoreEnvironment('VOICE_BENCHMARK_AUDIO_DIR', originalAudioDirectory);
  restoreEnvironment('NODE_ENV', originalNodeEnv);
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('voice benchmark archive', () => {
  it('does not archive without the explicit benchmark flag', async () => {
    const directory = await createTemporaryDirectory();
    process.env.VOICE_BENCHMARK_AUDIO_DIR = directory;
    delete process.env.VOICE_BENCHMARK_RUN;

    await archiveVoiceAudio(testJob());

    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it('archives audio and metadata inside the configured directory', async () => {
    const directory = await createTemporaryDirectory();
    process.env.VOICE_BENCHMARK_AUDIO_DIR = directory;
    process.env.VOICE_BENCHMARK_RUN = 'true';
    process.env.NODE_ENV = 'test';

    await archiveVoiceAudio({
      ...testJob(),
      mutationId: '../../outside',
    });

    const entries = await readdir(directory);
    expect(entries).toEqual(['.._.._outside.wav', '.._.._outside.wav.json']);
    await expect(
      readFile(join(directory, '.._.._outside.wav')),
    ).resolves.toEqual(Buffer.from('fake-audio'));
    const metadata = JSON.parse(
      await readFile(join(directory, '.._.._outside.wav.json'), 'utf8'),
    ) as { mutationId: string; mimeType: string };
    expect(metadata).toMatchObject({
      mutationId: '../../outside',
      mimeType: 'audio/wav',
    });
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'cotali-voice-benchmark-'));
  temporaryDirectories.push(directory);
  return directory;
}

function testJob() {
  return {
    audio: Buffer.from('fake-audio'),
    filename: 'captura.wav',
    mimeType: 'audio/wav',
    mutationId: 'fixture-1',
  };
}

function restoreEnvironment(
  name: 'VOICE_BENCHMARK_RUN' | 'VOICE_BENCHMARK_AUDIO_DIR' | 'NODE_ENV',
  value: string | undefined,
): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
