import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  min = 1,
  max,
  label,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const clampedMax = Math.max(min, max);

  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-sm"
      role="group"
      aria-label={`Quantity for ${label}`}
    >
      <button
        type="button"
        aria-label={`Decrease ${label} quantity`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-9 place-items-center rounded-l-lg text-slate-600 transition hover:bg-brand-50 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus aria-hidden="true" className="size-3.5" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold text-slate-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label} quantity`}
        disabled={value >= clampedMax}
        onClick={() => onChange(Math.min(clampedMax, value + 1))}
        className="grid size-9 place-items-center rounded-r-lg text-slate-600 transition hover:bg-brand-50 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Plus aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}
