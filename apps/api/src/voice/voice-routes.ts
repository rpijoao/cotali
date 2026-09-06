import {
  ApiErrorSchema,
  VoiceQuoteEditContextSchema,
  VoiceQuoteEditInterpretationSchema,
  VoiceInterpretationJobSchema,
  VoiceInterpretationSchema,
} from '@cotali/contracts';
import type { VoiceQuoteEditContext } from '@cotali/contracts';
import type {
  EnqueueVoiceJobInput,
  VoiceJobRepository,
} from '@cotali/database';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Value } from '@sinclair/typebox/value';
import {
  AuthenticationError,
  type Authenticator,
} from '../auth/authenticator.js';
import {
  VoiceInterpreterError,
  type VoiceCommandInterpreter,
  type VoiceCommandRequest,
  type VoiceInterpreter,
} from './groq-voice-interpreter.js';

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function registerVoiceRoutes(
  app: FastifyInstance,
  authenticator: Authenticator,
  voiceInterpreter?: VoiceInterpreter,
  voiceJobs?: VoiceJobRepository,
  voiceCommandInterpreter?: VoiceCommandInterpreter,
) {
  app.post('/v1/voice/interpretations', {
    bodyLimit: MAX_AUDIO_BYTES,
    schema: {
      response: {
        201: VoiceInterpretationSchema,
        202: VoiceInterpretationJobSchema,
        401: ApiErrorSchema,
        409: ApiErrorSchema,
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

        if (!voiceJobs && !voiceInterpreter) {
          return await reply.status(503).send({
            error: {
              code: 'VOICE_NOT_CONFIGURED',
              message: 'O processamento por voz ainda não foi configurado.',
            },
          });
        }

        const payload = await readAudioPayload(request);
        if ('error' in payload) {
          return await reply
            .status(payload.status)
            .send({ error: payload.error });
        }

        if (voiceJobs) {
          const job = await voiceJobs.enqueue({
            ...payload,
            authSubject: identity.subject,
          });
          return await reply.status(202).send(job);
        }

        const interpretation = await voiceInterpreter!.interpret({
          audio: payload.audio,
          filename: payload.filename,
          mimeType: payload.mimeType,
          mutationId: payload.mutationId,
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
        if (isVoiceJobConflictError(error)) {
          return await reply.status(409).send({
            error: {
              code: 'MUTATION_ID_REUSED',
              message: 'O mutationId já foi usado com outro áudio.',
            },
          });
        }
        throw error;
      }
    },
  });

  app.post('/v1/voice/commands', {
    bodyLimit: MAX_AUDIO_BYTES,
    schema: {
      response: {
        201: VoiceQuoteEditInterpretationSchema,
        401: ApiErrorSchema,
        413: ApiErrorSchema,
        422: ApiErrorSchema,
        503: ApiErrorSchema,
      },
      tags: ['voice'],
    },
    handler: async (request, reply) => {
      try {
        await authenticator.authenticate(request.headers.authorization);

        if (!voiceCommandInterpreter) {
          return await reply.status(503).send({
            error: {
              code: 'VOICE_COMMANDS_NOT_CONFIGURED',
              message:
                'Os comandos de edição por voz ainda não foram configurados.',
            },
          });
        }

        const payload = await readVoiceCommandPayload(request);
        if ('error' in payload) {
          return await reply
            .status(payload.status)
            .send({ error: payload.error });
        }

        const command = await voiceCommandInterpreter.interpretCommand(payload);
        return await reply.status(201).send(command);
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return await reply.status(401).send({
            error: { code: 'AUTHENTICATION_REQUIRED', message: error.message },
          });
        }
        if (error instanceof VoiceInterpreterError) {
          return await reply.status(422).send({
            error: { code: 'VOICE_COMMAND_FAILED', message: error.message },
          });
        }
        throw error;
      }
    },
  });

  app.get<{ Params: { mutationId: string } }>(
    '/v1/voice/interpretations/:mutationId',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['mutationId'],
          properties: { mutationId: { type: 'string' } },
        },
        response: {
          200: VoiceInterpretationJobSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
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
          if (!voiceJobs) {
            return await reply.status(503).send({
              error: {
                code: 'VOICE_NOT_DURABLE',
                message: 'O status durável de voz ainda não foi configurado.',
              },
            });
          }
          if (!UUID_PATTERN.test(request.params.mutationId)) {
            return await reply.status(422).send({
              error: {
                code: 'INVALID_MUTATION_ID',
                message: 'mutationId deve ser um UUID válido.',
              },
            });
          }
          const job = await voiceJobs.find(
            identity.subject,
            request.params.mutationId,
          );
          if (!job) {
            return await reply.status(404).send({
              error: {
                code: 'VOICE_JOB_NOT_FOUND',
                message: 'Processamento de voz não encontrado.',
              },
            });
          }
          return await reply.status(200).send(job);
        } catch (error) {
          if (error instanceof AuthenticationError) {
            return await reply.status(401).send({
              error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: error.message,
              },
            });
          }
          throw error;
        }
      },
    },
  );
}

