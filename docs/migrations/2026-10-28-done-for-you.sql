-- Done-for-you orders: the ServicePackage/ServiceOrder/ServicePayment/Delivery
-- tables were in schema.prisma since September but never created in the
-- database. Additive only: four new tables, nothing existing is altered.
-- (prisma migrate diff also proposed dropping two updatedAt defaults on
-- Campaign and Deal; that is unrelated drift and deliberately left out.)

-- CreateTable
CREATE TABLE IF NOT EXISTS "ServicePackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DIGITAL',
    "priceKobo" INTEGER NOT NULL,
    "depositPct" INTEGER NOT NULL DEFAULT 50,
    "costKobo" INTEGER NOT NULL,
    "turnaroundDays" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 2,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ServiceOrder" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "briefJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'AWAITING_DEPOSIT',
    "priceKobo" INTEGER NOT NULL,
    "depositKobo" INTEGER NOT NULL,
    "balanceKobo" INTEGER NOT NULL,
    "costKobo" INTEGER NOT NULL,
    "fulfillerType" TEXT,
    "fulfillerUserId" TEXT,
    "fulfillerName" TEXT,
    "fulfillerNote" TEXT,
    "fulfillerCostKobo" INTEGER,
    "fulfillerPaidAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revisionsUsed" INTEGER NOT NULL DEFAULT 0,
    "revisionNote" TEXT,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ServicePayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "feeKobo" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "rawJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Delivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "note" TEXT,
    "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ServicePackage_slug_key" ON "ServicePackage"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServicePackage_kind_isActive_idx" ON "ServicePackage"("kind", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceOrder_reference_key" ON "ServiceOrder"("reference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServiceOrder_status_idx" ON "ServiceOrder"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServiceOrder_createdAt_idx" ON "ServiceOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ServicePayment_reference_key" ON "ServicePayment"("reference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ServicePayment_orderId_idx" ON "ServicePayment"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Delivery_orderId_idx" ON "Delivery"("orderId");

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePayment" ADD CONSTRAINT "ServicePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

