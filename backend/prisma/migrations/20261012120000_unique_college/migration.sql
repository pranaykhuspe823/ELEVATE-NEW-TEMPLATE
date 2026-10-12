-- One registration per college: a normalized name key and (when given) the
-- bare domain must be unique. See src/lib/collegeKeys.ts for the rules.
ALTER TABLE "colleges" ADD COLUMN "nameKey" TEXT;
ALTER TABLE "colleges" ADD COLUMN "domainKey" TEXT;

-- Backfill existing rows the same way collegeNameKey()/collegeDomainKey() do.
UPDATE "colleges"
SET "nameKey" = regexp_replace(replace(lower("name"), '&', 'and'), '[^[:alnum:]]', '', 'g'),
    "domainKey" = NULLIF(
      split_part(split_part(split_part(regexp_replace(regexp_replace(lower(trim(coalesce("domain", ''))), '^[a-z]+://', ''), '^www\.', ''), '/', 1), '?', 1), ':', 1),
      ''
    );

ALTER TABLE "colleges" ALTER COLUMN "nameKey" SET NOT NULL;

CREATE UNIQUE INDEX "colleges_nameKey_key" ON "colleges"("nameKey");
CREATE UNIQUE INDEX "colleges_domainKey_key" ON "colleges"("domainKey");
