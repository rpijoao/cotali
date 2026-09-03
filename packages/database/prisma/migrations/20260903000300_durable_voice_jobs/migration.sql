CREATE TYPE "VoiceJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "voice_jobs" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "mutation_id" UUID NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "status" "VoiceJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "audio_bytes" BYTEA,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "interpretation" JSONB,
    "error_message" VARCHAR(2000),
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(3),
    "locked_by" VARCHAR(120),
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "voice_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voice_jobs_account_id_mutation_id_key"
ON "voice_jobs"("account_id", "mutation_id");

CREATE INDEX "voice_jobs_status_available_at_idx"
ON "voice_jobs"("status", "available_at");

ALTER TABLE "voice_jobs"
ADD CONSTRAINT "voice_jobs_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
