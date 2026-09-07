CREATE TYPE "ConsentPurpose" AS ENUM ('MARKETING_EMAIL');
CREATE TYPE "ConsentChannel" AS ENUM ('WEB', 'MOBILE');
CREATE TYPE "ValueEventName" AS ENUM ('QUOTE_CREATED', 'QUOTE_UPDATED', 'QUOTE_SHARED');

CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policy_version" VARCHAR(40) NOT NULL,
    "channel" "ConsentChannel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "value_events" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "event_key" VARCHAR(120) NOT NULL,
    "name" "ValueEventName" NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "value_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "value_events_account_id_event_key_key" ON "value_events"("account_id", "event_key");
CREATE INDEX "consent_records_account_id_purpose_created_at_idx" ON "consent_records"("account_id", "purpose", "created_at");
CREATE INDEX "value_events_account_id_name_occurred_at_idx" ON "value_events"("account_id", "name", "occurred_at");

ALTER TABLE "consent_records"
  ADD CONSTRAINT "consent_records_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "value_events"
  ADD CONSTRAINT "value_events_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
