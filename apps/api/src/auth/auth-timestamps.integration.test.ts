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

const expectedColumns = [
  ['auth_users', 'created_at'],
  ['auth_users', 'updated_at'],
  ['auth_sessions', 'expires_at'],
  ['auth_sessions', 'created_at'],
  ['auth_sessions', 'updated_at'],
  ['auth_accounts', 'access_token_expires_at'],
  ['auth_accounts', 'refresh_token_expires_at'],
  ['auth_accounts', 'created_at'],
  ['auth_accounts', 'updated_at'],
  ['auth_verifications', 'expires_at'],
  ['auth_verifications', 'created_at'],
  ['auth_verifications', 'updated_at'],
] as const;

run('Better Auth timestamp schema', () => {
  it('stores auth instants as PostgreSQL timestamptz', async () => {
    if (!prisma) throw new Error('A database URL is required.');

    const columns = (await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('auth_users', 'created_at'),
          ('auth_users', 'updated_at'),
          ('auth_sessions', 'expires_at'),
          ('auth_sessions', 'created_at'),
          ('auth_sessions', 'updated_at'),
          ('auth_accounts', 'access_token_expires_at'),
          ('auth_accounts', 'refresh_token_expires_at'),
          ('auth_accounts', 'created_at'),
          ('auth_accounts', 'updated_at'),
          ('auth_verifications', 'expires_at'),
          ('auth_verifications', 'created_at'),
          ('auth_verifications', 'updated_at')
        )
      ORDER BY table_name, column_name
    `) as Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name: string;
    }>;

    expect(columns).toHaveLength(expectedColumns.length);
    expect(
      columns.every(
        (column) =>
          column.data_type === 'timestamp with time zone' &&
          column.udt_name === 'timestamptz',
      ),
    ).toBe(true);

    await prisma.$disconnect();
  }, 20_000);
});
