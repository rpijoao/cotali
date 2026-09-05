import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const { nativeShareMock, platformMock, turboModuleRegistryMock } = vi.hoisted(
  () => ({
    nativeShareMock: {
      Social: { WHATSAPP: 'whatsapp' },
      open: vi.fn(),
      shareSingle: vi.fn(),
    },
    platformMock: { OS: 'web' as string },
    turboModuleRegistryMock: { get: vi.fn((): object | null => ({})) },
  }),
);

vi.mock('react-native', () => ({
  Platform: platformMock,
  TurboModuleRegistry: turboModuleRegistryMock,
}));
const sharingMock = {
  isAvailableAsync: vi.fn(),
  shareAsync: vi.fn(),
};

vi.mock('expo-file-system', () => ({
  File: class File {
    readonly uri = 'file:///documents/cotali-proposal.pdf';
    write = vi.fn();
  },
  Paths: { document: 'file:///documents' },
}));
vi.mock('expo-sharing', () => sharingMock);
vi.mock('react-native-share', () => ({ default: nativeShareMock }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

let interpretQuoteVoice: (input: {
  mutationId: string;
  uri: string;
}) => Promise<unknown>;
let listQuoteSummaries: () => Promise<unknown>;
let getQuoteDetails: (quoteId: string) => Promise<unknown>;
let downloadQuoteProposal: (quoteId: string) => Promise<unknown>;
let shareQuoteProposal: (quoteId: string) => Promise<void>;
let shareQuoteProposalToWhatsApp: (input: {
  clientName: string;
  clientPhone: string | null;
  quoteId: string;
}) => Promise<void>;

beforeAll(async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3333';
  process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN = 'dev:local-user';
  ({
    downloadQuoteProposal,
    getQuoteDetails,
    interpretQuoteVoice,
    listQuoteSummaries,
    shareQuoteProposal,
    shareQuoteProposalToWhatsApp,
  } = await import('./quote-api'));
});

afterEach(() => {
  fetchMock.mockReset();
  nativeShareMock.open.mockReset();
  nativeShareMock.shareSingle.mockReset();
  sharingMock.isAvailableAsync.mockReset();
  sharingMock.shareAsync.mockReset();
  platformMock.OS = 'web';
});

describe('interpretQuoteVoice on web', () => {
  it('converts the browser recording blob into a multipart file', async () => {
    const mutationId = '73070f7c-a464-47d7-90bf-b06ac2ce7a1e';
    const recording = new Blob(['voice'], { type: 'audio/webm;codecs=opus' });
    const interpretation = {
      id: '9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d',
      transcript: 'Troca de tomada por cem reais.',
      transcriptSegments: [],
      client: { name: 'Maria', phone: null },
      services: [],
      materials: [],
      conditions: {
        paymentMethod: null,
        paymentPlanType: null,
        installmentCount: null,
        executionDeadline: null,
        validUntil: null,
        notes: null,
      },
      discountInCents: null,
      ambiguities: [],
      source: 'interpretation' as const,
      createdAt: '2026-09-03T22:00:00.000Z',
    };

    fetchMock
      .mockResolvedValueOnce({ ok: true, blob: async () => recording })
      .mockResolvedValueOnce({ ok: true, json: async () => interpretation });

    await expect(
      interpretQuoteVoice({ mutationId, uri: 'blob:cotali-recording' }),
    ).resolves.toEqual(interpretation);

    const [, request] = fetchMock.mock.calls;
    if (!request) throw new Error('The API request was not captured.');
    const form = request[1].body as FormData;
    const audio = form.get('audio');

    expect(form.get('mutationId')).toBe(mutationId);
    expect(audio).toBeInstanceOf(Blob);
    expect(audio).toMatchObject({ name: 'cotali-recording.webm' });
    expect((audio as Blob).type).toBe('audio/webm;codecs=opus');
  });
});

describe('listQuoteSummaries', () => {
  it('loads the authenticated quote summaries', async () => {
    const summaries = [
      {
        client: { name: 'Ana Maria', phone: null },
        createdAt: '2026-09-04T12:00:00.000Z',
        id: '9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d',
        paymentStatus: 'pending',
        revisionNumber: 1,
        status: 'draft',
        totalInCents: 15000,
      },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => summaries,
    });

    await expect(listQuoteSummaries()).resolves.toEqual(summaries);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3333/v1/quotes', {
      headers: { authorization: 'Bearer dev:local-user' },
      method: 'GET',
    });
  });

  it('rejects malformed API data', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'not-a-summary' }],
    });

    await expect(listQuoteSummaries()).rejects.toThrow(
      'A API retornou uma lista de orçamentos inválida.',
    );
  });
});

