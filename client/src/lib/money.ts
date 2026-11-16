/**
 * Money arrives from the API as a decimal string with 2 dp. Keep it a string until the
 * very last moment: `Number` is only used for formatting, never for arithmetic.
 */

export function formatMoney(value: string | number, currency = "KES"): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return String(value);
  }
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function toMinorUnits(value: string | number): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  return Math.round(numeric * 100);
}
