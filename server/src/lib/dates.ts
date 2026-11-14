import { badRequest } from "./api-error";

/**
 * Rental dates are calendar dates, never instants. Everything here works in UTC midnight
 * so a date cannot shift by a day when it crosses a timezone; the only local concept is
 * "today in Nairobi", which decides whether a requested date has already passed.
 */
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const NAIROBI_TIME_ZONE = "Africa/Nairobi";
const MS_PER_DAY = 86_400_000;

/** Parses `YYYY-MM-DD` into a Date at UTC midnight. Rejects impossible dates like 2026-02-31. */
export function parseCalendarDate(value: string): Date {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) {
    throw badRequest(`Expected a calendar date as YYYY-MM-DD, received "${value}"`, { value });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls 2026-02-31 forward to 2026-03-03; the round trip exposes that.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw badRequest(`"${value}" is not a real calendar date`, { value });
  }

  return date;
}

/** Formats a Date as `YYYY-MM-DD`, using its UTC calendar day. */
export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Number of rental days, inclusive of both endpoints: 20 Oct to 22 Oct is 3 days.
 * Throws a 400 if the range is inverted.
 */
export function rentalDays(startDate: Date, endDate: Date): number {
  const start = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);

  if (end.getTime() < start.getTime()) {
    throw badRequest("endDate must be on or after startDate", {
      startDate: formatCalendarDate(start),
      endDate: formatCalendarDate(end),
    });
  }

  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

/**
 * Today's calendar date in Africa/Nairobi, as a Date at UTC midnight. Nairobi is UTC+3
 * with no DST, so this is the date a customer sitting in Kenya would call today.
 */
export function todayInNairobi(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type: "year" | "month" | "day") =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return parseCalendarDate(`${part("year")}-${part("month")}-${part("day")}`);
}

/** True when the given calendar date is before today in Nairobi. */
export function isPastDate(date: Date, today: Date = todayInNairobi()): boolean {
  return startOfUtcDay(date).getTime() < startOfUtcDay(today).getTime();
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
