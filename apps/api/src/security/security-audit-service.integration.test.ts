import 'dotenv/config';
import { PrismaClient } from '@cotali/database';
import { describe, expect, it } from 'vitest';

const databaseUrl =
  process.env.RUN_DATABASE_INTEGRATION === 'true'
    ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL)
    : undefined;
const run = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : null;

run('security_audit_events', () => {
  it('rejects update and delete mutations transactionally', async () => {
    if (!prisma) throw new Error('A database URL is required.');

    await expect(
      prisma.$transaction(async (transaction) => {
        const event = await transaction.securityAuditEvent.create({
          data: {
            method: 'POST',
            name: 'AUTH_REQUEST',
            outcome: 'SUCCESS',
            path: '/v1/auth/test',
            statusCode: 200,
          },
        });
        await transaction.securityAuditEvent.update({
          data: { statusCode: 201 },
          where: { id: event.id },
        });
      }),
    ).rejects.toThrow('security_audit_events is append-only');

    await expect(
      prisma.$transaction(async (transaction) => {
        const event = await transaction.securityAuditEvent.create({
          data: {
            method: 'POST',
            name: 'AUTH_REQUEST',
            outcome: 'SUCCESS',
            path: '/v1/auth/test',
            statusCode: 200,
          },
        });
        await transaction.securityAuditEvent.delete({
          where: { id: event.id },
        });
      }),
    ).rejects.toThrow('security_audit_events is append-only');

    await prisma.$disconnect();
  }, 20_000);
});
