-- CreateTable
CREATE TABLE "EquipmentBlackout" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentBlackout_pkey" PRIMARY KEY ("id")
);

-- CHECK constraint (manual, like the other hardening rules): both dates are inclusive.
ALTER TABLE "EquipmentBlackout"
  ADD CONSTRAINT "EquipmentBlackout_dates_check" CHECK ("endDate" >= "startDate");

-- CreateIndex
CREATE INDEX "EquipmentBlackout_equipmentId_startDate_endDate_idx" ON "EquipmentBlackout"("equipmentId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "EquipmentBlackout_startDate_endDate_idx" ON "EquipmentBlackout"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "EquipmentBlackout" ADD CONSTRAINT "EquipmentBlackout_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
