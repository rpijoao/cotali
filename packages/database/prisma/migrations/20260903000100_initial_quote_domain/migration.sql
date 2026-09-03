CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'READY_TO_SHARE', 'SHARED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID');
CREATE TYPE "QuoteSource" AS ENUM ('MANUAL', 'INTERPRETATION', 'MIXED');
CREATE TYPE "PaymentPlanType" AS ENUM ('INTEGRAL', 'PARTIAL', 'INSTALLMENTS');

CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "auth_subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "clients_name_not_blank" CHECK (length(trim("name")) > 0)
);

CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "total_cents" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "current_revision_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quotes_total_nonnegative" CHECK ("total_cents" >= 0),
    CONSTRAINT "quotes_currency_brl" CHECK ("currency" = 'BRL')
);

CREATE TABLE "quote_revisions" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "source" "QuoteSource" NOT NULL,
    "payment_method" VARCHAR(80),
    "payment_plan_type" "PaymentPlanType" NOT NULL,
    "installment_count" INTEGER,
    "execution_deadline" VARCHAR(120),
    "valid_until" DATE,
    "notes" VARCHAR(1000),
    "services_subtotal_cents" BIGINT NOT NULL,
    "materials_subtotal_cents" BIGINT NOT NULL,
    "subtotal_cents" BIGINT NOT NULL,
    "discount_cents" BIGINT NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMP(3),
    CONSTRAINT "quote_revisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_revisions_number_positive" CHECK ("revision_number" > 0),
    CONSTRAINT "quote_revisions_money_nonnegative" CHECK (
        "services_subtotal_cents" >= 0 AND
        "materials_subtotal_cents" >= 0 AND
        "subtotal_cents" >= 0 AND
        "discount_cents" >= 0 AND
        "total_cents" >= 0
    ),
    CONSTRAINT "quote_revisions_total_consistent" CHECK (
        "subtotal_cents" = "services_subtotal_cents" + "materials_subtotal_cents" AND
        "total_cents" = GREATEST(0, "subtotal_cents" - "discount_cents")
    ),
    CONSTRAINT "quote_revisions_installments_consistent" CHECK (
        ("payment_plan_type" = 'INSTALLMENTS' AND "installment_count" BETWEEN 2 AND 24) OR
        ("payment_plan_type" <> 'INSTALLMENTS' AND "installment_count" IS NULL)
    )
);

CREATE TABLE "service_lines" (
    "id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "description" VARCHAR(160) NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" VARCHAR(20),
    "unit_price_cents" BIGINT,
    "total_cents" BIGINT,
    "position" INTEGER NOT NULL,
    CONSTRAINT "service_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_lines_valid" CHECK (
        length(trim("description")) > 0 AND "quantity" > 0 AND "position" >= 0 AND
        ("unit_price_cents" IS NULL OR "unit_price_cents" >= 0) AND
        ("total_cents" IS NULL OR "total_cents" >= 0)
    )
);

CREATE TABLE "material_lines" (
    "id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "description" VARCHAR(160) NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" VARCHAR(20),
    "unit_price_cents" BIGINT,
    "total_cents" BIGINT,
    "position" INTEGER NOT NULL,
    CONSTRAINT "material_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "material_lines_valid" CHECK (
        length(trim("description")) > 0 AND "quantity" > 0 AND "position" >= 0 AND
        ("unit_price_cents" IS NULL OR "unit_price_cents" >= 0) AND
        ("total_cents" IS NULL OR "total_cents" >= 0)
    )
);

CREATE TABLE "mutations" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "mutation_id" UUID NOT NULL,
    "command_type" VARCHAR(80) NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mutations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_auth_subject_key" ON "accounts"("auth_subject");
CREATE INDEX "clients_account_id_name_idx" ON "clients"("account_id", "name");
CREATE UNIQUE INDEX "quotes_current_revision_id_key" ON "quotes"("current_revision_id");
CREATE INDEX "quotes_account_id_created_at_idx" ON "quotes"("account_id", "created_at");
CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");
CREATE UNIQUE INDEX "quote_revisions_quote_id_revision_number_key" ON "quote_revisions"("quote_id", "revision_number");
CREATE UNIQUE INDEX "service_lines_revision_id_position_key" ON "service_lines"("revision_id", "position");
CREATE UNIQUE INDEX "material_lines_revision_id_position_key" ON "material_lines"("revision_id", "position");
CREATE UNIQUE INDEX "mutations_account_id_mutation_id_key" ON "mutations"("account_id", "mutation_id");

ALTER TABLE "clients" ADD CONSTRAINT "clients_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_current_revision_id_fkey" FOREIGN KEY ("current_revision_id") REFERENCES "quote_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_lines" ADD CONSTRAINT "service_lines_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "quote_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_lines" ADD CONSTRAINT "material_lines_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "quote_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mutations" ADD CONSTRAINT "mutations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
