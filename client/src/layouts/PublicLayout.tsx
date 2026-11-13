import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/packages', label: 'Packages' },
  { to: '/offers', label: 'Offers' },
  { to: '/booking', label: 'Booking' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <nav className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <NavLink to="/" className="text-xl font-bold text-indigo-600">
            PartyPlay
          </NavLink>
          <ul className="flex gap-4 text-sm font-medium">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
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
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
          © {new Date().getFullYear()} PartyPlay. Party equipment hire.
        </div>
      </footer>
    </div>
  )
}
