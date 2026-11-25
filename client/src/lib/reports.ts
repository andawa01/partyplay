import { ApiError } from "./api";
import { todayCalendarDate } from "./dates";

/** Shapes returned by `/api/admin/reports` (F16). */

export interface AdminReport {
  generatedAt: string;
  currency: string;
  range: { from: string; to: string; days: number };
  revenue: {
    gross: string;
    refunded: string;
    net: string;
    paymentCount: number;
    refundCount: number;
  };
  bookings: {
    created: number;
    byStatus: Record<string, number>;
  };
  monthly: Array<{
    month: string;
    gross: string;
    refunded: string;
    net: string;
    bookings: number;
  }>;
  equipment: Array<{
    equipmentId: string;
    name: string;
    isActive: boolean;
    inventory: number;
    bookings: number;
    bookedUnitDays: number;
    capacityUnitDays: number;
    utilisation: number;
  }>;
}

export type ReportRange = { from: string; to: string };
export type ReportExportType = "bookings" | "payments";

/** The current Nairobi month so far, matching the server's default report range. */
export function defaultReportRange(): ReportRange {
  const today = todayCalendarDate();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

export function reportExportPath(type: ReportExportType, range: ReportRange): string {
  const params = new URLSearchParams({ type, from: range.from, to: range.to });
  return `/api/admin/reports/export?${params.toString()}`;
}

/**
 * CSV is fetched separately from `apiFetch` because it must stay a blob and keep the
 * server's filename; errors still use the standard envelope, so they surface as ApiError.
 */
export async function downloadReportCsv(type: ReportExportType, range: ReportRange): Promise<void> {
  const response = await fetch(reportExportPath(type, range), { credentials: "include" });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      error?: string;
    } | null;
    throw new ApiError(
      response.status,
      body?.code ?? `HTTP_${response.status}`,
      body?.error ?? "The export could not be generated",
    );
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `partyplay-${type}.csv`;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
