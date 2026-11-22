import type { BookingStatus, PaymentStatus } from "../../../lib/bookings";
import { adminStatusMeta, paymentStatusMeta } from "../../../lib/admin-bookings";
import type { PaymentRowStatus } from "../../../lib/admin-payments";
import { paymentRowStatusMeta } from "../../../lib/admin-payments";
import { Badge } from "../../ui/badge";

export function AdminBookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const meta = adminStatusMeta[status];
  return (
    <Badge variant={meta.badge} className={className}>
      {meta.label}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const meta = paymentStatusMeta[status];
  return (
    <Badge variant={meta.badge} className={className}>
      {meta.label}
    </Badge>
  );
}

export function PaymentRowStatusBadge({
  status,
  className,
}: {
  status: PaymentRowStatus;
  className?: string;
}) {
  const meta = paymentRowStatusMeta[status];
  return (
    <Badge variant={meta.badge} className={className}>
      {meta.label}
    </Badge>
  );
}
