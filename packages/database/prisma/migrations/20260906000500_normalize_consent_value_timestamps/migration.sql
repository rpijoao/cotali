-- These columns were created as timestamp without time zone by migration 002.
-- Existing values are interpreted as UTC while converting to timestamptz.
ALTER TABLE "consent_records"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3)
    USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "value_events"
  ALTER COLUMN "occurred_at" TYPE TIMESTAMPTZ(3)
    USING "occurred_at" AT TIME ZONE 'UTC';
