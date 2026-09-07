import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { describe, expect, it, vi } from 'vitest';

const AUTH_BASE_URL = 'http://localhost:3333';
const OTP_SEND_PATH = '/v1/auth/email-otp/send-verification-otp';

function createTestAuth() {
  const sendVerificationOTP = vi.fn().mockResolvedValue(undefined);
  const auth = betterAuth({
    baseURL: AUTH_BASE_URL,
    basePath: '/v1/auth',
    secret: 'cotali-test-secret-that-is-long-enough',
    rateLimit: { enabled: true, storage: 'memory' },
    plugins: [
      emailOTP({
        disableSignUp: false,
        rateLimit: { window: 60, max: 3 },
        sendVerificationOTP,
      }),
    ],
  });

  return { auth, sendVerificationOTP };
}

async function sendOtpRequest(
  auth: { handler: (request: Request) => Promise<Response> },
  email: string,
  ip = '198.51.100.10',
): Promise<Response> {
  return auth.handler(
    new Request(`${AUTH_BASE_URL}${OTP_SEND_PATH}`, {
      body: JSON.stringify({ email, type: 'sign-in' }),
      headers: {
        'content-type': 'application/json',
        origin: AUTH_BASE_URL,
        'x-forwarded-for': ip,
      },
      method: 'POST',
    }),
  );
}

describe('Better Auth email OTP anti-enumeration', () => {
  it('returns the same success contract for existing and new valid emails', async () => {
    const { auth, sendVerificationOTP } = createTestAuth();
    const context = await auth.$context;
    const existingEmail = 'existing-user@example.test';
    const newEmail = 'new-user@example.test';

    await context.internalAdapter.createUser(
      {
        email: existingEmail,
        emailVerified: false,
        name: 'Existing User',
      },
      { method: 'test' },
    );

    const existingResponse = await sendOtpRequest(auth, existingEmail);
    const newResponse = await sendOtpRequest(auth, newEmail, '198.51.100.11');

    expect(existingResponse.status).toBe(200);
    expect(newResponse.status).toBe(200);
    await expect(existingResponse.json()).resolves.toEqual({ success: true });
    await expect(newResponse.json()).resolves.toEqual({ success: true });
    expect(sendVerificationOTP).toHaveBeenCalledTimes(2);
  });

  it('rejects a malformed email without exposing account state', async () => {
    const { auth } = createTestAuth();

    const response = await sendOtpRequest(auth, 'not-an-email');
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).not.toMatch(/user|account|exists|registered|found/i);
    expect(body).not.toContain('not-an-email');
  });

  it('returns a generic rate-limit response without the submitted email', async () => {
    const { auth } = createTestAuth();
    const email = 'blocked-user@example.test';

    await sendOtpRequest(auth, email);
    await sendOtpRequest(auth, email);
    await sendOtpRequest(auth, email);
    const blockedResponse = await sendOtpRequest(auth, email);
    const body = await blockedResponse.text();

    expect(blockedResponse.status).toBe(429);
    expect(body).not.toContain(email);
    expect(body).not.toMatch(/user|account|exists|registered|found/i);
  });
});
