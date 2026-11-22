import type { BookingStatus, PaymentStatus } from "../../../lib/bookings";
import { adminStatusMeta, paymentStatusMeta } from "../../../lib/admin-bookings";
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
