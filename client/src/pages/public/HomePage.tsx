import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-slate-900">
        Make every <span className="text-brand-600">party</span> unforgettable
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Bouncing castles, sound systems, tables and chairs for hire in Kenya.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          to="/equipment"
          className="rounded-lg bg-brand-700 px-6 py-3 font-medium text-white hover:bg-brand-800"
        >
          Browse equipment
        </Link>
        <Link
          to="/booking"
          className="rounded-lg border border-blush-200 bg-white px-6 py-3 font-medium text-blush-800 hover:bg-blush-50"
        >
          Book now
        </Link>
      </div>
    </section>
  )
}
