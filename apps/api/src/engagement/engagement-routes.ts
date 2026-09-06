import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { ApiErrorSchema } from '@cotali/contracts';
import {
  AuthenticationError,
  type Authenticator,
} from '../auth/authenticator.js';
import type { EngagementService } from './engagement-service.js';

const ConsentInputSchema = Type.Object({
  channel: Type.Union([Type.Literal('mobile'), Type.Literal('web')]),
  granted: Type.Boolean(),
});
const ConsentOutputSchema = Type.Object({
  policyVersion: Type.String(),
  recorded: Type.Boolean(),
});

export async function registerEngagementRoutes(
  app: FastifyInstance,
  authenticator: Authenticator,
  engagement: EngagementService,
): Promise<void> {
  const policyVersion = resolvePrivacyPolicyVersion();

  app.post<{ Body: { channel: 'mobile' | 'web'; granted: boolean } }>(
    '/v1/privacy/consents/marketing-email',
    {
      schema: {
        body: ConsentInputSchema,
        response: {
          200: ConsentOutputSchema,
          401: ApiErrorSchema,
        },
        tags: ['privacy'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        await engagement.recordMarketingConsent({
          authSubject: identity.subject,
          channel: request.body.channel,
          granted: request.body.granted,
          policyVersion,
        });
        return { policyVersion, recorded: true };
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
}

export function resolvePrivacyPolicyVersion(): string {
  const policyVersion = process.env.PRIVACY_POLICY_VERSION?.trim();
  if (!policyVersion) {
    throw new Error('PRIVACY_POLICY_VERSION is required.');
  }
  return policyVersion;
}
