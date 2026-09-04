import type {
  CreateQuoteDraft,
  QuoteDraft,
  QuoteSummary,
  VoiceQuoteEditContext,
  VoiceQuoteEditInterpretation,
  VoiceInterpretation,
  VoiceInterpretationJob,
} from '@cotali/contracts';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333';
const developmentToken =
  process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN ?? (__DEV__ ? 'dev:local-user' : null);

export async function createQuoteDraft(
  input: CreateQuoteDraft,
): Promise<QuoteDraft> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const response = await fetch(`${apiUrl}/v1/quotes`, {
    body: JSON.stringify(input),
    headers: {
      authorization: `Bearer ${developmentToken}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      readApiMessage(body) ?? 'Não foi possível salvar o orçamento.',
    );
  }

  return body as QuoteDraft;
}

export async function listQuoteSummaries(): Promise<QuoteSummary[]> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const response = await fetch(`${apiUrl}/v1/quotes`, {
    headers: { authorization: `Bearer ${developmentToken}` },
    method: 'GET',
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      readApiMessage(body) ?? 'Não foi possível carregar os orçamentos.',
    );
  }
  if (!isQuoteSummaryList(body)) {
    throw new Error('A API retornou uma lista de orçamentos inválida.');
  }
  return body;
}

export async function interpretQuoteVoice(input: {
  mutationId: string;
  uri: string;
}): Promise<VoiceInterpretation> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const form = new FormData();
  form.append('mutationId', input.mutationId);
  await appendAudioPart(form, input.uri);

  const response = await fetch(`${apiUrl}/v1/voice/interpretations`, {
    body: form,
    headers: { authorization: `Bearer ${developmentToken}` },
    method: 'POST',
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      readApiMessage(body) ?? 'Não foi possível processar o áudio.',
    );
  }

  if (isVoiceInterpretation(body)) return body;
  const accepted = body as VoiceInterpretationJob;
  return await waitForVoiceInterpretation(input.mutationId, accepted);
}

export async function interpretQuoteEdit(input: {
  draft: VoiceQuoteEditContext;
  mutationId: string;
  uri: string;
}): Promise<VoiceQuoteEditInterpretation> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const form = new FormData();
  form.append('draft', JSON.stringify(input.draft));
  form.append('mutationId', input.mutationId);
  await appendAudioPart(form, input.uri);

  const response = await fetch(`${apiUrl}/v1/voice/commands`, {
    body: form,
    headers: { authorization: `Bearer ${developmentToken}` },
    method: 'POST',
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      readApiMessage(body) ?? 'Não foi possível processar o comando.',
    );
  }
  if (!isVoiceQuoteEditInterpretation(body)) {
    throw new Error('O comando retornou dados inválidos.');
  }
  return body;
}

async function appendAudioPart(form: FormData, uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('NÃ£o foi possÃ­vel ler a gravaÃ§Ã£o no navegador.');
    }
    const blob = await response.blob();
    form.append('audio', blob, audioFilename(blob.type));
    return;
  }

  const filename = uri.toLowerCase().endsWith('.wav')
    ? 'cotali-recording.wav'
    : 'cotali-recording.m4a';
  form.append('audio', new File(uri), filename);
}

function audioFilename(mimeType: string): string {
  const subtype = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';
  const extension =
    subtype === 'mpeg' ? 'mp3' : subtype === 'x-m4a' ? 'm4a' : subtype;
  return `cotali-recording.${extension}`;
}

async function waitForVoiceInterpretation(
  mutationId: string,
  initial: VoiceInterpretationJob,
): Promise<VoiceInterpretation> {
  let job = initial;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (job.status === 'completed' && job.interpretation) {
      return job.interpretation;
    }
    if (job.status === 'failed') {
      throw new Error(job.error ?? 'Não foi possível processar o áudio.');
    }
    await sleep(1_000);
    const response = await fetch(
      `${apiUrl}/v1/voice/interpretations/${mutationId}`,
      { headers: { authorization: `Bearer ${developmentToken}` } },
    );
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        readApiMessage(body) ?? 'Não foi possível consultar o processamento.',
      );
    }
    job = body as VoiceInterpretationJob;
  }
  throw new Error('O processamento demorou mais que o esperado.');
}

function isVoiceInterpretation(value: unknown): value is VoiceInterpretation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'transcript' in value &&
    typeof value.transcript === 'string'
  );
}

function isQuoteSummaryList(value: unknown): value is QuoteSummary[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'string' &&
        'client' in item &&
        typeof item.client === 'object' &&
        item.client !== null &&
        'name' in item.client &&
        typeof item.client.name === 'string' &&
        'totalInCents' in item &&
        typeof item.totalInCents === 'number',
    )
  );
}

function isVoiceQuoteEditInterpretation(
  value: unknown,
): value is VoiceQuoteEditInterpretation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'transcript' in value &&
    typeof value.transcript === 'string' &&
    'command' in value &&
    typeof value.command === 'object' &&
    value.command !== null
  );
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readApiMessage(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'object' &&
    value.error !== null &&
    'message' in value.error &&
    typeof value.error.message === 'string'
  ) {
    return value.error.message;
  }
  return null;
}
