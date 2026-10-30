-- Artisans request verification from their dashboard; the owner reviews it.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyRequestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyArea" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyDeclinedReason" TEXT;
