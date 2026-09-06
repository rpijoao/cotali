import { createRemoteJWKSet, jwtVerify } from 'jose';
import { fromNodeHeaders } from 'better-auth/node';
import type { Auth } from 'better-auth';

export type AuthenticationInput =
  string | Readonly<Record<string, string | string[] | undefined>> | undefined;

export type Identity = Readonly<{ subject: string }>;

export interface Authenticator {
  authenticate(input: AuthenticationInput): Promise<Identity>;
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication is required.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class OidcAuthenticator implements Authenticator {
  readonly #jwks;

  constructor(
    private readonly config: Readonly<{
      audience: string;
      issuer: string;
      jwksUrl: string;
    }>,
  ) {
    this.#jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  }

  async authenticate(input: AuthenticationInput): Promise<Identity> {
    const token = readBearerToken(readAuthorization(input));
    try {
      const { payload } = await jwtVerify(token, this.#jwks, {
        audience: this.config.audience,
        issuer: this.config.issuer,
      });
      if (!payload.sub) throw new AuthenticationError('Token has no subject.');
      return { subject: payload.sub };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError('The access token is invalid.');
    }
  }
}

export class DevelopmentAuthenticator implements Authenticator {
  async authenticate(input: AuthenticationInput): Promise<Identity> {
    const token = readBearerToken(readAuthorization(input));
    if (!token.startsWith('dev:') || token.length <= 4) {
      throw new AuthenticationError('Use a development bearer token.');
    }
    return { subject: token.slice(4) };
  }
}

export class StaticAuthenticator implements Authenticator {
  constructor(private readonly subject = 'test-user') {}

  async authenticate(): Promise<Identity> {
    return { subject: this.subject };
  }
}

export class BetterAuthAuthenticator implements Authenticator {
  constructor(private readonly auth: Pick<Auth, 'api'>) {}

  async authenticate(input: AuthenticationInput): Promise<Identity> {
    if (typeof input === 'string' || input === undefined) {
      throw new AuthenticationError();
    }

    try {
      const session = await this.auth.api.getSession({
        headers: fromNodeHeaders(input),
      });
      if (!session?.user.id) throw new AuthenticationError();
      return { subject: session.user.id };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError('The session is invalid or expired.');
    }
  }
}

function readAuthorization(input: AuthenticationInput): string | undefined {
  if (typeof input === 'string' || input === undefined) return input;
  const authorization = input.authorization;
  return Array.isArray(authorization) ? authorization[0] : authorization;
}

function readBearerToken(authorization: string | undefined): string {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  if (!match?.[1]) throw new AuthenticationError();
  return match[1];
}
