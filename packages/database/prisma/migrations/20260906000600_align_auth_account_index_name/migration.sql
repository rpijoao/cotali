-- Keep the live database aligned with the explicit Prisma index name.
ALTER INDEX IF EXISTS "auth_accounts_issuer_account_id_uidx"
RENAME TO "auth_account_issuer_account_id_uidx";
