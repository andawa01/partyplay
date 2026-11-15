-- Migration 5 — booking domain fixes (D1, D3, D4)
--
-- D1: BookingStatus becomes PENDING, CONFIRMED, REJECTED, CANCELLED, COMPLETED, EXPIRED.
--     PostgreSQL cannot drop an enum value in place, so the type is rebuilt. The table is
--     empty at this point (F6b creates the first booking), so the cast maps APPROVED to
--     CONFIRMED and cannot lose a row.
--
-- The CHECK constraints from migration 4 do not reference the status enum, so they
-- survive the column type change untouched.

-- ---------------------------------------------------------------------------
-- D1: rebuild BookingStatus
-- ---------------------------------------------------------------------------
CREATE TYPE "BookingStatus_new" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
  'EXPIRED'
);

ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Booking"
  ALTER COLUMN "status" TYPE "BookingStatus_new"
  USING (
    CASE "status"::text WHEN 'APPROVED' THEN 'CONFIRMED' ELSE "status"::text END
  )::"BookingStatus_new";

-- The history rows use the same enum; fromStatus is nullable, which the CASE preserves.
ALTER TABLE "BookingStatusHistory"
  ALTER COLUMN "fromStatus" TYPE "BookingStatus_new"
  USING (
    CASE "fromStatus"::text WHEN 'APPROVED' THEN 'CONFIRMED' ELSE "fromStatus"::text END
  )::"BookingStatus_new";

ALTER TABLE "BookingStatusHistory"
  ALTER COLUMN "toStatus" TYPE "BookingStatus_new"
  USING (
    CASE "toStatus"::text WHEN 'APPROVED' THEN 'CONFIRMED' ELSE "toStatus"::text END
  )::"BookingStatus_new";

DROP TYPE "BookingStatus";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- ---------------------------------------------------------------------------
-- D3: one pricing method per equipment
-- ---------------------------------------------------------------------------
CREATE TYPE "PricingMode" AS ENUM ('PER_DAY', 'FLAT');

-- Existing rows are daily-priced except the seed's flat items, which the seed sets
-- explicitly; PER_DAY is the safe default for anything created before this point.
ALTER TABLE "Equipment"
  ADD COLUMN "pricingMode" "PricingMode" NOT NULL DEFAULT 'PER_DAY';

-- ---------------------------------------------------------------------------
-- D4: delivery or collection
-- ---------------------------------------------------------------------------
CREATE TYPE "FulfilmentMethod" AS ENUM ('DELIVERY', 'COLLECTION');

ALTER TABLE "Booking"
  ADD COLUMN "fulfilmentMethod" "FulfilmentMethod" NOT NULL DEFAULT 'COLLECTION';