type AudioPayload = Omit<EnqueueVoiceJobInput, 'authSubject'>;

type VoiceCommandPayload = AudioPayload & { draft: VoiceQuoteEditContext };

type AudioReadError = {
  error: { code: string; message: string };
  status: 413 | 422;
};

async function readAudioPayload(
  request: FastifyRequest,
): Promise<AudioPayload | AudioReadError> {
  let mutationId: string | null = null;
  let audio: Buffer | null = null;
  let filename = 'cotali-recording.m4a';
  let mimeType = 'audio/m4a';

  try {
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (audio) {
          return {
            error: {
              code: 'TOO_MANY_AUDIO_FILES',
              message: 'Envie apenas um arquivo de áudio.',
            },
            status: 422,
          };
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
      return {
        error: {
          code: 'AUDIO_TOO_LARGE',
          message: 'O áudio deve ter no máximo 25 MB.',
        },
        status: 413,
      };
    }
    throw error;
  }

  if (!mutationId || !UUID_PATTERN.test(mutationId)) {
    return {
      error: {
        code: 'INVALID_MUTATION_ID',
        message: 'mutationId deve ser um UUID válido.',
      },
      status: 422,
    };
  }
  if (!audio || audio.byteLength === 0) {
    return {
      error: {
        code: 'AUDIO_REQUIRED',
        message: 'Envie uma gravação de áudio.',
      },
      status: 422,
    };
  }
  if (
    !mimeType.startsWith('audio/') &&
    mimeType !== 'application/octet-stream'
  ) {
    return {
      error: {
        code: 'UNSUPPORTED_AUDIO_TYPE',
        message: 'Envie um arquivo de áudio compatível.',
      },
      status: 422,
    };
  }

  return { audio, filename, mimeType, mutationId };
}

async function readVoiceCommandPayload(
  request: FastifyRequest,
): Promise<VoiceCommandPayload | AudioReadError> {
  let mutationId: string | null = null;
  let audio: Buffer | null = null;
  let draft: VoiceQuoteEditContext | null = null;
  let filename = 'cotali-command.m4a';
  let mimeType = 'audio/m4a';

  try {
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (audio) {
          return {
            error: {
              code: 'TOO_MANY_AUDIO_FILES',
              message: 'Envie apenas um arquivo de áudio.',
            },
            status: 422,
          };
        }
        filename = part.filename || filename;
        mimeType = part.mimetype || mimeType;
        audio = await part.toBuffer();
      } else if (part.fieldname === 'mutationId') {
        mutationId = String(part.value);
      } else if (part.fieldname === 'draft') {
        const raw = String(part.value);
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!Value.Check(VoiceQuoteEditContextSchema, parsed)) {
            return {
              error: {
                code: 'INVALID_DRAFT_CONTEXT',
                message: 'O contexto atual do orçamento é inválido.',
              },
              status: 422,
            };
          }
          draft = parsed;
        } catch {
          return {
            error: {
              code: 'INVALID_DRAFT_CONTEXT',
              message: 'O contexto atual do orçamento é inválido.',
            },
            status: 422,
          };
        }
      }
    }
  } catch (error) {
    if (isFileTooLargeError(error)) {
      return {
        error: {
          code: 'AUDIO_TOO_LARGE',
          message: 'O áudio deve ter no máximo 25 MB.',
        },
        status: 413,
      };
    }
    throw error;
  }

  if (!mutationId || !UUID_PATTERN.test(mutationId)) {
    return {
      error: {
        code: 'INVALID_MUTATION_ID',
        message: 'mutationId deve ser um UUID válido.',
      },
      status: 422,
    };
  }
  if (!draft) {
    return {
      error: {
        code: 'DRAFT_CONTEXT_REQUIRED',
        message: 'Envie o contexto atual do orçamento.',
      },
      status: 422,
    };
  }
  if (!audio || audio.byteLength === 0) {
    return {
      error: {
        code: 'AUDIO_REQUIRED',
        message: 'Envie uma gravação de áudio.',
      },
      status: 422,
    };
  }
  if (
    !mimeType.startsWith('audio/') &&
    mimeType !== 'application/octet-stream'
  ) {
    return {
      error: {
        code: 'UNSUPPORTED_AUDIO_TYPE',
        message: 'Envie um arquivo de áudio compatível.',
      },
      status: 422,
    };
  }

  const result: VoiceCommandRequest = {
    audio,
    draft,
    filename,
    mimeType,
    mutationId,
  };
  return result;
}

function isFileTooLargeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'FST_REQ_FILE_TOO_LARGE'
  );
}

function isVoiceJobConflictError(error: unknown): boolean {
  return error instanceof Error && error.name === 'VoiceJobConflictError';
}
