import { createRemoteJWKSet, jwtVerify } from 'jose';

export type Identity = Readonly<{ subject: string }>;

export interface Authenticator {
  authenticate(authorization: string | undefined): Promise<Identity>;
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

  async authenticate(authorization: string | undefined): Promise<Identity> {
    const token = readBearerToken(authorization);
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
  async authenticate(authorization: string | undefined): Promise<Identity> {
    const token = readBearerToken(authorization);
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

function readBearerToken(authorization: string | undefined): string {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  if (!match?.[1]) throw new AuthenticationError();
  return match[1];
}
