import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import {
  basename,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import dotenv from 'dotenv';
import { GroqVoiceInterpreter, type VoiceTokenUsage } from '@cotali/voice';
import {
  scoreExpectedFields,
  transcriptScore,
} from './voice-benchmark-metrics.js';

dotenv.config({ path: '../api/.env' });
dotenv.config();

type BenchmarkCase = Readonly<{
  id: string;
  audio: string;
  mimeType?: string;
  durationSeconds?: number;
  expectedTranscript?: string;
  expectedFields?: unknown;
}>;

type BenchmarkCombination = Readonly<{
  transcriptionModel: string;
  extractionModel: string;
}>;

const TRANSCRIPTION_PRICES_PER_HOUR: Record<string, number> = {
  'whisper-large-v3': 0.111,
  'whisper-large-v3-turbo': 0.04,
};
const EXTRACTION_PRICES_PER_MILLION: Record<
  string,
  Readonly<{ input: number; output: number }>
> = {
  'openai/gpt-oss-20b': { input: 0.075, output: 0.3 },
  'openai/gpt-oss-120b': { input: 0.15, output: 0.6 },
};

await main();

async function main(): Promise<void> {
  if (process.env.VOICE_BENCHMARK_RUN !== 'true') {
    throw new Error(
      'Benchmark bloqueado. Defina VOICE_BENCHMARK_RUN=true para confirmar chamadas pagas.',
    );
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'O benchmark não pode ser executado com NODE_ENV=production.',
    );
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('GROQ_API_KEY não foi configurada.');

  const audioDirectory = process.env.VOICE_BENCHMARK_AUDIO_DIR?.trim();
  if (!audioDirectory) {
    throw new Error(
      'Defina VOICE_BENCHMARK_AUDIO_DIR para a pasta dos áudios.',
    );
  }
  const directory = resolve(audioDirectory);
  const manifestPath = resolve(
    process.env.VOICE_BENCHMARK_CASES ?? `${directory}/cases.json`,
  );
  const cases = await readCases(manifestPath);
  const combinations = readCombinations();
  const transcriptionModels = unique(
    combinations.map((combination) => combination.transcriptionModel),
  );
  const transcribers = new Map(
    transcriptionModels.map((model) => [
      model,
      new GroqVoiceInterpreter({ apiKey, transcriptionModel: model }),
    ]),
  );
  const extractors = new Map(
    combinations.map((combination) => [
      combinationKey(combination),
      new GroqVoiceInterpreter({
        apiKey,
        extractionModel: combination.extractionModel,
        transcriptionModel: combination.transcriptionModel,
      }),
    ]),
  );
  const transcriptions: BenchmarkTranscription[] = [];
  const results: BenchmarkResult[] = [];
  // Read and validate every local fixture before making any paid request.
  const requests = await Promise.all(
    cases.map(async (testCase) => {
      const audioPath = resolveFixtureAudioPath(directory, testCase.audio);
      return {
        testCase,
        request: {
          audio: await readFile(audioPath),
          filename: basename(audioPath),
          mimeType: testCase.mimeType ?? mimeTypeFor(audioPath),
          // The fixture id is human-readable; the domain schema still needs a
          // real UUID for the synthetic interpretation id.
          mutationId: randomUUID(),
        },
      };
    }),
  );

  for (const { testCase, request } of requests) {
    for (const transcriptionModel of transcriptionModels) {
      const transcriber = transcribers.get(transcriptionModel);
      if (!transcriber)
        throw new Error(`Transcriber ausente: ${transcriptionModel}`);

      const transcriptionStartedAt = performance.now();
      try {
        const transcription = await transcriber.transcribe(request);
        const transcriptionLatencyMs = Math.round(
          performance.now() - transcriptionStartedAt,
        );
        const transcriptMetric = testCase.expectedTranscript
          ? transcriptScore(testCase.expectedTranscript, transcription.text)
          : null;
        const transcriptionRecord: BenchmarkTranscription = {
          caseId: testCase.id,
          transcriptionModel,
          latencyMs: transcriptionLatencyMs,
          transcript: transcription.text,
          transcriptScore: transcriptMetric,
          estimatedTranscriptionUsd: estimateTranscriptionCost(
            transcriptionModel,
            testCase.durationSeconds,
          ),
          error: null,
        };
        transcriptions.push(transcriptionRecord);

        const matchingCombinations = combinations.filter(
          (combination) =>
            combination.transcriptionModel === transcriptionModel,
        );
        for (const combination of matchingCombinations) {
          const extractionStartedAt = performance.now();
          const totalStartedAt = transcriptionStartedAt;
          const extractor = extractors.get(combinationKey(combination));
          if (!extractor)
            throw new Error(
              `Extractor ausente: ${combinationKey(combination)}`,
            );
          try {
            const extraction = await extractor.extractDetailed({
              mutationId: request.mutationId,
              text: transcription.text,
              transcriptSegments: transcription.transcriptSegments,
            });
            const extractionUsage = extraction.usage;
            results.push({
              caseId: testCase.id,
              transcriptionModel,
              extractionModel: combination.extractionModel,
              latencyMs: Math.round(performance.now() - totalStartedAt),
              transcriptionLatencyMs,
              extractionLatencyMs: Math.round(
                performance.now() - extractionStartedAt,
              ),
              transcript: transcription.text,
              transcriptScore: transcriptMetric,
              extraction: extraction.interpretation,
              fieldScore:
                testCase.expectedFields === undefined
                  ? null
                  : scoreExpectedFields(
                      extraction.interpretation,
                      testCase.expectedFields,
                    ),
              estimatedTranscriptionUsd:
                transcriptionRecord.estimatedTranscriptionUsd,
              promptTokens: extractionUsage.promptTokens,
              completionTokens: extractionUsage.completionTokens,
              totalTokens: extractionUsage.totalTokens,
              estimatedExtractionUsd: estimateExtractionCost(
                combination.extractionModel,
                extractionUsage,
              ),
              error: null,
            });
          } catch (error) {
            results.push(
              failedResult(
                testCase,
                combination,
                transcription.text,
                transcriptMetric,
                transcriptionRecord.estimatedTranscriptionUsd,
                transcriptionLatencyMs,
                Math.round(performance.now() - totalStartedAt),
                Math.round(performance.now() - extractionStartedAt),
                error,
              ),
            );
          }
        }
      } catch (error) {
        const latencyMs = Math.round(
          performance.now() - transcriptionStartedAt,
        );
        transcriptions.push({
          caseId: testCase.id,
          transcriptionModel,
          latencyMs,
          transcript: null,
          transcriptScore: null,
          estimatedTranscriptionUsd: null,
          error: errorMessage(error),
        });
        for (const combination of combinations.filter(
          (item) => item.transcriptionModel === transcriptionModel,
        )) {
          results.push(
            failedResult(
              testCase,
              combination,
              null,
              null,
              null,
              latencyMs,
              latencyMs,
              null,
              error,
            ),
          );
        }
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    manifest: manifestPath,
    combinations,
    transcriptions,
    results,
    summary: summarize(results, transcriptions, combinations),
  };
  const outputPath = resolve(
    process.env.VOICE_BENCHMARK_OUTPUT ??
      `${directory}/results-${Date.now()}.json`,
  );
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, summary: report.summary }, null, 2));
}

