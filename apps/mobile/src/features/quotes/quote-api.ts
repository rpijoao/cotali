import type {
  CreateQuoteDraft,
  QuoteDetails,
  QuoteDraft,
  QuoteSummary,
  UpdateQuoteRevision,
  VoiceQuoteEditContext,
  VoiceQuoteEditInterpretation,
  VoiceInterpretation,
  VoiceInterpretationJob,
} from '@cotali/contracts';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, TurboModuleRegistry } from 'react-native';
import type NativeShare from 'react-native-share';

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

export async function updateQuoteRevision(
  quoteId: string,
  input: UpdateQuoteRevision,
): Promise<QuoteDetails> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const response = await fetch(
    `${apiUrl}/v1/quotes/${encodeURIComponent(quoteId)}/revisions`,
    {
      body: JSON.stringify(input),
      headers: {
        authorization: `Bearer ${developmentToken}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    },
  );
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      readApiMessage(body) ?? 'Não foi possível atualizar o orçamento.',
    );
  }
  if (!isQuoteDetails(body)) {
    throw new Error('A API retornou um orçamento inválido.');
  }
  return body;
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

export async function getQuoteDetails(quoteId: string): Promise<QuoteDetails> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const response = await fetch(
    `${apiUrl}/v1/quotes/${encodeURIComponent(quoteId)}`,
    { headers: { authorization: `Bearer ${developmentToken}` }, method: 'GET' },
  );
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      readApiMessage(body) ?? 'Não foi possível carregar o orçamento.',
    );
  }
  if (!isQuoteDetails(body)) {
    throw new Error('A API retornou um orçamento inválido.');
  }
  return body;
}

export async function downloadQuoteProposal(quoteId: string): Promise<File> {
  if (!developmentToken) {
    throw new Error('A sessão autenticada ainda não foi configurada.');
  }

  const response = await fetch(
    `${apiUrl}/v1/quotes/${encodeURIComponent(quoteId)}/proposal.pdf`,
    {
      headers: { authorization: `Bearer ${developmentToken}` },
      method: 'GET',
    },
  );

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // The API may return a non-JSON transport error for a binary endpoint.
    }
    throw new Error(
      readApiMessage(body) ?? 'Não foi possível gerar o PDF do orçamento.',
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error('A API retornou um PDF vazio.');
  }

  const file = new File(Paths.document, `cotali-orcamento-${quoteId}.pdf`);
  file.write(bytes);
  return file;
}

export async function shareQuoteProposal(quoteId: string): Promise<void> {
  const file = await downloadQuoteProposal(quoteId);
  await sharePdfWithSystemSheet(file.uri);
}

export async function shareQuoteProposalToWhatsApp(input: {
  clientName: string;
  clientPhone: string | null;
  quoteId: string;
}): Promise<void> {
  const phone = normalizeWhatsAppPhone(input.clientPhone);
  const nativeShare =
    Platform.OS === 'android' || Platform.OS === 'ios'
      ? await loadNativeShare()
      : null;
  const file = await downloadQuoteProposal(input.quoteId);
  const clientName = input.clientName.trim() || 'cliente';
  const message = `Olá, ${clientName}! Segue sua proposta comercial do Cotali em PDF.`;

  if (Platform.OS === 'android' && nativeShare) {
    const options = {
      filename: `cotali-orcamento-${input.quoteId}.pdf`,
      message,
      social: nativeShare.Social.WHATSAPP,
      title: 'Proposta Cotali',
      type: 'application/pdf',
      url: file.uri,
    } as WhatsAppShareOptions;
    if (phone) {
      // The library supports this Android option, but it is not in its public
      // TypeScript definition yet.
      options.whatsAppNumber = phone;
    }
    await nativeShare.shareSingle(options);
    return;
  }

  if (Platform.OS === 'ios' && nativeShare) {
    // iOS shareSingle treats a PDF URL as text. The native share sheet keeps
    // the PDF as an attachment and lets the user choose WhatsApp.
    await nativeShare.open({
      message,
      title: 'Proposta Cotali',
      type: 'application/pdf',
      url: file.uri,
    });
    return;
  }

  await sharePdfWithSystemSheet(file.uri);
}

type WhatsAppShareOptions = Parameters<typeof NativeShare.shareSingle>[0] & {
  whatsAppNumber?: string;
};

async function sharePdfWithSystemSheet(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      'O compartilhamento não está disponível neste dispositivo.',
    );
  }
  await Sharing.shareAsync(uri, {
    dialogTitle: 'Compartilhar orçamento',
    mimeType: 'application/pdf',
  });
}

type NativeShareModule = typeof NativeShare;

async function loadNativeShare(): Promise<NativeShareModule | null> {
  if (!TurboModuleRegistry.get('RNShare')) {
    return null;
  }
  try {
    return (await import('react-native-share')).default;
  } catch {
    return null;
  }
}

function normalizeWhatsAppPhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits === '') return null;
  const normalized = digits.length <= 11 ? `55${digits}` : digits;
  if (normalized.length < 10 || normalized.length > 15) return null;
  return normalized;
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
      throw new Error('Não foi possível ler a gravação no navegador.');
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

function isQuoteDetails(value: unknown): value is QuoteDetails {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'client' in value &&
    typeof value.client === 'object' &&
    value.client !== null &&
    'name' in value.client &&
    typeof value.client.name === 'string' &&
    'services' in value &&
    Array.isArray(value.services) &&
    'materials' in value &&
    Array.isArray(value.materials) &&
    'conditions' in value &&
    typeof value.conditions === 'object' &&
    value.conditions !== null &&
    'totals' in value &&
    typeof value.totals === 'object' &&
    value.totals !== null
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
