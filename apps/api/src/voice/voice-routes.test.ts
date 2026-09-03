import type { VoiceInterpretation } from '@cotali/contracts';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DevelopmentAuthenticator,
  StaticAuthenticator,
} from '../auth/authenticator.js';
import { buildApp } from '../app.js';
import { QuoteService } from '../quotes/quote-service.js';
import type {
  VoiceInterpreter,
  VoiceInterpretationRequest,
} from './groq-voice-interpreter.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

describe('POST /v1/voice/interpretations', () => {
  it('authenticates multipart audio and returns a structured proposal', async () => {
    const interpreter = new FakeVoiceInterpreter();
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
      voiceInterpreter: interpreter,
    });

    const mutationId = '73070f7c-a464-47d7-90bf-b06ac2ce7a1e';
    const response = await app.inject({
      method: 'POST',
      payload: multipartBody(mutationId),
      url: '/v1/voice/interpretations',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'multipart/form-data; boundary=cotali-test',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      client: { name: 'Maria Silva' },
      id: mutationId,
      services: [{ description: 'Troca de tomada' }],
      source: 'interpretation',
      transcript: 'Trocar quatro tomadas para Maria Silva.',
    });
    expect(interpreter.lastRequest).toMatchObject({
      filename: 'recording.m4a',
      mimeType: 'audio/m4a',
      mutationId,
    });
  });

  it('rejects unauthenticated requests before reading audio', async () => {
    app = await buildApp({
      authenticator: new DevelopmentAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
      voiceInterpreter: new FakeVoiceInterpreter(),
    });

    const response = await app.inject({
      method: 'POST',
      payload: multipartBody('73070f7c-a464-47d7-90bf-b06ac2ce7a1e'),
      url: '/v1/voice/interpretations',
      headers: { 'content-type': 'multipart/form-data; boundary=cotali-test' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('reports when the Groq adapter is not configured', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/voice/interpretations',
      headers: { authorization: 'Bearer test-token' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: { code: 'VOICE_NOT_CONFIGURED' },
    });
  });
});

class FakeVoiceInterpreter implements VoiceInterpreter {
  lastRequest: VoiceInterpretationRequest | undefined;

  async interpret(
    request: VoiceInterpretationRequest,
  ): Promise<VoiceInterpretation> {
    this.lastRequest = request;
    return {
      ambiguities: [],
      client: { name: 'Maria Silva', phone: '+5511999999999' },
      conditions: {
        executionDeadline: 'cinco dias úteis',
        installmentCount: null,
        notes: null,
        paymentMethod: 'Pix',
        paymentPlanType: 'integral',
        validUntil: null,
      },
      createdAt: '2026-09-03T00:00:00.000Z',
      discountInCents: null,
      id: request.mutationId,
      materials: [],
      services: [
        {
          description: 'Troca de tomada',
          quantity: '4',
          unit: 'un',
          unitPriceInCents: 5000,
        },
      ],
      source: 'interpretation',
      transcript: 'Trocar quatro tomadas para Maria Silva.',
      transcriptSegments: [],
    };
  }
}

function multipartBody(mutationId: string): Buffer {
  return Buffer.from(
    [
      '--cotali-test',
      'Content-Disposition: form-data; name="mutationId"',
      '',
      mutationId,
      '--cotali-test',
      'Content-Disposition: form-data; name="audio"; filename="recording.m4a"',
      'Content-Type: audio/m4a',
      '',
      'fake audio bytes',
      '--cotali-test--',
      '',
    ].join('\r\n'),
  );
}
