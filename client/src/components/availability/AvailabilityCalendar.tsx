import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarDay } from "../../lib/availability";
import { cn } from "../../lib/cn";
import {
  addMonths,
  formatLongDate,
  formatMonthLabel,
  monthCells,
} from "../../lib/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AvailabilityCalendar({
  month,
  today,
  days,
  isPending,
  startDate,
  endDate,
  unitLabel,
  onMonthChange,
  onSelectDate,
}: {
  month: string;
  today: string;
  days: CalendarDay[];
  isPending: boolean;
  startDate: string;
  endDate: string;
  unitLabel: "unit" | "package" | "setup";
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const cells = monthCells(month);
  const byDate = new Map(days.map((day) => [day.date, day]));
  const canGoBack = month > today.slice(0, 7);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="availability-calendar-heading"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Pick your dates
          </h2>
          <p className="mt-1 text-sm text-slate-600" aria-live="polite">
            {isPending
              ? "Loading the booking diary…"
              : startDate === ""
                ? "Start with the first day of your hire."
                : endDate === ""
                  ? "Now choose the last day."
                  : "Dates selected — check the summary, or pick a new first day."}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            aria-label="Previous month"
            disabled={!canGoBack}
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="grid size-8 place-items-center rounded-full text-slate-600 transition hover:bg-brand-50 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <span className="min-w-32 text-center text-sm font-semibold text-slate-900">
            {formatMonthLabel(month)}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="grid size-8 place-items-center rounded-full text-slate-600 transition hover:bg-brand-50 hover:text-brand-800"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div
        className="mt-5"
        role="group"
        aria-busy={isPending}
        aria-labelledby="availability-calendar-heading"
      >
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((label) => (
            <span
              key={label}
              aria-hidden="true"
              className="py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400"
            >
              {label}
            </span>
          ))}

          {cells.map((date, index) => {
            if (date === null) {
              return <span key={`blank-${index}`} aria-hidden="true" />;
            }

            const day = byDate.get(date);
            const isPast = date < today;
            const isFullyBooked = !isPending && day !== undefined && day.available <= 0;
            const isUnavailable = isPast || isFullyBooked || day === undefined;
            const isStart = date === startDate;
            const isEnd = date === endDate;
            const isEndpoint = isStart || isEnd;
            const isInRange =
              startDate !== "" &&
              endDate !== "" &&
              date > startDate &&
              date < endDate;

            const unavailableReason = isPast
              ? "Past date"
              : isPending
                ? "Loading availability"
                : isFullyBooked
                  ? `Fully booked — no ${unitLabel}s free`
                  : "Availability unknown";

            return (
              <button
                key={date}
                type="button"
                disabled={isUnavailable}
                onClick={() => onSelectDate(date)}
                aria-current={date === today ? "date" : undefined}
                aria-pressed={isEndpoint}
                aria-label={
                  isUnavailable
                    ? `${formatLongDate(date)} — ${unavailableReason}`
                    : `${formatLongDate(date)} — ${day?.available ?? 0} ${unitLabel}${
                        (day?.available ?? 0) === 1 ? "" : "s"
                      } free${isEndpoint ? ", selected" : ""}`
                }
                title={isUnavailable ? unavailableReason : undefined}
                className={cn(
                  "relative grid h-10 place-items-center rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 sm:h-11",
                  isPending &&
                    !isEndpoint &&
                    "animate-pulse cursor-wait bg-slate-50 text-slate-300",
                  date === today &&
                    !isEndpoint &&
                    !isInRange &&
                    "ring-1 ring-brand-300",
                  isEndpoint &&
                    "bg-brand-700 text-white shadow-sm hover:bg-brand-800",
                  !isEndpoint &&
                    isInRange &&
                    "bg-brand-50 text-brand-900 hover:bg-brand-100",
                  !isEndpoint &&
                    !isInRange &&
                    !isUnavailable &&
                    "text-slate-700 hover:bg-blush-50 hover:text-blush-800",
                  isPast && "cursor-not-allowed text-slate-300",
                  !isPast &&
                    isFullyBooked &&
                    "cursor-not-allowed bg-slate-50 text-slate-400 line-through decoration-slate-300",
                  !isPast &&
                    !isPending &&
                    !isFullyBooked &&
                    !isUnavailable &&
                    !isEndpoint &&
                    day !== undefined &&
                    day.available <= 2 &&
                    "after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-blush-500",
                  isStart && startDate === endDate && "ring-2 ring-brand-300 ring-offset-1",
                )}
              >
                {Number(date.slice(-2))}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-brand-700" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-blush-400" />
          2 or fewer left
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="grid size-2.5 place-items-center rounded-full bg-slate-200 text-[0.5rem] text-slate-400 line-through"
          >
            ×
          </span>
          Fully booked
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Fully booked and past days cannot be selected.
      </p>
    </div>
  );
}

