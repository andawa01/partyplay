-- CreateIndex
-- Availability lookups filter on status + an inclusive date range.
CREATE INDEX "Booking_status_startDate_endDate_idx" ON "Booking"("status", "startDate", "endDate");

-- ---------------------------------------------------------------------------
-- CHECK constraints (manually added: Prisma's schema language cannot express them)
--
-- These are intentionally NOT expressed in schema.prisma, so a future
-- `prisma migrate dev` will never try to drop them. Keep new ones in a manual
-- migration like this one.
-- ---------------------------------------------------------------------------

-- Rental dates: both columns are inclusive, so equal dates are a valid 1-day rental.
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_dates_check" CHECK ("endDate" >= "startDate");

-- Booking lines: a line must book at least one unit for at least one day.
ALTER TABLE "BookingItem"
  ADD CONSTRAINT "BookingItem_quantity_check" CHECK ("quantity" >= 1),
  ADD CONSTRAINT "BookingItem_days_check" CHECK ("days" >= 1);

-- Booked packages: at least one package, and each snapshot line at least one unit.
ALTER TABLE "PackageBooking"
  ADD CONSTRAINT "PackageBooking_quantity_check" CHECK ("quantity" >= 1);

ALTER TABLE "BookingPackageItem"
  ADD CONSTRAINT "BookingPackageItem_quantity_check" CHECK ("quantity" >= 1);

-- Stock holds: a hold of zero units is meaningless.
ALTER TABLE "StockHold"
  ADD CONSTRAINT "StockHold_quantity_check" CHECK ("quantity" >= 1);

-- Catalogue: package contents and banded quantity limits must be sane.
ALTER TABLE "PackageItem"
  ADD CONSTRAINT "PackageItem_quantity_check" CHECK ("quantity" >= 1);

ALTER TABLE "EquipmentInventory"
  ADD CONSTRAINT "EquipmentInventory_total_check" CHECK ("total" >= 0);

ALTER TABLE "Equipment"
  ADD CONSTRAINT "Equipment_quantity_range_check"
  CHECK ("minQuantity" >= 1 AND "maxQuantity" >= "minQuantity");

ALTER TABLE "Package"
  ADD CONSTRAINT "Package_minQuantity_check" CHECK ("minQuantity" >= 1),
  ADD CONSTRAINT "Package_maxQuantity_check"
    CHECK ("maxQuantity" IS NULL OR "maxQuantity" >= "minQuantity"),
  ADD CONSTRAINT "Package_duration_check"
    CHECK ("duration" IS NULL OR "duration" >= 1);
