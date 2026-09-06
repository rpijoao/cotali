import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevelopmentAuthenticator } from './authenticator.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('DevelopmentAuthenticator', () => {
  it('cannot be constructed in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => new DevelopmentAuthenticator()).toThrow(
      'Development authentication is disabled in production.',
    );
  });

  it('rejects a development token if production is enabled after construction', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const authenticator = new DevelopmentAuthenticator();
    vi.stubEnv('NODE_ENV', 'production');

    await expect(
      authenticator.authenticate({ authorization: 'Bearer dev:test-user' }),
    ).rejects.toMatchObject({
      message: 'Development authentication is disabled in production.',
      name: 'AuthenticationError',
    });
  });
});
