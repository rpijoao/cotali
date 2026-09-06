import {
  ApiErrorSchema,
  ProfessionalProfileSchema,
  UpdateProfessionalProfileSchema,
  type UpdateProfessionalProfile,
} from '@cotali/contracts';
import type { FastifyInstance } from 'fastify';
import {
  AuthenticationError,
  type Authenticator,
} from '../auth/authenticator.js';
import type { ProfileService } from './profile-service.js';

export async function registerProfileRoutes(
  app: FastifyInstance,
  authenticator: Authenticator,
  profileService: ProfileService,
) {
  app.get(
    '/v1/profile',
    {
      schema: {
        response: { 200: ProfessionalProfileSchema, 401: ApiErrorSchema },
        tags: ['profile'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        return await profileService.get(identity.subject);
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

  app.patch<{ Body: UpdateProfessionalProfile }>(
    '/v1/profile',
    {
      schema: {
        body: UpdateProfessionalProfileSchema,
        response: { 200: ProfessionalProfileSchema, 401: ApiErrorSchema },
        tags: ['profile'],
      },
    },
    async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(request.headers);
        return await profileService.update(identity.subject, request.body);
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
