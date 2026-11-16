/**
 * Rental dates are calendar strings `YYYY-MM-DD`. All helpers here treat the value as a
 * UTC midnight instant so a date can never roll a day because of the browser timezone.
 */

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

export function todayCalendarDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NAIROBI_TIME_ZONE }).format(
    new Date(),
  );
}

export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function formatLongDate(value: string): string {
  if (!isValidCalendarDate(value)) {
    return value;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function addDays(value: string, days: number): string {
  if (!isValidCalendarDate(value)) {
    return value;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
