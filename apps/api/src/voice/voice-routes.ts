import { ApiErrorSchema, VoiceInterpretationSchema } from '@cotali/contracts';
import type { FastifyInstance } from 'fastify';
import {
  AuthenticationError,
  type Authenticator,
} from '../auth/authenticator.js';
import {
  VoiceInterpreterError,
  type VoiceInterpreter,
} from './groq-voice-interpreter.js';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function registerVoiceRoutes(
  app: FastifyInstance,
  authenticator: Authenticator,
  voiceInterpreter?: VoiceInterpreter,
) {
  app.post('/v1/voice/interpretations', {
    bodyLimit: MAX_AUDIO_BYTES,
    schema: {
      response: {
        201: VoiceInterpretationSchema,
        401: ApiErrorSchema,
        413: ApiErrorSchema,
        422: ApiErrorSchema,
        503: ApiErrorSchema,
      },
      tags: ['voice'],
    },
    handler: async (request, reply) => {
      try {
        const identity = await authenticator.authenticate(
          request.headers.authorization,
        );
        void identity;

        if (!voiceInterpreter) {
          return await reply.status(503).send({
            error: {
              code: 'VOICE_NOT_CONFIGURED',
              message: 'O processamento por voz ainda não foi configurado.',
            },
          });
        }

        let mutationId: string | null = null;
        let audio: Buffer | null = null;
        let filename = 'cotali-recording.m4a';
        let mimeType = 'audio/m4a';

        try {
          for await (const part of request.parts()) {
            if (part.type === 'file') {
              if (audio) {
                return await reply.status(422).send({
                  error: {
                    code: 'TOO_MANY_AUDIO_FILES',
                    message: 'Envie apenas um arquivo de áudio.',
                  },
                });
              }
              filename = part.filename || filename;
              mimeType = part.mimetype || mimeType;
              audio = await part.toBuffer();
            } else if (part.fieldname === 'mutationId') {
              mutationId = String(part.value);
            }
          }
        } catch (error) {
          if (isFileTooLargeError(error)) {
            return await reply.status(413).send({
              error: {
                code: 'AUDIO_TOO_LARGE',
                message: 'O áudio deve ter no máximo 25 MB.',
              },
            });
          }
          throw error;
        }

        if (!mutationId || !UUID_PATTERN.test(mutationId)) {
          return await reply.status(422).send({
            error: {
              code: 'INVALID_MUTATION_ID',
              message: 'mutationId deve ser um UUID válido.',
            },
          });
        }
        if (!audio || audio.byteLength === 0) {
          return await reply.status(422).send({
            error: {
              code: 'AUDIO_REQUIRED',
              message: 'Envie uma gravação de áudio.',
            },
          });
        }
        if (
          !mimeType.startsWith('audio/') &&
          mimeType !== 'application/octet-stream'
        ) {
          return await reply.status(422).send({
            error: {
              code: 'UNSUPPORTED_AUDIO_TYPE',
              message: 'Envie um arquivo de áudio compatível.',
            },
          });
        }

        const interpretation = await voiceInterpreter.interpret({
          audio,
          filename,
          mimeType,
          mutationId,
        });
        return await reply.status(201).send(interpretation);
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return await reply.status(401).send({
            error: { code: 'AUTHENTICATION_REQUIRED', message: error.message },
          });
        }
        if (error instanceof VoiceInterpreterError) {
          return await reply.status(422).send({
            error: { code: 'VOICE_PROCESSING_FAILED', message: error.message },
          });
        }
        throw error;
      }
    },
  });
}

function isFileTooLargeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'FST_REQ_FILE_TOO_LARGE'
  );
}

export { MAX_AUDIO_BYTES };
