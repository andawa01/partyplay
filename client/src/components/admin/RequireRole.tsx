import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAdminSession } from "../../hooks/use-auth";
import type { AdminRole } from "../../lib/auth";
import { AdminSessionLoading } from "./AdminSessionLoading";

/**
 * Sits inside `RequireAdmin`, so a session is already known. A signed-in account whose
 * role is not allowed is sent to the dashboard rather than shown an error page; the
 * navigation hides those links too, but a typed URL still needs the guard.
 */
export function RequireRole({ roles, children }: { roles: AdminRole[]; children: ReactNode }) {
  const session = useAdminSession();

  if (session.isPending) {
    return <AdminSessionLoading />;
  }

  const role = session.data?.role;
  if (!role || !roles.includes(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
