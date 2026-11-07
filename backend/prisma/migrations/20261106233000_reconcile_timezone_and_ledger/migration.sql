-- Reconcile OtpVerification expiry column with the Prisma schema.
ALTER TABLE "OtpVerification"
ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3)
USING "expiresAt" AT TIME ZONE 'UTC';

-- Add notification tracking and idempotency reference to ledger entries.
ALTER TABLE "LedgerEntry"
ADD COLUMN "notify" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reference" TEXT;

CREATE UNIQUE INDEX "LedgerEntry_reference_key"
ON "LedgerEntry"("reference");
