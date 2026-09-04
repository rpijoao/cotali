import {
  ApiErrorSchema,
  CreateQuoteDraftSchema,
  QuoteSummaryListSchema,
  QuoteDraftSchema,
  type CreateQuoteDraft,
} from '@cotali/contracts';
import { QuoteDomainError } from '@cotali/domain';
import type { FastifyInstance } from 'fastify';
import {
  AuthenticationError,
  type Authenticator,
} from '../auth/authenticator.js';
import { CreateQuoteError, type QuoteService } from './quote-service.js';

export async function registerQuoteRoutes(
  app: FastifyInstance,
  authenticator: Authenticator,
  quoteService: QuoteService,
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
        const identity = await authenticator.authenticate(
          request.headers.authorization,
        );
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
        const identity = await authenticator.authenticate(
          request.headers.authorization,
        );
        const quote = await quoteService.createDraft(
          identity.subject,
          request.body,
        );
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
}
