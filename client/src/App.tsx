import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import HomePage from './pages/public/HomePage'
import EquipmentPage from './pages/public/EquipmentPage'
import EquipmentDetailPage from './pages/public/EquipmentDetailPage'
import PackagesPage from './pages/public/PackagesPage'
import PackageDetailPage from './pages/public/PackageDetailPage'
import OffersPage from './pages/public/OffersPage'
import ContactPage from './pages/public/ContactPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import { AdminSessionLoading } from './components/admin/AdminSessionLoading'
import { RequireAdmin } from './components/admin/RequireAdmin'

// Reference page, kept out of the main bundle because it pulls the full select primitive.
const StyleGuidePage = lazy(() => import('./pages/StyleGuidePage'))
// The booking form pulls zod and the full form/calendar surface; load it on demand.
const BookingPage = lazy(() => import('./pages/public/BookingPage'))
const BookingStatusPage = lazy(() => import('./pages/public/BookingStatusPage'))
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminResetPasswordPage = lazy(
  () => import('./pages/admin/AdminResetPasswordPage'),
)
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'))
const AdminBookingDetailPage = lazy(() => import('./pages/admin/AdminBookingDetailPage'))
const AdminCataloguePage = lazy(() => import('./pages/admin/AdminCataloguePage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/:slug" element={<EquipmentDetailPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/packages/:slug" element={<PackageDetailPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route
          path="/booking"
          element={
            <Suspense
              fallback={
                <div className="mx-auto max-w-6xl px-4 py-10">
                  <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
                  <span className="sr-only">Loading the booking form…</span>
                </div>
              }
            >
              <BookingPage />
            </Suspense>
          }
        />
        <Route
          path="/booking/status"
          element={
            <Suspense
              fallback={
                <div className="mx-auto max-w-6xl px-4 py-10">
                  <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
                  <span className="sr-only">Loading booking status…</span>
                </div>
              }
            >
              <BookingStatusPage />
            </Suspense>
          }
        />
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/style-guide"
          element={
            <Suspense
              fallback={
                <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500">
                  Loading style guide…
                </div>
              }
            >
              <StyleGuidePage />
            </Suspense>
          }
        />
      </Route>

      <Route path="/admin">
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="login"
          element={
            <Suspense fallback={<AdminSessionLoading label="Loading sign in…" />}>
              <AdminLoginPage />
            </Suspense>
          }
        />
        <Route
          path="reset-password"
          element={
            <Suspense fallback={<AdminSessionLoading label="Loading password reset…" />}>
              <AdminResetPasswordPage />
            </Suspense>
          }
        />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route
              path="bookings"
              element={
                <Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true">
                      <span className="sr-only">Loading bookings…</span>
                    </div>
                  }
                >
                  <AdminBookingsPage />
                </Suspense>
              }
            />
            <Route
              path="bookings/:id"
              element={
                <Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true">
                      <span className="sr-only">Loading booking…</span>
                    </div>
                  }
                >
                  <AdminBookingDetailPage />
                </Suspense>
              }
            />
            <Route
              path="catalogue"
              element={
                <Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true">
                      <span className="sr-only">Loading catalogue…</span>
                    </div>
                  }
                >
                  <AdminCataloguePage />
                </Suspense>
              }
            />
            <Route path="settings"
              element={
                <Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true">
                      <span className="sr-only">Loading settings…</span>
                    </div>
                  }
                >
                  <AdminSettingsPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
