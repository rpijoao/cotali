import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@cotali/database';
import { afterAll, describe, expect, it } from 'vitest';
import { createCotaliAuth } from './better-auth.js';
import type { AuthEmailService } from '../email/email-service.js';

const databaseUrl =
  process.env.RUN_DATABASE_INTEGRATION === 'true'
    ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL)
    : undefined;
const run = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : null;
const authBaseURL = 'http://localhost:3333';
const emails = new Set<string>();
let ipCounter = 10;
const sentOtps: Array<{
  email: string;
  otp: string;
  type: 'sign-in' | 'email-verification';
}> = [];
const emailService: AuthEmailService = {
  async sendOtp(input) {
    sentOtps.push(input);
  },
};
const auth = prisma ? createCotaliAuth(prisma, emailService) : null;

afterAll(async () => {
  if (!prisma || !auth) return;

  const context = await auth.$context;
  for (const email of emails) {
    await context.internalAdapter.deleteVerificationByIdentifier(
      `sign-in-otp-${email}`,
    );
    await context.internalAdapter.deleteVerificationByIdentifier(
      `email-verification-otp-${email}`,
    );
  }

  const users = await prisma.authUser.findMany({
    select: { id: true },
    where: { email: { in: [...emails] } },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length) {
    await prisma.account.deleteMany({
      where: { authSubject: { in: userIds } },
    });
    await prisma.authSession.deleteMany({
      where: { user_id: { in: userIds } },
    });
    await prisma.authAccount.deleteMany({
      where: { user_id: { in: userIds } },
    });
    await prisma.authUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

async function request(
  path: '/email-otp/send-verification-otp' | '/sign-in/email-otp',
  body: Record<string, string>,
  ip = nextIp(),
): Promise<Response> {
  if (!auth) throw new Error('A database URL is required.');
  return auth.handler(
    new Request(`${authBaseURL}/v1/auth${path}`, {
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        origin: authBaseURL,
        'x-cotali-client-ip': ip,
      },
      method: 'POST',
    }),
  );
}

function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function sendOtp(email: string): Promise<string> {
  emails.add(email);
  const before = sentOtps.length;
  const response = await request('/email-otp/send-verification-otp', {
    email,
    type: 'sign-in',
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });

  const sent = sentOtps.at(before);
  if (!sent) throw new Error('The test email service did not receive an OTP.');
  return sent.otp;
}

async function verification(email: string) {
  if (!auth) throw new Error('A database URL is required.');
  const context = await auth.$context;
  return context.internalAdapter.findVerificationValue(`sign-in-otp-${email}`);
}

run('Better Auth email OTP lifecycle', () => {
  it('stores OTPs hashed, rejects an expired OTP, and consumes it', async () => {
    if (!prisma) throw new Error('A database URL is required.');
    const email = `otp-expired-${randomUUID()}@example.test`;
    const otp = await sendOtp(email);
    const stored = await verification(email);

    expect(stored).not.toBeNull();
    expect(stored?.value).not.toContain(otp);
    expect(stored?.value).toMatch(/:0$/);

    if (!stored) throw new Error('The OTP verification row was not created.');
    await prisma.authVerification.update({
      data: { expires_at: new Date(Date.now() - 1_000) },
      where: { id: stored.id },
    });

    const response = await request('/sign-in/email-otp', { email, otp });

    expect(response.status).toBe(400);
    expect(await verification(email)).toBeNull();
    expect(await prisma.authUser.findUnique({ where: { email } })).toBeNull();
  }, 30_000);

  it('locks the OTP after five invalid attempts', async () => {
    if (!prisma) throw new Error('A database URL is required.');
    const email = `otp-attempts-${randomUUID()}@example.test`;
    const otp = await sendOtp(email);
    const wrongOtp = otp === '000000' ? '111111' : '000000';
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request('/sign-in/email-otp', {
        email,
        otp: wrongOtp,
      });
      statuses.push(response.status);
    }
    const exhaustedResponse = await request('/sign-in/email-otp', {
      email,
      otp: wrongOtp,
    });

    expect(statuses).toEqual([400, 400, 400, 400, 400]);
    expect(exhaustedResponse.status).toBe(403);
    expect(await verification(email)).toBeNull();
    expect(await prisma.authUser.findUnique({ where: { email } })).toBeNull();
  }, 30_000);

  it('rotates the OTP on resend and allows one successful use only', async () => {
    if (!prisma) throw new Error('A database URL is required.');
    const email = `otp-rotation-${randomUUID()}@example.test`;
    const firstOtp = await sendOtp(email);
    const secondOtp = await sendOtp(email);

    const staleResponse = await request('/sign-in/email-otp', {
      email,
      otp: firstOtp,
    });
    const signInResponse = await request('/sign-in/email-otp', {
      email,
      otp: secondOtp,
    });
    const replayResponse = await request('/sign-in/email-otp', {
      email,
      otp: secondOtp,
    });

    expect(staleResponse.status).toBe(400);
    expect(signInResponse.status).toBe(200);
    expect(replayResponse.status).toBe(400);
    const user = await prisma.authUser.findUniqueOrThrow({
      where: { email },
    });
    expect(
      await prisma.account.findUnique({
        where: { authSubject: user.id },
      }),
    ).not.toBeNull();
    expect(await verification(email)).toBeNull();
    expect(
      await prisma.authSession.count({ where: { user_id: user.id } }),
    ).toBe(1);
  }, 30_000);
});
