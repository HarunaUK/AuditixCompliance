-- AI provenance for drafted policies: stays false unless the draft came from
-- the generator, and records the model used for the audit trail.
ALTER TABLE "Policy"
  ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aiModel" TEXT;
