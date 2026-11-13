import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/equipment', label: 'Equipment' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/packages', label: 'Packages' },
  { to: '/admin/offers', label: 'Offers' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white">
        <nav className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <NavLink to="/admin/dashboard" className="text-lg font-bold">
            PartyPlay Admin
          </NavLink>
          <ul className="flex gap-4 text-sm">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    isActive ? 'text-indigo-300' : 'text-slate-300 hover:text-white'
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
