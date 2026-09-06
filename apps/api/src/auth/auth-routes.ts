import type { Auth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  SecurityAuditEventName,
  SecurityAuditService,
} from '../security/security-audit-service.js';
import type { OtpRateLimitService } from '../security/otp-rate-limit-service.js';
import { validateOAuthRedirects } from './oauth-redirect-policy.js';

export async function registerBetterAuthRoutes(
  app: FastifyInstance,
  auth: Pick<Auth, 'api' | 'handler'>,
  securityAudit?: SecurityAuditService,
  otpRateLimitService?: OtpRateLimitService,
  oauthTrustedOrigins?: readonly string[],
): Promise<void> {
  app.route({
    method: ['GET', 'POST'],
    url: '/v1/auth/*',
    handler: async (request, reply) => {
      const auditName = classifyAuthRequest(request.url);
      const authSubject = securityAudit
        ? await readAuthSubject(auth, request)
        : undefined;

      try {
        const isSocialSignIn = new URL(
          request.url,
          'http://localhost',
        ).pathname.endsWith('/sign-in/social');
        const oauthValidation =
          isSocialSignIn && oauthTrustedOrigins
            ? validateOAuthRedirects(request.body, oauthTrustedOrigins)
            : { valid: true as const };
        if (!oauthValidation.valid) {
          await recordSecurityEvent(request, securityAudit, {
            name: auditName,
            outcome: 'failure',
            ...(authSubject ? { authSubject } : {}),
            statusCode: 403,
          });
          return await sendWebResponse(
            reply,
            createInvalidOAuthRedirectResponse(),
          );
        }

        const otpEmail = readOtpEmail(request);
        if (otpEmail && otpRateLimitService) {
          const decision = await otpRateLimitService.consume({
            email: otpEmail,
            ip: request.ip,
          });
          if (!decision.allowed) {
            await recordSecurityEvent(request, securityAudit, {
              name: 'rate_limited',
              outcome: 'failure',
              ...(authSubject ? { authSubject } : {}),
              statusCode: 429,
            });
            return await sendWebResponse(
              reply,
              createRateLimitResponse(decision.retryAfterSeconds),
            );
          }
        }

        const response = await auth.handler(toWebRequest(request));
        await recordSecurityEvent(request, securityAudit, {
          name: response.status === 429 ? 'rate_limited' : auditName,
          outcome: response.status < 400 ? 'success' : 'failure',
          ...(authSubject ? { authSubject } : {}),
          statusCode: response.status,
        });
        return await sendWebResponse(reply, response);
      } catch (error) {
        await recordSecurityEvent(request, securityAudit, {
          name: auditName,
          outcome: 'failure',
          ...(authSubject ? { authSubject } : {}),
          statusCode: 500,
        });
        throw error;
      }
    },
  });
}

export function classifyAuthRequest(
  pathWithQuery: string,
): SecurityAuditEventName {
  const path = new URL(pathWithQuery, 'http://localhost').pathname;
  if (path.endsWith('/email-otp/send-verification-otp')) return 'otp_request';
  if (path.endsWith('/sign-in/email-otp')) return 'otp_verify';
  if (path.endsWith('/sign-in/social')) return 'social_sign_in';
  if (path.includes('/callback/')) return 'oauth_callback';
  if (path.endsWith('/get-session')) return 'session_read';
  if (path.endsWith('/sign-out')) return 'session_sign_out';
  if (path.endsWith('/link-social') || path.endsWith('/unlink-account')) {
    return 'identity_link';
  }
  return 'auth_request';
}

async function readAuthSubject(
  auth: Pick<Auth, 'api'>,
  request: FastifyRequest,
): Promise<string | undefined> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    return session?.user.id;
  } catch {
    return undefined;
  }
}

async function recordSecurityEvent(
  request: FastifyRequest,
  securityAudit: SecurityAuditService | undefined,
  input: {
    name: SecurityAuditEventName;
    outcome: 'success' | 'failure';
    authSubject?: string;
    statusCode: number;
  },
): Promise<void> {
  if (!securityAudit) return;

  try {
    await securityAudit.record({
      ...input,
      method: request.method,
      path: new URL(request.url, 'http://localhost').pathname,
      ...(request.id === undefined ? {} : { requestId: String(request.id) }),
    });
  } catch (error) {
    // Audit persistence must not turn a valid auth response into an outage.
    // The operational error is retained without request credentials.
    request.log.error(
      { err: error },
      'Security audit event could not be persisted',
    );
  }
}

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(', '));
  }
  // Fastify resolves this value according to TRUSTED_PROXY_HOPS. Overwrite
  // any client-provided value before Better Auth reads the request.
  headers.set('x-cotali-client-ip', request.ip);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? serializeBody(request.body) : undefined;
  return new Request(
    `${request.protocol}://${request.headers.host ?? 'localhost'}${request.url}`,
    {
      method: request.method,
      headers,
      ...(body === undefined ? {} : { body }),
    },
  );
}

function readOtpEmail(request: FastifyRequest): string | undefined {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (!path.endsWith('/email-otp/send-verification-otp')) return undefined;

  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }

  const email = (body as { email?: unknown }).email;
  return typeof email === 'string' && email.trim()
    ? email.trim().normalize('NFKC').toLowerCase()
    : undefined;
}

function createRateLimitResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ message: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'x-retry-after': String(retryAfterSeconds),
      },
    },
  );
}

function createInvalidOAuthRedirectResponse(): Response {
  return new Response(
    JSON.stringify({
      code: 'INVALID_CALLBACK_URL',
      message: 'Invalid OAuth callback URL.',
    }),
    {
      status: 403,
      headers: { 'content-type': 'application/json' },
    },
  );
}

function serializeBody(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  return JSON.stringify(body);
}

async function sendWebResponse(
  reply: FastifyReply,
  response: Response,
): Promise<FastifyReply> {
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') reply.header(name, value);
  });

  const getSetCookie = (
    response.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const cookies = getSetCookie?.call(response.headers);
  if (cookies?.length) reply.header('set-cookie', cookies);

  const body =
    response.status === 204 ? null : Buffer.from(await response.arrayBuffer());
  return await reply.status(response.status).send(body);
}