type BenchmarkResult = Readonly<{
  caseId: string;
  transcriptionModel: string;
  extractionModel: string;
  latencyMs: number;
  transcriptionLatencyMs: number;
  extractionLatencyMs: number | null;
  transcript: string | null;
  transcriptScore: number | null;
  extraction: unknown | null;
  fieldScore: ReturnType<typeof scoreExpectedFields> | null;
  estimatedTranscriptionUsd: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedExtractionUsd: number | null;
  error: string | null;
}>;

type BenchmarkTranscription = Readonly<{
  caseId: string;
  transcriptionModel: string;
  latencyMs: number;
  transcript: string | null;
  transcriptScore: number | null;
  estimatedTranscriptionUsd: number | null;
  error: string | null;
}>;

function failedResult(
  testCase: BenchmarkCase,
  combination: BenchmarkCombination,
  transcript: string | null,
  transcriptMetric: number | null,
  estimatedTranscriptionUsd: number | null,
  transcriptionLatencyMs: number,
  latencyMs: number,
  extractionLatencyMs: number | null,
  error: unknown,
): BenchmarkResult {
  return {
    caseId: testCase.id,
    transcriptionModel: combination.transcriptionModel,
    extractionModel: combination.extractionModel,
    latencyMs,
    transcriptionLatencyMs,
    extractionLatencyMs,
    transcript,
    transcriptScore: transcriptMetric,
    extraction: null,
    fieldScore: null,
    estimatedTranscriptionUsd,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    estimatedExtractionUsd: null,
    error: errorMessage(error),
  };
}

