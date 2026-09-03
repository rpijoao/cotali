import {
  DevelopmentAuthenticator,
  OidcAuthenticator,
  type Authenticator,
} from './authenticator.js';

export function createAuthenticatorFromEnvironment(): Authenticator {
  if (
    process.env.AUTH_MODE === 'development' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return new DevelopmentAuthenticator();
  }

  const audience = requiredEnvironment('OIDC_AUDIENCE');
  const issuer = requiredEnvironment('OIDC_ISSUER');
  const jwksUrl = requiredEnvironment('OIDC_JWKS_URL');
  return new OidcAuthenticator({ audience, issuer, jwksUrl });
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
