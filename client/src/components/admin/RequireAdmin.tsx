import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAdminSession } from "../../hooks/use-auth";
import { isApiError } from "../../lib/api";
import { ErrorState } from "../ui/error-state";
import { AdminSessionLoading } from "./AdminSessionLoading";

/**
 * The only place guarded admin routes are allowed through. A missing cookie, an expired
 * token and a deleted admin are all a 401 from `/auth/me`, so they all land on login with
 * the attempted admin URL kept in router state.
 */
export function RequireAdmin() {
  const location = useLocation();
  const session = useAdminSession();

  if (session.isPending) {
    return <AdminSessionLoading />;
  }

  if (session.isError) {
    if (isApiError(session.error) && session.error.status === 401) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="w-full max-w-lg">
          <ErrorState
            title="The admin session could not be checked"
            error={session.error}
            onRetry={() => void session.refetch()}
            isRetrying={session.isFetching}
          />
        </div>
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
