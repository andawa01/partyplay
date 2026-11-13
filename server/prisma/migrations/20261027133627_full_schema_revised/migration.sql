/*
  Warnings:

  - You are about to drop the column `dayRate` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerUnit` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerUnitFlat` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `reserved` on the `EquipmentInventory` table. All the data in the column will be lost.
  - You are about to drop the `UserSession` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `itemsSnapshot` to the `PackageBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageName` to the `PackageBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packagePrice` to the `PackageBooking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_createdById_fkey";

-- DropIndex
DROP INDEX "Booking_startDate_endDate_idx";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "holdExpiresAt" TIMESTAMP(3),
ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE,
ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Equipment" DROP COLUMN "dayRate",
DROP COLUMN "pricePerUnit",
DROP COLUMN "pricePerUnitFlat",
ADD COLUMN     "flatPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "EquipmentInventory" DROP COLUMN "reserved";

-- AlterTable
ALTER TABLE "Offer" ALTER COLUMN "discountValue" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "PackageBooking" ADD COLUMN     "itemsSnapshot" TEXT NOT NULL,
ADD COLUMN     "packageName" TEXT NOT NULL,
ADD COLUMN     "packagePrice" DECIMAL(10,2) NOT NULL;

-- DropTable
DROP TABLE "UserSession";

-- CreateIndex
CREATE INDEX "PackageBooking_bookingId_idx" ON "PackageBooking"("bookingId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
