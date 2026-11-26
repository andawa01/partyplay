import {
  ArrowUpRight,
  CalendarDays,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";

import { SocialLinks } from "../../components/site/SocialLinks";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import { useSite } from "../../hooks/use-site";
import { formatPhone, mailtoHref, siteSocialLinks, telHref, whatsAppHref } from "../../lib/site";

const cardClass =
  "group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300";

function IconBadge({ icon: Icon }: { icon: typeof Phone }) {
  return (
    <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-100">
      <Icon aria-hidden="true" className="size-5" />
    </span>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cardClass}
    >
      <IconBadge icon={icon} />
      <span className="mt-5 text-sm font-medium text-slate-500">{label}</span>
      <span className="mt-1 flex items-center justify-between gap-3">
        <span className="break-words text-lg font-semibold text-slate-900">{value}</span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700"
        />
      </span>
      {external ? <span className="sr-only">(opens in a new tab)</span> : null}
    </a>
  );
}

function ContactPageSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
      <div className="rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-100 p-8 ring-1 ring-blush-100 sm:p-12">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="mt-5 h-11 w-full max-w-md" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-sm" />
        <div className="mt-7 flex gap-3">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-36" />
        </div>
      </div>
      <Skeleton className="mt-10 h-6 w-44" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="rounded-2xl border border-slate-200 bg-white p-6">
            <Skeleton className="size-11 rounded-xl" />
            <Skeleton className="mt-5 h-3 w-16" />
            <Skeleton className="mt-2 h-5 w-2/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading contact details…</span>
    </section>
  );
}

export default function ContactPage() {
  const { data: site, isPending, isError, error, refetch, isFetching } = useSite();

  if (isPending) {
    return <ContactPageSkeleton />;
  }

  if (isError && !site) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-100 p-8 ring-1 ring-blush-100 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Contact</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
            We are almost reachable
          </h1>
          <p className="mt-3 max-w-xl text-lg text-slate-600">
            We could not load the contact details just now. Try again in a moment, or use the
            booking page to send a request.
          </p>
        </div>
        <ErrorState
          className="mt-6"
          title="Contact details are unavailable"
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </section>
    );
  }

  if (!site) {
    return null;
  }

  const hasDetails = Boolean(
    site.contactPhone || site.contactWhatsApp || site.contactEmail || site.address,
  );
  const hasSocials = siteSocialLinks(site).length > 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-100 px-6 py-12 ring-1 ring-blush-100 sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-blush-200/60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-brand-100/70 blur-3xl"
        />

        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 ring-1 ring-brand-100">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Contact
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Let&apos;s plan your party
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
            {site.aboutText ??
              "Bouncy castles, sound systems, tables and chairs — tell us what the day needs and we will help you build it."}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/booking">
                <CalendarDays aria-hidden="true" className="size-4" />
                Start a booking
              </Link>
            </Button>
            {site.contactWhatsApp ? (
              <Button asChild variant="secondary" size="lg">
                <a href={whatsAppHref(site.contactWhatsApp)} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden="true" className="size-4" />
                  WhatsApp us
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            ) : null}
            {site.contactPhone ? (
              <Button asChild variant="outline" size="lg">
                <a href={telHref(site.contactPhone)}>
                  <Phone aria-hidden="true" className="size-4" />
                  Call us
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Ways to reach us</h2>
          <p className="mt-1 text-slate-600">
            Pick whichever is easiest — we answer calls, WhatsApp and email through the day.
          </p>
        </div>
      </div>

      {hasDetails ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {site.contactPhone ? (
            <ContactCard
              icon={Phone}
              label="Phone"
              value={formatPhone(site.contactPhone)}
              href={telHref(site.contactPhone)}
            />
          ) : null}
          {site.contactWhatsApp ? (
            <ContactCard
              icon={MessageCircle}
              label="WhatsApp"
              value={formatPhone(site.contactWhatsApp)}
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
            <div className={cardClass}>
              <IconBadge icon={MapPin} />
              <span className="mt-5 text-sm font-medium text-slate-500">Address</span>
              <span className="mt-1 text-lg font-semibold text-slate-900">{site.address}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-4 rounded-2xl border border-dashed border-blush-300 bg-blush-50 p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-blush-700 ring-1 ring-blush-200">
            <MessageCircle aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">Contact details are on the way</p>
            <p className="mt-1 text-sm text-slate-600">
              Phone, WhatsApp, email and address are being updated. Send a booking request in the
              meantime and we will reply with the details.
            </p>
            <Button asChild variant="link" className="mt-2 h-auto px-0">
              <Link to="/booking">Start a booking</Link>
            </Button>
          </div>
        </div>
      )}

      {site.transportProviders.length > 0 ? (
        <section className="mt-12" aria-labelledby="transport-heading">
          <h2
            id="transport-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            Transport partners
          </h2>
          <p className="mt-1 text-slate-600">
            Independent providers who can move equipment to your venue.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {site.transportProviders.map((provider) => (
              <div
                key={provider.phone}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
                  <Truck aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-5 text-lg font-semibold text-slate-900">{provider.name}</p>
                {provider.serviceArea ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin aria-hidden="true" className="size-4 text-slate-400" />
                    {provider.serviceArea}
                  </p>
                ) : null}
                <Button asChild variant="outline" size="sm" className="mt-5 self-start">
                  <a href={telHref(provider.phone)}>
                    <Phone aria-hidden="true" className="size-3.5" />
                    {provider.phone}
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasSocials ? (
        <section className="mt-12 border-t border-blush-100 pt-8" aria-labelledby="social-heading">
          <h2
            id="social-heading"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500"
          >
            Follow the setup
          </h2>
          <SocialLinks site={site} className="mt-3" />
        </section>
      ) : null}
    </section>
  );
}
