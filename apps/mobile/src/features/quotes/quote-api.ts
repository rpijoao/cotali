import type {
  CreateQuoteDraft,
  QuoteDraft,
  VoiceInterpretation,
  VoiceInterpretationJob,
} from '@cotali/contracts';

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

export async function interpretQuoteVoice(input: {
  mutationId: string;
  uri: string;
}): Promise<VoiceInterpretation> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const form = new FormData();
  form.append('mutationId', input.mutationId);
  form.append('audio', {
    name: 'cotali-recording.m4a',
    type: 'audio/m4a',
    uri: input.uri,
  } as unknown as Blob);

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
