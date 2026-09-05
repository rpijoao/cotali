import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  DevelopmentAuthenticator,
  StaticAuthenticator,
} from './auth/authenticator.js';
import { buildApp } from './app.js';
import {
  MemoryProfileRepository,
  ProfileService,
} from './profile/profile-service.js';
import { QuoteService } from './quotes/quote-service.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

describe('GET /v1/health', () => {
  it('reports that the API is ready', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });
    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ name: 'cotali-api', status: 'ok' });
  }, 15_000);
});

describe('/v1/profile', () => {
  it('returns an empty profile before setup', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const response = await app.inject({ method: 'GET', url: '/v1/profile' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      address: null,
      businessName: null,
      document: null,
      name: '',
      phone: null,
      updatedAt: null,
    });
  });

  it('updates and reads the authenticated profile', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const update = await app.inject({
      method: 'PATCH',
      payload: {
        address: ' Rua das Flores, 10 ',
        businessName: ' Elétrica João ',
        document: '123.456.789-00',
        name: ' João Furtado ',
        phone: '+5511999999999',
      },
      url: '/v1/profile',
    });
    const read = await app.inject({ method: 'GET', url: '/v1/profile' });

    expect(update.statusCode).toBe(200);
    expect(update.json()).toMatchObject({
      address: 'Rua das Flores, 10',
      businessName: 'Elétrica João',
      document: '123.456.789-00',
      name: 'João Furtado',
      phone: '+5511999999999',
      updatedAt: expect.any(String),
    });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toEqual(update.json());
  });

  it('rejects an unauthenticated profile request', async () => {
    app = await buildApp({
      authenticator: new DevelopmentAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const response = await app.inject({ method: 'GET', url: '/v1/profile' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });
});

describe('POST /v1/quotes', () => {
  const input = {
    mutationId: '73070f7c-a464-47d7-90bf-b06ac2ce7a1e',
    client: { name: 'Maria Silva', phone: '+5511999999999' },
    conditions: {
      executionDeadline: 'Até cinco dias úteis',
      installmentCount: 3,
      notes: null,
      paymentMethod: 'Pix ou cartão',
      paymentPlanType: 'installments',
      validUntil: '2026-09-30',
    },
    discountInCents: 500,
    materials: [
      {
        description: 'Tomada',
        quantity: '4',
        unit: 'un',
        unitPriceInCents: 1500,
      },
    ],
    services: [
      {
        description: 'Troca de tomada',
        quantity: '2',
        unit: 'un',
        unitPriceInCents: 5000,
      },
    ],
    source: 'manual',
  } as const;

  it('creates an idempotent manual draft with server totals', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const first = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });
    const retry = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });

    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(201);
    expect(retry.json()).toEqual(first.json());
    expect(first.json()).toMatchObject({
      revisionNumber: 1,
      status: 'draft',
      totals: {
        discountInCents: 500,
        materialsInCents: 6000,
        servicesInCents: 10000,
        subtotalInCents: 16000,
        totalInCents: 15500,
      },
    });
  });

  it('lists recent quotes for the authenticated account', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const created = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });
    const response = await app.inject({
      method: 'GET',
      url: '/v1/quotes',
    });

    expect(created.statusCode).toBe(201);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        client: input.client,
        createdAt: expect.any(String),
        id: created.json().id,
        paymentStatus: 'pending',
        revisionNumber: 1,
        status: 'draft',
        totalInCents: 15500,
      },
    ]);
  });

  it('rejects an unauthenticated quote list request', async () => {
    app = await buildApp({
      authenticator: new DevelopmentAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/quotes',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });

  it('opens a saved quote by id without exposing the mutation key', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const created = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });
    const quote = await app.inject({
      method: 'GET',
      url: `/v1/quotes/${created.json().id}`,
    });

    expect(quote.statusCode).toBe(200);
    expect(quote.json()).toEqual({
      client: input.client,
      conditions: { ...input.conditions, notes: '' },
      createdAt: expect.any(String),
      discountInCents: input.discountInCents,
      id: created.json().id,
      materials: input.materials,
      paymentStatus: 'pending',
      revisionNumber: 1,
      services: input.services,
      source: input.source,
      status: 'draft',
      totals: {
        discountInCents: 500,
        materialsInCents: 6000,
        servicesInCents: 10000,
        subtotalInCents: 16000,
        totalInCents: 15500,
      },
    });
  });

  it('saves an edit as a new current revision and is idempotent', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const created = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });
    const editInput = {
      ...input,
      client: { name: 'Maria Silva Atualizada', phone: null },
      mutationId: '9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d',
      services: [
        {
          description: 'Instalação de duas tomadas',
          quantity: '3',
          unit: 'un',
          unitPriceInCents: 6000,
        },
      ],
    };
    const update = await app.inject({
      method: 'POST',
      payload: editInput,
      url: `/v1/quotes/${created.json().id}/revisions`,
    });
    const retry = await app.inject({
      method: 'POST',
      payload: editInput,
      url: `/v1/quotes/${created.json().id}/revisions`,
    });
    const detail = await app.inject({
      method: 'GET',
      url: `/v1/quotes/${created.json().id}`,
    });

    expect(update.statusCode).toBe(200);
    expect(retry.statusCode).toBe(200);
    expect(retry.json()).toEqual(update.json());
    expect(update.json()).toMatchObject({
      client: editInput.client,
      revisionNumber: 2,
      services: editInput.services,
      totals: {
        servicesInCents: 18000,
        totalInCents: 23500,
      },
    });
    expect(detail.json()).toMatchObject({
      client: editInput.client,
      revisionNumber: 2,
      services: editInput.services,
    });
  });

  it('generates a PDF from the current validated quote revision', async () => {
    const profileService = new ProfileService(new MemoryProfileRepository());
    await profileService.update('test-user', {
      address: 'Rua das Flores, 10',
      businessName: 'Elétrica João',
      document: '123.456.789-00',
      name: 'João Furtado',
      phone: '+5511999999999',
    });
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      profileService,
      quoteService: new QuoteService(),
    });

    const created = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });
    const response = await app.inject({
      method: 'GET',
      url: `/v1/quotes/${created.json().id}/proposal.pdf`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe(
      `attachment; filename="cotali-orcamento-${created.json().id}.pdf"`,
    );
    expect(response.body).toContain('%PDF-1.4');
    expect(response.body).toContain('El');
    expect(response.body).toContain('Jo');
    expect(response.body).toContain('Cliente: Maria Silva');
    expect(response.body).toContain('Total: R$ 155,00');
    expect(response.body).toContain('%%EOF');
  });

  it('returns not found when generating a PDF for an unknown quote', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/quotes/9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d/proposal.pdf',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: { code: 'QUOTE_NOT_FOUND' },
    });
  });

  it('rejects an unauthenticated PDF request', async () => {
    app = await buildApp({
      authenticator: new DevelopmentAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/quotes/9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d/proposal.pdf',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });

  it('returns not found for a quote outside the account', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/quotes/9c6d3b5e-8f2a-4b18-9c3d-7a6e5f4b2c1d',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: { code: 'QUOTE_NOT_FOUND' },
    });
  });

  it('rejects incoherent payment conditions', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });
    const response = await app.inject({
      method: 'POST',
      payload: {
        ...input,
        conditions: { ...input.conditions, installmentCount: null },
      },
      url: '/v1/quotes',
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      error: { code: 'INVALID_PAYMENT_PLAN' },
    });
  });

  it('rejects an unauthenticated request', async () => {
    app = await buildApp({
      authenticator: new DevelopmentAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });
    const response = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });
});

describe('HTTP security baseline', () => {
  it('sets security headers and can disable API documentation', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
    });

    const health = await app.inject({ method: 'GET', url: '/v1/health' });
    const docs = await app.inject({ method: 'GET', url: '/docs' });

    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(docs.statusCode).toBe(404);
  });

  it('limits excessive requests', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
      rateLimitMax: 1,
    });

    const first = await app.inject({ method: 'GET', url: '/v1/health' });
    const limited = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(first.statusCode).toBe(200);
    expect(limited.statusCode).toBe(429);
  });
});
