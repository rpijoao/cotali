import {
  ApiErrorSchema,
  CreateQuoteDraftSchema,
  QuoteDetailsSchema,
  QuoteSummaryListSchema,
  QuoteDraftSchema,
  UpdateQuoteRevisionSchema,
  type CreateQuoteDraft,
  type UpdateQuoteRevision,
} from '@cotali/contracts';
import { Type } from '@sinclair/typebox';
import { QuoteDomainError } from '@cotali/domain';
import type { FastifyInstance } from 'fastify';
import {
  AuthenticationError,
  type Authenticator,
} from '../auth/authenticator.js';
import type { ProfileService } from '../profile/profile-service.js';
import {
  CreateQuoteError,
  QuoteUpdateError,
  type QuoteService,
} from './quote-service.js';
import { renderQuotePdf } from './quote-pdf.js';
import type { EngagementService } from '../engagement/engagement-service.js';

export async function registerQuoteRoutes(
  app: FastifyInstance,
  authenticator: Authenticator,
  quoteService: QuoteService,
  profileService?: ProfileService,
  engagement?: EngagementService,
) {
  app.get(
    '/v1/quotes',
    {
      schema: {
        response: {
          200: QuoteSummaryListSchema,
          401: ApiErrorSchema,
        },
        tags: ['quotes'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        return await quoteService.listRecent(identity.subject);
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return await reply.status(401).send({
            error: { code: 'AUTHENTICATION_REQUIRED', message: error.message },
          });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    '/v1/quotes/:id/proposal.pdf',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        response: {
          200: { type: 'string', format: 'binary' },
          401: ApiErrorSchema,
          404: ApiErrorSchema,
        },
        tags: ['quotes'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        const quote = await quoteService.getById(
          identity.subject,
          request.params.id,
        );
        if (!quote) {
          return await reply.status(404).send({
            error: { code: 'QUOTE_NOT_FOUND', message: 'Quote not found.' },
          });
        }
        const profile = profileService
          ? await profileService.get(identity.subject)
          : undefined;
        const filename = `cotali-orcamento-${quote.id}.pdf`;
        return await reply
          .type('application/pdf')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(renderQuotePdf(quote, profile));
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return await reply.status(401).send({
            error: { code: 'AUTHENTICATION_REQUIRED', message: error.message },
          });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    '/v1/quotes/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        response: {
          200: QuoteDetailsSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
        },
        tags: ['quotes'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        const quote = await quoteService.getById(
          identity.subject,
          request.params.id,
        );
        if (!quote) {
          return await reply.status(404).send({
            error: { code: 'QUOTE_NOT_FOUND', message: 'Quote not found.' },
          });
        }
        return quote;
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return await reply.status(401).send({
            error: { code: 'AUTHENTICATION_REQUIRED', message: error.message },
          });
        }
        throw error;
      }
    },
  );

  app.post<{ Body: CreateQuoteDraft }>(
    '/v1/quotes',
    {
      schema: {
        body: CreateQuoteDraftSchema,
        response: {
          201: QuoteDraftSchema,
          401: ApiErrorSchema,
          409: ApiErrorSchema,
          422: ApiErrorSchema,
        },
        tags: ['quotes'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        const quote = await quoteService.createDraft(
          identity.subject,
          request.body,
        );
        await recordValueEvent(engagement, {
          authSubject: identity.subject,
          eventKey: `create:${request.body.mutationId}`,
          name: 'quote_created',
          metadata: { source: request.body.source },
        });
        return await reply.status(201).send(quote);
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return await reply.status(401).send({
            error: { code: 'AUTHENTICATION_REQUIRED', message: error.message },
          });
        }
        if (error instanceof CreateQuoteError) {
          const status = error.code === 'IDEMPOTENCY_KEY_REUSED' ? 409 : 422;
          return await reply.status(status).send({
            error: { code: error.code, message: error.message },
          });
        }

        if (error instanceof QuoteDomainError) {
          return await reply.status(422).send({
            error: { code: error.code, message: error.message },
          });
        }

        throw error;
      }
    },
  );

  app.post<{
    Body: UpdateQuoteRevision;
    Params: { id: string };
  }>(
    '/v1/quotes/:id/revisions',
    {
      schema: {
        body: UpdateQuoteRevisionSchema,
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        response: {
          200: QuoteDetailsSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
          409: ApiErrorSchema,
          422: ApiErrorSchema,
        },
        tags: ['quotes'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        const quote = await quoteService.updateDraft(
          identity.subject,
          request.params.id,
          request.body,
        );
        await recordValueEvent(engagement, {
          authSubject: identity.subject,
          eventKey: `update:${request.body.mutationId}`,
          name: 'quote_updated',
          metadata: { quoteId: request.params.id },
        });
        return quote;
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return await reply.status(401).send({
            error: { code: 'AUTHENTICATION_REQUIRED', message: error.message },
          });
        }
        if (error instanceof CreateQuoteError) {
          const status = error.code === 'IDEMPOTENCY_KEY_REUSED' ? 409 : 422;
          return await reply.status(status).send({
            error: { code: error.code, message: error.message },
          });
        }
        if (error instanceof QuoteUpdateError) {
          const status =
            error.code === 'IDEMPOTENCY_KEY_REUSED'
              ? 409
              : error.code === 'QUOTE_NOT_FOUND'
                ? 404
                : 422;
          return await reply.status(status).send({
            error: { code: error.code, message: error.message },
          });
        }
        if (error instanceof QuoteDomainError) {
          return await reply.status(422).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    },
  );
}

async function recordValueEvent(
  engagement: EngagementService | undefined,
  input: Parameters<EngagementService['recordValueEvent']>[0],
): Promise<void> {
  if (!engagement) return;
  try {
    await engagement.recordValueEvent(input);
  } catch {
    // Engagement telemetry must never turn a successful domain operation into
    // a failed quote request.
  }
}
