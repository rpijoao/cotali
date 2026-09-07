import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@cotali/database';
import { describe, expect, it } from 'vitest';
import {
  buildOtpRateLimitKey,
  OTP_RATE_LIMIT_MAX,
  PrismaOtpRateLimitService,
} from './otp-rate-limit-service.js';

const databaseUrl =
  process.env.RUN_DATABASE_INTEGRATION === 'true'
    ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL)
    : undefined;
const run = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : null;

run('distributed OTP rate limit', () => {
  it('allows only the configured number of concurrent email and IP requests', async () => {
    if (!prisma) throw new Error('A database URL is required.');

    const secret = 'integration-only-otp-rate-limit-secret';
    const email = `otp-rate-limit-${randomUUID()}@example.com`;
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    const service = new PrismaOtpRateLimitService(prisma, secret);
    const key = buildOtpRateLimitKey(email, ip, secret);

    try {
      const decisions = await Promise.all(
        Array.from({ length: OTP_RATE_LIMIT_MAX + 7 }, () =>
          service.consume({ email, ip }),
        ),
      );

      expect(decisions.filter((decision) => decision.allowed)).toHaveLength(
        OTP_RATE_LIMIT_MAX,
      );
      expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(7);
      expect(
        decisions
          .filter(
            (
              decision,
            ): decision is { allowed: false; retryAfterSeconds: number } =>
              !decision.allowed,
          )
          .every((decision) => decision.retryAfterSeconds >= 1),
      ).toBe(true);

      const rows = await prisma.authRateLimit.findMany({ where: { key } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.count).toBe(OTP_RATE_LIMIT_MAX);
    } finally {
      await prisma.authRateLimit.deleteMany({ where: { key } });
      await prisma.$disconnect();
    }
  }, 20_000);
});
