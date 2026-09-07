import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSocialProviders } from './better-auth.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('social authentication providers', () => {
  it('allows production to start with Google and without Apple', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');

    expect(createSocialProviders(true)).toEqual({
      google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
      },
    });
  });

  it('rejects a partially configured provider', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
    vi.stubEnv('APPLE_CLIENT_ID', 'apple-client-id');

    expect(() => createSocialProviders(true)).toThrow(
      'APPLE_CLIENT_ID and APPLE_CLIENT_SECRET must be provided together.',
    );
  });

  it('includes Apple when both Apple credentials are configured', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
    vi.stubEnv('APPLE_CLIENT_ID', 'apple-client-id');
    vi.stubEnv('APPLE_CLIENT_SECRET', 'apple-client-secret');

    expect(createSocialProviders(true)).toMatchObject({
      apple: {
        clientId: 'apple-client-id',
        clientSecret: 'apple-client-secret',
      },
    });
  });
});
