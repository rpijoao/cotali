-- CreateEnum
CREATE TYPE "SecurityAuditEventName" AS ENUM (
    'AUTH_REQUEST',
    'OTP_REQUEST',
    'OTP_VERIFY',
    'SOCIAL_SIGN_IN',
    'OAUTH_CALLBACK',
    'SESSION_READ',
    'SESSION_SIGN_OUT',
    'IDENTITY_LINK',
    'RATE_LIMITED'
);

-- CreateEnum
CREATE TYPE "SecurityAuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "security_audit_events" (
    "id" UUID NOT NULL,
    "name" "SecurityAuditEventName" NOT NULL,
    "outcome" "SecurityAuditOutcome" NOT NULL,
    "request_id" VARCHAR(120),
    "auth_subject" VARCHAR(120),
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(160) NOT NULL,
    "status_code" INTEGER,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_audit_events_name_occurred_at_idx"
ON "security_audit_events"("name", "occurred_at");

-- CreateIndex
CREATE INDEX "security_audit_events_auth_subject_occurred_at_idx"
ON "security_audit_events"("auth_subject", "occurred_at");

-- Enforce append-only behavior for the application database role as well as
-- the service API. Administrative superusers remain outside this guarantee.
CREATE OR REPLACE FUNCTION prevent_security_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'security_audit_events is append-only';
END;
$$;

CREATE TRIGGER security_audit_events_append_only
BEFORE UPDATE OR DELETE ON "security_audit_events"
FOR EACH ROW
EXECUTE FUNCTION prevent_security_audit_event_mutation();
