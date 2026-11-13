/*
  Warnings:

  - You are about to drop the column `itemsSnapshot` on the `PackageBooking` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StockHoldStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- AlterTable
ALTER TABLE "PackageBooking" DROP COLUMN "itemsSnapshot",
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "BookingPackageItem" (
    "id" TEXT NOT NULL,
    "packageBookingId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "equipmentName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "BookingPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockHold" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPackageItem_packageBookingId_idx" ON "BookingPackageItem"("packageBookingId");

-- CreateIndex
CREATE INDEX "BookingPackageItem_equipmentId_idx" ON "BookingPackageItem"("equipmentId");

-- CreateIndex
CREATE INDEX "StockHold_equipmentId_status_idx" ON "StockHold"("equipmentId", "status");

-- CreateIndex
CREATE INDEX "StockHold_expiresAt_idx" ON "StockHold"("expiresAt");

-- CreateIndex
CREATE INDEX "StockHold_bookingId_idx" ON "StockHold"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "StockHold_bookingId_equipmentId_key" ON "StockHold"("bookingId", "equipmentId");

-- AddForeignKey
ALTER TABLE "BookingPackageItem" ADD CONSTRAINT "BookingPackageItem_packageBookingId_fkey" FOREIGN KEY ("packageBookingId") REFERENCES "PackageBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPackageItem" ADD CONSTRAINT "BookingPackageItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockHold" ADD CONSTRAINT "StockHold_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockHold" ADD CONSTRAINT "StockHold_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
