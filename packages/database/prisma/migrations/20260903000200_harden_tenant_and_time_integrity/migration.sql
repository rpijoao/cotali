ALTER TABLE "quotes" DROP CONSTRAINT "quotes_client_id_fkey";
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_current_revision_id_fkey";

ALTER TABLE "accounts"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "clients"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "quotes"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';

ALTER TABLE "quote_revisions"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "finalized_at" TYPE TIMESTAMPTZ(3) USING "finalized_at" AT TIME ZONE 'UTC';

ALTER TABLE "mutations"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

CREATE UNIQUE INDEX "clients_account_id_id_key" ON "clients"("account_id", "id");
CREATE UNIQUE INDEX "quotes_id_current_revision_id_key" ON "quotes"("id", "current_revision_id");
CREATE UNIQUE INDEX "quote_revisions_quote_id_id_key" ON "quote_revisions"("quote_id", "id");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_account_id_client_id_fkey"
  FOREIGN KEY ("account_id", "client_id")
  REFERENCES "clients"("account_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_id_current_revision_id_fkey"
  FOREIGN KEY ("id", "current_revision_id")
  REFERENCES "quote_revisions"("quote_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
