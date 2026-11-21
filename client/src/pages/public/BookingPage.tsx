import { ArrowRight, ClipboardCheck, LifeBuoy, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AvailabilityCalendar } from "../../components/availability/AvailabilityCalendar";
import { BookingDetailsStep } from "../../components/booking/BookingDetailsStep";
import { BookingEstimate } from "../../components/booking/BookingEstimate";
import { BookingItemsStep, StepHeading } from "../../components/booking/BookingItemsStep";
import { BookingSuccess } from "../../components/booking/BookingSuccess";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import { useCalendarForDemands, useSelectionAvailability } from "../../hooks/use-availability";
import {
  useBookingQuote,
  useCreateBooking,
} from "../../hooks/use-bookings";
import { useEquipmentList } from "../../hooks/use-catalogue";
import { usePackages } from "../../hooks/use-packages";
import { useSite } from "../../hooks/use-site";
import { isApiError } from "../../lib/api";
import {
  BookingValidationError,
  bookingDetailsSchema,
  hasValidRentalDates,
  serverFieldErrors,
  type BookingDetails,
  type BookingQuoteRequest,
} from "../../lib/bookings";
import { currentMonth, todayCalendarDate } from "../../lib/dates";

const EMPTY_DETAILS: BookingDetails = {
  name: "",
  phone: "",
  email: "",
  fulfilmentMethod: "DELIVERY",
  dropoffAddress: "",
  pickupAddress: "",
  notes: "",
};

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const packageSlug = searchParams.get("package")?.trim() ?? "";
  const equipmentSlug = searchParams.get("equipment")?.trim() ?? "";
  const seedKey = `${packageSlug}|${equipmentSlug}`;

  const packagesQuery = usePackages();
  const catalogueQuery = useEquipmentList({ page: 1, pageSize: 100 });
  const site = useSite();
  const currency = site.data?.currency ?? "KES";

  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageQuantity, setPackageQuantity] = useState(1);
  const [equipmentQuantities, setEquipmentQuantities] = useState<Record<string, number>>({});
  const [month, setMonth] = useState(currentMonth());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [details, setDetails] = useState<BookingDetails>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof BookingDetails, string>>
  >({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [seedNote, setSeedNote] = useState("");
  const seededKey = useRef("");

  const packages = packagesQuery.data ?? [];
  const equipment = catalogueQuery.data?.items ?? [];
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);

  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment],
  );
  const equipmentBySlug = useMemo(
    () => new Map(equipment.map((item) => [item.slug, item])),
    [equipment],
  );

  const includedUnits = useMemo(() => {
    const included: Record<string, number> = {};
    if (!selectedPackage) {
      return included;
    }
    for (const item of selectedPackage.items) {
      const match = equipmentBySlug.get(item.equipment.slug);
      if (match) {
        included[match.id] = (included[match.id] ?? 0) + item.quantity * packageQuantity;
      }
    }
    return included;
  }, [equipmentBySlug, packageQuantity, selectedPackage]);

  const unresolvedPackageItems = useMemo(() => {
    if (!selectedPackage) {
      return [];
    }
    return selectedPackage.items
      .filter((item) => !equipmentBySlug.has(item.equipment.slug))
      .map((item) => item.equipment.name);
  }, [equipmentBySlug, selectedPackage]);

  const requiredUnits = useMemo(() => {
    const required: Record<string, number> = { ...includedUnits };
    for (const [equipmentId, quantity] of Object.entries(equipmentQuantities)) {
      if (quantity > 0) {
        required[equipmentId] = Math.max(required[equipmentId] ?? 0, quantity);
      }
    }
    return required;
  }, [equipmentQuantities, includedUnits]);

  const demands = useMemo(
    () =>
      Object.entries(requiredUnits)
        .filter(([, quantity]) => quantity > 0)
        .map(([equipmentId, quantity]) => ({
          equipmentId,
          name: equipmentById.get(equipmentId)?.name ?? "Equipment item",
          requiredUnits: quantity,
        })),
    [equipmentById, requiredUnits],
  );

  const hasExtras = Object.values(equipmentQuantities).some((quantity) => quantity > 0);
  const hasItems = selectedPackageId !== "" || hasExtras;
  const validDates = hasValidRentalDates(startDate, endDate);

  useEffect(() => {
    if (!packagesQuery.data || !catalogueQuery.data) {
      return;
    }
    if (seededKey.current === seedKey) {
      return;
    }
    seededKey.current = seedKey;

    const matchedPackage = packageSlug
      ? packagesQuery.data.find((pkg) => pkg.slug === packageSlug)
      : undefined;
    const matchedEquipment = equipmentSlug
      ? catalogueQuery.data.items.find((item) => item.slug === equipmentSlug)
      : undefined;

    setSelectedPackageId(matchedPackage?.id ?? "");
    setPackageQuantity(1);
    const seedQuantity = matchedEquipment
      ? Math.min(
          Math.max(1, matchedEquipment.minQuantity),
          matchedEquipment.maxQuantity,
        )
      : 0;
    setEquipmentQuantities(
      matchedEquipment && seedQuantity > 0 ? { [matchedEquipment.id]: seedQuantity } : {},
    );

    const missing: string[] = [];
    if (packageSlug && !matchedPackage) {
      missing.push("package");
    }
    if (equipmentSlug && !matchedEquipment) {
      missing.push("equipment item");
    }
    setSeedNote(
      missing.length > 0
        ? `The ${missing.join(" and ")} from that link is no longer available. Choose a current option below.`
        : "",
    );
  }, [catalogueQuery.data, equipmentSlug, packageSlug, packagesQuery.data, seedKey]);

  const unitLabel =
    selectedPackage && !hasExtras ? "package" : demands.length > 1 ? "setup" : "unit";

  const calendar = useCalendarForDemands(demands, month);

  const quoteRequest = useMemo<BookingQuoteRequest | null>(() => {
    if (!hasItems || !validDates) {
      return null;
    }
    return {
      startDate,
      endDate,
      packages:
        selectedPackageId !== ""
          ? [{ packageId: selectedPackageId, quantity: packageQuantity }]
          : [],
      equipment: Object.entries(equipmentQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([equipmentId, quantity]) => ({ equipmentId, quantity })),
    };
  }, [
    endDate,
    equipmentQuantities,
    hasItems,
    packageQuantity,
    selectedPackageId,
    startDate,
    validDates,
  ]);

  const quote = useBookingQuote(quoteRequest);
  const availability = useSelectionAvailability(
    demands.map((demand) => demand.equipmentId),
    startDate,
    endDate,
  );
  const createBooking = useCreateBooking();

  useEffect(() => {
    if (createBooking.data) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [createBooking.data]);

  const isCataloguePending = packagesQuery.isPending || catalogueQuery.isPending;
  const catalogueError = packagesQuery.error ?? catalogueQuery.error;
  const isCatalogueError =
    Boolean(catalogueError) && (!packagesQuery.data || !catalogueQuery.data);

  function choosePackage(packageId: string) {
    setSelectedPackageId(packageId);
    setPackageQuantity(1);
    setSeedNote("");
    setSubmitError(null);
  }

  function changePackageQuantity(quantity: number) {
    setPackageQuantity(quantity);
    setSubmitError(null);
  }

  function setEquipmentQuantity(equipmentId: string, quantity: number) {
    setSeedNote("");
    setSubmitError(null);
    setEquipmentQuantities((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[equipmentId];
      } else {
        next[equipmentId] = quantity;
      }
      return next;
    });
  }

  function updateDetail<K extends keyof BookingDetails>(
    field: K,
    value: BookingDetails[K],
  ) {
    setDetails((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  }

  function selectDate(date: string) {
    setSubmitError(null);
    if (startDate === "" || endDate !== "") {
      setStartDate(date);
      setEndDate("");
      return;
    }
    if (date < startDate) {
      setStartDate(date);
      return;
    }
    setEndDate(date);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!hasItems) {
      setSubmitError(
        new BookingValidationError("Add at least one package or equipment item before sending."),
      );
      return;
    }
    if (!validDates) {
      setSubmitError(new BookingValidationError("Choose a start and end date for your hire."));
      return;
    }

    const parsed = bookingDetailsSchema.safeParse(details);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof BookingDetails, string>> = {};
      for (const [field, messages] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        if (messages?.[0]) {
          nextErrors[field as keyof BookingDetails] = messages[0];
        }
      }
      setFieldErrors(nextErrors);
      setSubmitError(
        new BookingValidationError("Check the highlighted fields and try again."),
      );
      return;
    }

    const email = parsed.data.email.trim();
    createBooking.mutate(
      {
        startDate,
        endDate,
        packages:
          selectedPackageId !== ""
            ? [{ packageId: selectedPackageId, quantity: packageQuantity }]
            : [],
        equipment: Object.entries(equipmentQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([equipmentId, quantity]) => ({ equipmentId, quantity })),
        customer: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          ...(email === "" ? {} : { email }),
        },
        fulfilmentMethod: parsed.data.fulfilmentMethod,
        ...(parsed.data.fulfilmentMethod === "DELIVERY"
          ? { dropoffAddress: parsed.data.dropoffAddress }
          : { pickupAddress: parsed.data.pickupAddress }),
        ...(parsed.data.notes === "" ? {} : { notes: parsed.data.notes }),
      },
      {
        onError: (error) => {
          setSubmitError(error);
          if (isApiError(error) && error.code === "VALIDATION_ERROR") {
            setFieldErrors(serverFieldErrors(error.details));
          }
          if (isApiError(error) && error.code === "CONFLICT") {
            void availability.refetch();
            void quote.refetch();
          }
        },
      },
    );
  }

  function resetAfterSuccess() {
    createBooking.reset();
    setSubmitError(null);
    setFieldErrors({});
    setSeedNote("");
    setSelectedPackageId("");
    setPackageQuantity(1);
    setEquipmentQuantities({});
    setStartDate("");
    setEndDate("");
    setMonth(currentMonth());
    setDetails(EMPTY_DETAILS);
  }

  return (
    <div className="pb-16">
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-100 px-6 py-10 ring-1 ring-blush-100 sm:px-10 sm:py-12">
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
              Booking request
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Build your party booking
            </h1>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-600">
              Pick what you need, choose your dates, and send one request. The owner confirms
              availability, transport and the final total.
            </p>
            <Link
              to="/booking/status"
              className="mt-4 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <ClipboardCheck aria-hidden="true" className="size-4" />
              Already have a code? Check your booking status
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {createBooking.data ? (
        <BookingSuccess booking={createBooking.data} onReset={resetAfterSuccess} />
      ) : isCataloguePending ? (
        <BookingFormSkeleton />
      ) : isCatalogueError ? (
        <section className="mx-auto mt-8 max-w-6xl px-4">
          <ErrorState
            title="The catalogue could not load"
            error={catalogueError}
            onRetry={() => {
              void packagesQuery.refetch();
              void catalogueQuery.refetch();
            }}
            isRetrying={packagesQuery.isFetching || catalogueQuery.isFetching}
          />
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            // Enter in a single-line field should not send a long request by accident.
            if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
              event.preventDefault();
            }
          }}
          noValidate
          className="mx-auto mt-8 max-w-6xl px-4"
          aria-label="Booking request form"
        >
          {seedNote ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {seedNote}
            </p>
          ) : null}
          {unresolvedPackageItems.length > 0 ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This package includes {unresolvedPackageItems.join(", ")}, which is not in the
              current catalogue. We can still price the rest, but mention it in your notes
              so the owner can check.
            </p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="space-y-5">
              <BookingItemsStep
                packages={packages}
                equipment={equipment}
                selectedPackageId={selectedPackageId}
                packageQuantity={packageQuantity}
                onPackageChange={choosePackage}
                onPackageQuantityChange={changePackageQuantity}
                equipmentQuantities={equipmentQuantities}
                onEquipmentQuantityChange={setEquipmentQuantity}
                includedUnits={includedUnits}
                currency={currency}
              />

              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                aria-labelledby="booking-dates-heading"
              >
                <StepHeading
                  number={2}
                  id="booking-dates-heading"
                  title="Pick your rental dates"
                  description="The calendar reflects everything currently in your selection."
                />

                {!hasItems ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    Add a package or some equipment above and the calendar will appear here.
                  </div>
                ) : calendar.isError ? (
                  <ErrorState
                    className="mt-6"
                    title="The calendar could not load"
                    error={calendar.error}
                    onRetry={() => void calendar.refetch()}
                    isRetrying={calendar.isFetching}
                  />
                ) : (
                  <div className="mt-6">
                    <AvailabilityCalendar
                      month={month}
                      today={todayCalendarDate()}
                      days={calendar.days}
                      isPending={calendar.isPending}
                      startDate={startDate}
                      endDate={endDate}
                      unitLabel={unitLabel}
                      onMonthChange={setMonth}
                      onSelectDate={selectDate}
                    />
                  </div>
                )}
              </section>

              <BookingDetailsStep
                details={details}
                errors={fieldErrors}
                onChange={updateDetail}
              />
            </div>

            <div className="space-y-4 lg:sticky lg:top-6">
              <BookingEstimate
                startDate={startDate}
                endDate={endDate}
                quote={quote.data}
                quotePending={quoteRequest !== null && quote.isPending}
                quoteError={quote.error}
                onRetryQuote={() => void quote.refetch()}
                isRetryingQuote={quote.isFetching}
                availability={availability.data}
                availabilityPending={
                  validDates && hasItems && availability.isPending
                }
                availabilityError={availability.error}
                requiredUnits={requiredUnits}
                onRetryAvailability={() => void availability.refetch()}
                isRetryingAvailability={availability.isFetching}
                currency={currency}
                canSubmit={
                  Boolean(quote.data) &&
                  !quote.isError &&
                  !quote.isFetching &&
                  !createBooking.isPending &&
                  hasItems &&
                  validDates
                }
                isSubmitting={createBooking.isPending}
                submitError={submitError}
                hasItems={hasItems}
              />

              <div className="rounded-2xl border border-blush-100 bg-blush-50/60 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-blush-700 ring-1 ring-blush-100">
                  <LifeBuoy aria-hidden="true" className="size-5" />
                </span>
                <h2 className="mt-3 text-sm font-semibold text-slate-900">
                  Not sure what fits?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Tell us about the venue and the day — we can suggest a setup or check a
                  combination that is not listed.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/contact">
                    Talk to us
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function BookingFormSkeleton() {
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4" aria-busy="true">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-[430px] w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
      <span className="sr-only">Loading the booking form…</span>
    </section>
  );
}
