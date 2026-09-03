import type { CreateQuoteDraft, QuoteDraft } from '@cotali/contracts';

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
