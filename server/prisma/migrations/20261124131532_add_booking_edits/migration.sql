-- CreateTable
CREATE TABLE "BookingEdit" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "adminId" TEXT,
    "note" TEXT,
    "previousStartDate" DATE NOT NULL,
    "previousEndDate" DATE NOT NULL,
    "newStartDate" DATE NOT NULL,
    "newEndDate" DATE NOT NULL,
    "previousTotalAmount" DECIMAL(10,2) NOT NULL,
    "newTotalAmount" DECIMAL(10,2) NOT NULL,
    "previousSnapshot" JSONB NOT NULL,
    "newSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEdit_pkey" PRIMARY KEY ("id")
);

-- CHECK constraints (manual, like the other hardening rules): audit snapshots must be valid.
ALTER TABLE "BookingEdit"
  ADD CONSTRAINT "BookingEdit_dates_check" CHECK (
    "previousEndDate" >= "previousStartDate" AND "newEndDate" >= "newStartDate"
  );
ALTER TABLE "BookingEdit"
  ADD CONSTRAINT "BookingEdit_totals_check" CHECK (
    "previousTotalAmount" >= 0 AND "newTotalAmount" >= 0
  );

-- CreateIndex
CREATE INDEX "BookingEdit_bookingId_idx" ON "BookingEdit"("bookingId");

-- CreateIndex
CREATE INDEX "BookingEdit_adminId_idx" ON "BookingEdit"("adminId");

-- AddForeignKey
ALTER TABLE "BookingEdit" ADD CONSTRAINT "BookingEdit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEdit" ADD CONSTRAINT "BookingEdit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
