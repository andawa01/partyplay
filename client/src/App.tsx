import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import HomePage from './pages/public/HomePage'
import EquipmentPage from './pages/public/EquipmentPage'
import PackagesPage from './pages/public/PackagesPage'
import OffersPage from './pages/public/OffersPage'
import BookingPage from './pages/public/BookingPage'
import ContactPage from './pages/public/ContactPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import NotFoundPage from './pages/NotFoundPage'

// Reference page, kept out of the main bundle because it pulls the full select primitive.
const StyleGuidePage = lazy(() => import('./pages/StyleGuidePage'))

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/booking" element={<BookingPage />} />
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
        <Route element={<AdminLayout />}>
          <Route path="login" element={<AdminLoginPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