describe('getQuoteDetails', () => {
  it('loads a saved quote by id', async () => {
    const quote = {
      client: { name: 'Ana Maria', phone: null },
      conditions: {
        executionDeadline: null,
        installmentCount: null,
        notes: null,
        paymentMethod: 'Pix',
        paymentPlanType: 'integral',
        validUntil: null,
      },
      createdAt: '2026-09-04T12:00:00.000Z',
      discountInCents: 0,
      id: '9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d',
      materials: [],
      paymentStatus: 'pending',
      revisionNumber: 1,
      services: [
        {
          description: 'Instalação',
          quantity: '1',
          unit: 'un',
          unitPriceInCents: 15000,
        },
      ],
      source: 'manual',
      status: 'draft',
      totals: {
        discountInCents: 0,
        materialsInCents: 0,
        servicesInCents: 15000,
        subtotalInCents: 15000,
        totalInCents: 15000,
      },
    };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => quote });

    await expect(getQuoteDetails(quote.id)).resolves.toEqual(quote);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3333/v1/quotes/${quote.id}`,
      {
        headers: { authorization: 'Bearer dev:local-user' },
        method: 'GET',
      },
    );
  });

  it('rejects malformed detail data', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'not-a-detail' }),
    });

    await expect(getQuoteDetails('not-a-uuid')).rejects.toThrow(
      'A API retornou um orçamento inválido.',
    );
  });
});

describe('quote proposal PDF', () => {
  const quoteId = '9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d';

  it('downloads the authenticated PDF into the app documents directory', async () => {
    const arrayBuffer = new TextEncoder().encode('%PDF-1.4').buffer;
    fetchMock.mockResolvedValueOnce({
      arrayBuffer: async () => arrayBuffer,
      ok: true,
    });

    await expect(downloadQuoteProposal(quoteId)).resolves.toMatchObject({
      uri: 'file:///documents/cotali-proposal.pdf',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3333/v1/quotes/${quoteId}/proposal.pdf`,
      {
        headers: { authorization: 'Bearer dev:local-user' },
        method: 'GET',
      },
    );
  });

  it('downloads and opens the native share sheet', async () => {
    const arrayBuffer = new TextEncoder().encode('%PDF-1.4').buffer;
    fetchMock.mockResolvedValueOnce({
      arrayBuffer: async () => arrayBuffer,
      ok: true,
    });
    sharingMock.isAvailableAsync.mockResolvedValueOnce(true);
    sharingMock.shareAsync.mockResolvedValueOnce(undefined);

    await expect(shareQuoteProposal(quoteId)).resolves.toBeUndefined();
    expect(sharingMock.shareAsync).toHaveBeenCalledWith(
      'file:///documents/cotali-proposal.pdf',
      {
        dialogTitle: 'Compartilhar orçamento',
        mimeType: 'application/pdf',
      },
    );
  });

  it('surfaces API errors instead of saving an invalid response', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        error: { code: 'QUOTE_NOT_FOUND', message: 'Quote not found.' },
      }),
      ok: false,
    });

    await expect(downloadQuoteProposal(quoteId)).rejects.toThrow(
      'Quote not found.',
    );
  });

  it('requires a valid client WhatsApp before downloading the PDF', async () => {
    await expect(
      shareQuoteProposalToWhatsApp({
        clientName: 'Ana Maria',
        clientPhone: null,
        quoteId,
      }),
    ).rejects.toThrow(
      'Informe um WhatsApp válido para o cliente antes de enviar direto.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains that Expo Go needs a development build for WhatsApp sharing', async () => {
    platformMock.OS = 'android';
    turboModuleRegistryMock.get.mockReturnValueOnce(null);

    await expect(
      shareQuoteProposalToWhatsApp({
        clientName: 'Ana Maria',
        clientPhone: '11999999999',
        quoteId,
      }),
    ).rejects.toThrow(
      'O envio direto pelo WhatsApp exige um development build do Cotali.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('targets WhatsApp with a normalized phone and PDF on Android', async () => {
    platformMock.OS = 'android';
    const arrayBuffer = new TextEncoder().encode('%PDF-1.4').buffer;
    fetchMock.mockResolvedValueOnce({
      arrayBuffer: async () => arrayBuffer,
      ok: true,
    });
    nativeShareMock.shareSingle.mockResolvedValueOnce({
      message: 'ok',
      success: true,
    });

    await expect(
      shareQuoteProposalToWhatsApp({
        clientName: 'Ana Maria',
        clientPhone: '+55 (11) 99999-9999',
        quoteId,
      }),
    ).resolves.toBeUndefined();
    expect(nativeShareMock.shareSingle).toHaveBeenCalledWith({
      filename: `cotali-orcamento-${quoteId}.pdf`,
      message: 'Olá, Ana Maria! Segue sua proposta comercial do Cotali em PDF.',
      social: 'whatsapp',
      title: 'Proposta Cotali',
      type: 'application/pdf',
      url: 'file:///documents/cotali-proposal.pdf',
      whatsAppNumber: '5511999999999',
    });
  });

  it('keeps the PDF attachment in the native share sheet on iOS', async () => {
    platformMock.OS = 'ios';
    const arrayBuffer = new TextEncoder().encode('%PDF-1.4').buffer;
    fetchMock.mockResolvedValueOnce({
      arrayBuffer: async () => arrayBuffer,
      ok: true,
    });
    nativeShareMock.open.mockResolvedValueOnce({
      message: 'ok',
      success: true,
    });

    await expect(
      shareQuoteProposalToWhatsApp({
        clientName: 'Ana Maria',
        clientPhone: '11999999999',
        quoteId,
      }),
    ).resolves.toBeUndefined();
    expect(nativeShareMock.open).toHaveBeenCalledWith({
      message: 'Olá, Ana Maria! Segue sua proposta comercial do Cotali em PDF.',
      title: 'Proposta Cotali',
      type: 'application/pdf',
      url: 'file:///documents/cotali-proposal.pdf',
    });
    expect(nativeShareMock.shareSingle).not.toHaveBeenCalled();
  });
});
