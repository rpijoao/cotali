import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

let interpretQuoteVoice: (input: {
  mutationId: string;
  uri: string;
}) => Promise<unknown>;

beforeAll(async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3333';
  process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN = 'dev:local-user';
  ({ interpretQuoteVoice } = await import('./quote-api'));
});

afterEach(() => fetchMock.mockReset());

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
