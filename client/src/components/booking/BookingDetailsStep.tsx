import { Store, Truck } from "lucide-react";
import type { ReactNode } from "react";

import type { BookingDetails, FulfilmentMethod } from "../../lib/bookings";
import { cn } from "../../lib/cn";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { StepHeading } from "./BookingItemsStep";

export function BookingDetailsStep({
  details,
  errors,
  onChange,
}: {
  details: BookingDetails;
  errors: Partial<Record<keyof BookingDetails, string>>;
  onChange: <K extends keyof BookingDetails>(field: K, value: BookingDetails[K]) => void;
}) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="booking-details-heading"
    >
      <StepHeading
        number={3}
        id="booking-details-heading"
        title="Delivery and contact"
        description="Tell us where the setup goes and how to reach you."
      />

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-slate-900">How should it arrive?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <FulfilmentOption
            value="DELIVERY"
            selected={details.fulfilmentMethod}
            onSelect={(method) => onChange("fulfilmentMethod", method)}
            icon={Truck}
            title="Deliver to my venue"
            description="We arrange transport. The charge is confirmed with you."
          />
          <FulfilmentOption
            value="COLLECTION"
            selected={details.fulfilmentMethod}
            onSelect={(method) => onChange("fulfilmentMethod", method)}
            icon={Store}
            title="I will collect"
            description="Pick the items up and return them after the hire."
          />
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          htmlFor="booking-name"
          error={errors.name}
          required
        >
          <Input
            id="booking-name"
            value={details.name}
            onChange={(event) => onChange("name", event.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "booking-name-error" : undefined}
            placeholder="e.g. Amina Otieno"
          />
        </Field>

        <Field
          label="Phone or WhatsApp"
          htmlFor="booking-phone"
          error={errors.phone}
          required
        >
          <Input
            id="booking-phone"
            value={details.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "booking-phone-error" : undefined}
            placeholder="07xx xxx xxx"
          />
        </Field>

        <Field
          label="Email"
          htmlFor="booking-email"
          error={errors.email}
          hint="Optional — useful for a written copy."
          className="sm:col-span-2"
        >
          <Input
            id="booking-email"
            type="email"
            value={details.email}
            onChange={(event) => onChange("email", event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "booking-email-error" : undefined}
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <div className="mt-4">
        {details.fulfilmentMethod === "DELIVERY" ? (
          <Field
            label="Delivery address"
            htmlFor="booking-dropoff"
            error={errors.dropoffAddress}
            hint="Include the estate, street and any gate instructions."
            required
          >
            <Textarea
              id="booking-dropoff"
              value={details.dropoffAddress}
              onChange={(event) => onChange("dropoffAddress", event.target.value)}
              autoComplete="street-address"
              aria-invalid={Boolean(errors.dropoffAddress)}
              aria-describedby={errors.dropoffAddress ? "booking-dropoff-error" : undefined}
              placeholder="Where should the setup be delivered?"
              className="min-h-20"
            />
          </Field>
        ) : (
          <Field
            label="Collection address"
            htmlFor="booking-pickup"
            error={errors.pickupAddress}
            hint="Where will the items be collected from?"
            required
          >
            <Textarea
              id="booking-pickup"
              value={details.pickupAddress}
              onChange={(event) => onChange("pickupAddress", event.target.value)}
              aria-invalid={Boolean(errors.pickupAddress)}
              aria-describedby={errors.pickupAddress ? "booking-pickup-error" : undefined}
              placeholder="Collection point or your address"
              className="min-h-20"
            />
          </Field>
        )}
      </div>

      <div className="mt-4">
        <Field
          label="Anything we should know?"
          htmlFor="booking-notes"
          error={errors.notes}
          hint={`${details.notes.length}/2000 — setup notes, timings, gate access.`}
        >
          <Textarea
            id="booking-notes"
            value={details.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            maxLength={2000}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? "booking-notes-error" : undefined}
            placeholder="For example: the party starts at 2pm, the gate is on the left."
          />
        </Field>
      </div>

      <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        We use these details only to confirm this request. Sending it does not confirm the
        booking or take payment — the owner will be in touch.
      </p>
    </section>
  );
}

function FulfilmentOption({
  value,
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  value: FulfilmentMethod;
  selected: FulfilmentMethod;
  onSelect: (method: FulfilmentMethod) => void;
  icon: typeof Truck;
  title: string;
  description: string;
}) {
  const isSelected = selected === value;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-brand-300 focus-within:ring-offset-2",
        isSelected
          ? "border-brand-300 bg-brand-50 ring-1 ring-brand-200"
          : "border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/40",
      )}
    >
      <input
        type="radio"
        name="fulfilment-method"
        value={value}
        checked={isSelected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
          isSelected ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="flex items-baseline gap-1">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-blush-600">
            *
          </span>
        ) : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
