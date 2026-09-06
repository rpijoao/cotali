import type {
  VoiceQuoteEditInterpretation,
  VoiceInterpretation,
  VoiceInterpretationJob,
} from '@cotali/contracts';
import type { VoiceJobRepository } from '@cotali/database';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DevelopmentAuthenticator,
  StaticAuthenticator,
} from '../auth/authenticator.js';
import { buildApp } from '../app.js';
import { QuoteService } from '../quotes/quote-service.js';
import type {
  VoiceCommandInterpreter,
  VoiceCommandRequest,
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

  it('enqueues a durable job and exposes its status', async () => {
    const repository = new FakeVoiceJobRepository();
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
      voiceJobRepository: repository,
    });

    const mutationId = '73070f7c-a464-47d7-90bf-b06ac2ce7a1e';
    const accepted = await app.inject({
      method: 'POST',
      payload: multipartBody(mutationId),
      url: '/v1/voice/interpretations',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'multipart/form-data; boundary=cotali-test',
      },
    });

    expect(accepted.statusCode).toBe(202);
    expect(accepted.json()).toMatchObject({
      mutationId,
      status: 'pending',
      interpretation: null,
    });

    repository.job = {
      ...repository.job!,
      status: 'completed',
      interpretation: fakeInterpretation(mutationId),
    };
    const status = await app.inject({
      method: 'GET',
      url: `/v1/voice/interpretations/${mutationId}`,
      headers: { authorization: 'Bearer test-token' },
    });

    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      mutationId,
      status: 'completed',
      interpretation: { id: mutationId },
    });
  });
});

describe('POST /v1/voice/commands', () => {
  it('passes the current draft to the command interpreter', async () => {
    const interpreter = new FakeVoiceCommandInterpreter();
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
      voiceCommandInterpreter: interpreter,
    });

    const mutationId = '73070f7c-a464-47d7-90bf-b06ac2ce7a1e';
    const response = await app.inject({
      method: 'POST',
      payload: commandMultipartBody(mutationId),
      url: '/v1/voice/commands',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'multipart/form-data; boundary=cotali-test',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      command: {
        intent: 'update_line',
        section: 'services',
        index: 0,
        changes: {
          description: null,
          quantity: '3',
          unit: null,
          unitPriceInCents: null,
        },
      },
      id: mutationId,
      source: 'command',
      transcript: 'Altere o primeiro serviço para três unidades.',
    });
    expect(interpreter.lastRequest).toMatchObject({
      draft: {
        client: { name: 'Roberto', phone: '' },
        services: [{ description: 'Troca de tomada', quantity: '2' }],
      },
      filename: 'command.m4a',
      mimeType: 'audio/m4a',
      mutationId,
    });
  });

  it('rejects a command without draft context', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
      voiceCommandInterpreter: new FakeVoiceCommandInterpreter(),
    });

    const response = await app.inject({
      method: 'POST',
      payload: multipartBody('73070f7c-a464-47d7-90bf-b06ac2ce7a1e'),
      url: '/v1/voice/commands',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'multipart/form-data; boundary=cotali-test',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      error: { code: 'DRAFT_CONTEXT_REQUIRED' },
    });
  });
});

class FakeVoiceJobRepository implements VoiceJobRepository {
  job: VoiceInterpretationJob | null = null;

  async enqueue(input: {
    authSubject: string;
    audio: Buffer;
    filename: string;
    mimeType: string;
    mutationId: string;
  }): Promise<VoiceInterpretationJob> {
    void input.authSubject;
    void input.audio;
    this.job ??= {
      attempts: 0,
      createdAt: '2026-09-03T00:00:00.000Z',
      error: null,
      id: input.mutationId,
      interpretation: null,
      mutationId: input.mutationId,
      status: 'pending',
      updatedAt: '2026-09-03T00:00:00.000Z',
    };
    return this.job;
  }

  async find(): Promise<VoiceInterpretationJob | null> {
    return this.job;
  }
}

class FakeVoiceInterpreter implements VoiceInterpreter {
  lastRequest: VoiceInterpretationRequest | undefined;

  async interpret(
    request: VoiceInterpretationRequest,
  ): Promise<VoiceInterpretation> {
    this.lastRequest = request;
    return fakeInterpretation(request.mutationId);
  }
}

class FakeVoiceCommandInterpreter implements VoiceCommandInterpreter {
  lastRequest: VoiceCommandRequest | undefined;

  async interpretCommand(
    request: VoiceCommandRequest,
  ): Promise<VoiceQuoteEditInterpretation> {
    this.lastRequest = request;
    return {
      command: {
        ambiguities: [],
        changes: {
          clientName: null,
          description: null,
          quantity: '3',
          unit: null,
          unitPriceInCents: null,
        },
        index: 0,
        intent: 'update_line',
        section: 'services',
      },
      createdAt: '2026-09-03T00:00:00.000Z',
      id: request.mutationId,
      source: 'command',
      transcript: 'Altere o primeiro serviço para três unidades.',
    };
  }
}

function fakeInterpretation(mutationId: string): VoiceInterpretation {
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
    id: mutationId,
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

function commandMultipartBody(mutationId: string): Buffer {
  return Buffer.from(
    [
      '--cotali-test',
      'Content-Disposition: form-data; name="mutationId"',
      '',
      mutationId,
      '--cotali-test',
      'Content-Disposition: form-data; name="draft"',
      '',
      JSON.stringify({
        client: { name: 'Roberto', phone: '' },
        materials: [],
        services: [
          {
            description: 'Troca de tomada',
            quantity: '2',
            unit: 'un',
            unitPriceInCents: 5000,
          },
        ],
      }),
      '--cotali-test',
      'Content-Disposition: form-data; name="audio"; filename="command.m4a"',
      'Content-Type: audio/m4a',
      '',
      'fake command audio bytes',
      '--cotali-test--',
      '',
    ].join('\r\n'),
  );
}
