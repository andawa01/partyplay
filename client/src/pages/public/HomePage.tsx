import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-slate-900">
        Make every party unforgettable
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Bouncing castles, sound systems, tables and chairs for hire in Kenya.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          to="/equipment"
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500"
        >
          Browse equipment
        </Link>
        <Link
          to="/booking"
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          Book now
        </Link>
      </div>
    </section>
  )
}
