import { createHmac, randomUUID } from 'node:crypto';
import type { PrismaClient } from '@cotali/database';

export const OTP_RATE_LIMIT_WINDOW_SECONDS = 60;
export const OTP_RATE_LIMIT_MAX = 3;

const OTP_RATE_LIMIT_KEY_PREFIX = 'cotali:otp-email-ip:v1';

export type OtpRateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export interface OtpRateLimitService {
  consume(input: { email: string; ip: string }): Promise<OtpRateLimitDecision>;
}

export function buildOtpRateLimitKey(
  email: string,
  ip: string,
  secret: string,
): string {
  return [
    OTP_RATE_LIMIT_KEY_PREFIX,
    `email:${digest(normalizeEmail(email), secret)}`,
    `ip:${digest(normalizeIp(ip), secret)}`,
  ].join(':');
}

export class PrismaOtpRateLimitService implements OtpRateLimitService {
  private readonly windowMs: number;
  private readonly max: number;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly secret: string,
    options: {
      windowSeconds?: number;
      max?: number;
    } = {},
  ) {
    if (!secret) throw new Error('An OTP rate-limit secret is required.');

    const windowSeconds =
      options.windowSeconds ?? OTP_RATE_LIMIT_WINDOW_SECONDS;
    const max = options.max ?? OTP_RATE_LIMIT_MAX;
    if (!Number.isInteger(windowSeconds) || windowSeconds <= 0) {
      throw new Error('OTP rate-limit window must be a positive integer.');
    }
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error('OTP rate-limit maximum must be a positive integer.');
    }

    this.windowMs = windowSeconds * 1000;
    this.max = max;
  }

  async consume(input: {
    email: string;
    ip: string;
  }): Promise<OtpRateLimitDecision> {
    const key = buildOtpRateLimitKey(input.email, input.ip, this.secret);
    const now = Date.now();

    return await this.prisma.$transaction(async (transaction) => {
      // The advisory lock also serializes the first request, before a row
      // exists and can be locked with SELECT ... FOR UPDATE.
      await transaction.$queryRaw`
        SELECT 1
        FROM (
          SELECT pg_advisory_xact_lock(hashtext(${key}))
        ) AS advisory_lock
      `;

      const rows = (await transaction.$queryRaw`
        SELECT "count", "last_request"
        FROM "auth_rate_limits"
        WHERE "key" = ${key}
        FOR UPDATE
      `) as Array<{ count: number; last_request: bigint | number | string }>;
      const current = rows[0];

      if (!current) {
        await transaction.$executeRaw`
          INSERT INTO "auth_rate_limits" ("id", "key", "count", "last_request")
          VALUES (${randomUUID()}, ${key}, 1, ${BigInt(now)})
        `;
        return { allowed: true };
      }

      const lastRequest = Number(current.last_request);
      if (now - lastRequest >= this.windowMs) {
        await transaction.$executeRaw`
          UPDATE "auth_rate_limits"
          SET "count" = 1, "last_request" = ${BigInt(now)}
          WHERE "key" = ${key}
        `;
        return { allowed: true };
      }

      if (current.count >= this.max) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((lastRequest + this.windowMs - now) / 1000),
          ),
        };
      }

      await transaction.$executeRaw`
        UPDATE "auth_rate_limits"
        SET "count" = "count" + 1, "last_request" = ${BigInt(now)}
        WHERE "key" = ${key}
      `;
      return { allowed: true };
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase();
}

function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase();
}

function digest(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}
