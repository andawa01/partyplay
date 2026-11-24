/**
 * Rental dates are calendar strings `YYYY-MM-DD`. All helpers here treat the value as a
 * UTC midnight instant so a date can never roll a day because of the browser timezone.
 */

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

export function todayCalendarDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NAIROBI_TIME_ZONE }).format(new Date());
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
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: NAIROBI_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

/** `YYYY-MM` for the calendar endpoint; defaults to the current month in Nairobi. */
export function currentMonth(): string {
  return todayCalendarDate().slice(0, 7);
}

/** Move a `YYYY-MM` value by whole months without involving the local timezone. */
export function addMonths(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return month;
  }
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return month;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

/**
 * One calendar month as Monday-first cells. Leading and trailing `null`s keep the grid
 * aligned without inventing dates from the neighbouring months.
 */
export function monthCells(month: string): Array<string | null> {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return [];
  }
  const firstWeekday = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: firstWeekday }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

/** Inclusive rental days, so a same-day hire still counts as one day. */
export function countCalendarDays(startDate: string, endDate: string): number {
  if (!isValidCalendarDate(startDate) || !isValidCalendarDate(endDate)) {
    return 0;
  }
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((end - start) / 86_400_000) + 1;
}
