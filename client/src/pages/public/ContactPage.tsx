import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { SocialLinks } from '../../components/site/SocialLinks'
import { ErrorState } from '../../components/ui/error-state'
import { Skeleton } from '../../components/ui/skeleton'
import { useSite } from '../../hooks/use-site'
import { mailtoHref, telHref, whatsAppHref } from '../../lib/site'

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Phone
  label: string
  value: string
  href: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      <span className="rounded-full bg-brand-50 p-2 text-brand-700">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-500">{label}</span>
        <span className="mt-0.5 block break-words font-medium text-slate-900">{value}</span>
        {external ? <span className="sr-only">(opens in a new tab)</span> : null}
      </span>
    </a>
  )
}

function ContactPageSkeleton() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="rounded-lg border border-slate-200 bg-white p-5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="mt-3 h-3 w-16" />
            <Skeleton className="mt-2 h-5 w-2/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading contact details…</span>
    </section>
  )
}

export default function ContactPage() {
  const { data: site, isPending, isError, error, refetch, isFetching } = useSite()

  if (isPending) {
    return <ContactPageSkeleton />
  }

  if (isError && !site) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Contact</h1>
        <ErrorState
          className="mt-6"
          title="Contact details are unavailable"
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </section>
    )
  }

  if (!site) {
    return null
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Contact {site.businessName}</h1>
      {site.aboutText ? (
        <p className="mt-3 max-w-2xl whitespace-pre-line text-slate-600">{site.aboutText}</p>
      ) : (
        <p className="mt-3 max-w-2xl text-slate-600">
          Party equipment hire in Kenya. Call, message or email us and we will help you plan
          the setup.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {site.contactPhone ? (
          <ContactCard
            icon={Phone}
            label="Phone"
            value={site.contactPhone}
            href={telHref(site.contactPhone)}
          />
        ) : null}
        {site.contactWhatsApp ? (
          <ContactCard
            icon={MessageCircle}
            label="WhatsApp"
            value={site.contactWhatsApp}
            href={whatsAppHref(site.contactWhatsApp)}
            external
          />
        ) : null}
        {site.contactEmail ? (
          <ContactCard
            icon={Mail}
            label="Email"
            value={site.contactEmail}
            href={mailtoHref(site.contactEmail)}
          />
        ) : null}
        {site.address ? (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5">
            <span className="rounded-full bg-brand-50 p-2 text-brand-700">
              <MapPin aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-500">Address</span>
              <span className="mt-0.5 block font-medium text-slate-900">{site.address}</span>
            </span>
          </div>
        ) : null}
      </div>

      {!site.contactPhone && !site.contactWhatsApp && !site.contactEmail && !site.address ? (
        <p className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Phone, WhatsApp, email and address are being updated. Please check back shortly.
        </p>
      ) : null}

      {site.transportProviders.length > 0 ? (
        <section className="mt-10" aria-labelledby="transport-heading">
          <h2 id="transport-heading" className="text-xl font-semibold text-slate-900">
            Transport partners
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Independent providers who can move equipment to your venue.
          </p>
          <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {site.transportProviders.map((provider) => (
              <li
                key={provider.phone}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{provider.name}</p>
                  {provider.serviceArea ? (
                    <p className="text-sm text-slate-600">{provider.serviceArea}</p>
                  ) : null}
                </div>
                <a
                  href={telHref(provider.phone)}
                  className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {provider.phone}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SocialLinks site={site} className="mt-10" />
    </section>
  )
}