async function readCases(path: string): Promise<BenchmarkCase[]> {
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('O manifesto do benchmark deve ser um array não vazio.');
  }
  return parsed.map((value, index) => {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('id' in value) ||
      typeof value.id !== 'string' ||
      !('audio' in value) ||
      typeof value.audio !== 'string'
    ) {
      throw new Error(`Caso ${index + 1} do benchmark é inválido.`);
    }
    return value as BenchmarkCase;
  });
}

function readCombinations(): BenchmarkCombination[] {
  const configured = process.env.VOICE_BENCHMARK_COMBINATIONS?.trim();
  const values = configured
    ? configured.split(',').map((value) => value.trim())
    : ['whisper-large-v3-turbo|openai/gpt-oss-20b'];
  const combinations = values.map((value) => {
    const [transcriptionModel, extractionModel] = value.split('|');
    if (!transcriptionModel || !extractionModel) {
      throw new Error(
        'VOICE_BENCHMARK_COMBINATIONS use o formato transcription|extraction.',
      );
    }
    return { transcriptionModel, extractionModel };
  });
  return combinations.filter(
    (combination, index) =>
      combinations.findIndex(
        (item) => combinationKey(item) === combinationKey(combination),
      ) === index,
  );
}

function estimateTranscriptionCost(
  model: string,
  durationSeconds: number | undefined,
): number | null {
  const price = TRANSCRIPTION_PRICES_PER_HOUR[model];
  if (price === undefined || durationSeconds === undefined) return null;
  return Number(((durationSeconds / 3_600) * price).toFixed(6));
}

function estimateExtractionCost(
  model: string,
  usage: VoiceTokenUsage,
): number | null {
  const price = EXTRACTION_PRICES_PER_MILLION[model];
  if (
    price === undefined ||
    usage.promptTokens === null ||
    usage.completionTokens === null
  )
    return null;
  return Number(
    (
      (usage.promptTokens / 1_000_000) * price.input +
      (usage.completionTokens / 1_000_000) * price.output
    ).toFixed(6),
  );
}

function mimeTypeFor(path: string): string {
  const extension = extname(path).toLowerCase();
  return (
    {
      '.m4a': 'audio/m4a',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
    }[extension] ?? 'application/octet-stream'
  );
}

function resolveFixtureAudioPath(directory: string, audio: string): string {
  const audioPath = resolve(directory, audio);
  const relativePath = relative(directory, audioPath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`O áudio do caso deve ficar dentro de ${directory}.`);
  }
  return audioPath;
}

function summarize(
  results: readonly BenchmarkResult[],
  transcriptions: readonly BenchmarkTranscription[],
  combinations: readonly BenchmarkCombination[],
) {
  return combinations.map((combination) => {
    const matching = results.filter(
      (result) =>
        result.transcriptionModel === combination.transcriptionModel &&
        result.extractionModel === combination.extractionModel,
    );
    return {
      ...combination,
      cases: matching.length,
      errors: matching.filter((result) => result.error !== null).length,
      averageLatencyMs: average(matching.map((result) => result.latencyMs)),
      averageTranscriptScore: averageNullable(
        matching.map((result) => result.transcriptScore),
      ),
      averageFieldScore: averageNullable(
        matching.map((result) => result.fieldScore?.score ?? null),
      ),
      estimatedTranscriptionUsd: sumNullable(
        transcriptions
          .filter(
            (transcription) =>
              transcription.transcriptionModel ===
              combination.transcriptionModel,
          )
          .map((transcription) => transcription.estimatedTranscriptionUsd),
      ),
      estimatedExtractionUsd: sumNullable(
        matching.map((result) => result.estimatedExtractionUsd),
      ),
      averageTotalTokens: averageNullable(
        matching.map((result) => result.totalTokens),
      ),
    };
  });
}

function combinationKey(combination: BenchmarkCombination): string {
  return `${combination.transcriptionModel}\u0000${combination.extractionModel}`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function average(values: readonly number[]): number | null {
  return values.length === 0
    ? null
    : Number(
        (
          values.reduce((total, value) => total + value, 0) / values.length
        ).toFixed(2),
      );
}

function averageNullable(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : average(present);
}

function sumNullable(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0
    ? null
    : Number(present.reduce((total, value) => total + value, 0).toFixed(6));
}
