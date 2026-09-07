import { getCookies } from 'better-auth/cookies';
import type { BetterAuthOptions } from 'better-auth';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveAuthCookiePolicy,
  type AuthCookieSameSite,
} from './better-auth.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Better Auth cookie policy', () => {
  it('emits explicit secure web cookie attributes over HTTPS', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const baseURL = 'https://api.example.com';
    const policy = resolveAuthCookiePolicy(baseURL);
    const cookies = getCookies({
      baseURL,
      advanced: policy,
    } as BetterAuthOptions);

    expect(cookies.sessionToken.name).toMatch(/^__Secure-/);
    expect(cookies.sessionToken.attributes).toMatchObject({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });

  it('fails closed when production Better Auth URL is not HTTPS', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => resolveAuthCookiePolicy('http://api.example.com')).toThrow(
      'BETTER_AUTH_URL must use HTTPS in production.',
    );
  });

  it('requires HTTPS when cross-site cookies are explicitly selected', () => {
    vi.stubEnv('AUTH_COOKIE_SAME_SITE', 'none');

    expect(() => resolveAuthCookiePolicy('http://localhost:3333')).toThrow(
      'AUTH_COOKIE_SAME_SITE=none requires HTTPS',
    );
  });

  it.each(['lax', 'strict', 'none'] satisfies AuthCookieSameSite[])(
    'accepts the configured SameSite value: %s',
    (sameSite) => {
      vi.stubEnv('AUTH_COOKIE_SAME_SITE', sameSite);
      const policy = resolveAuthCookiePolicy('https://api.example.com');

      expect(policy.defaultCookieAttributes.sameSite).toBe(sameSite);
    },
  );
});
