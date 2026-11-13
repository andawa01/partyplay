export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">Business overview coming soon.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {['Bookings', 'Equipment', 'Revenue'].map((label) => (
          <div key={label} className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
