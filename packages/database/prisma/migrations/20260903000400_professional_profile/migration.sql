ALTER TABLE "accounts"
  ADD COLUMN "professional_name" VARCHAR(120),
  ADD COLUMN "business_name" VARCHAR(120),
  ADD COLUMN "phone" VARCHAR(20),
  ADD COLUMN "document" VARCHAR(20),
  ADD COLUMN "address" VARCHAR(240);

ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_professional_name_not_blank"
  CHECK ("professional_name" IS NULL OR length(trim("professional_name")) > 0);
