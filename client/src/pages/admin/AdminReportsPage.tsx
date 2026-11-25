import { useState, type FormEvent } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ErrorState } from "../../components/ui/error-state";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAdminReport } from "../../hooks/use-reports";
import { formatDateTime, formatLongDate, formatMonthLabel } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import {
  defaultReportRange,
  downloadReportCsv,
  type ReportExportType,
  type ReportRange,
} from "../../lib/reports";
import { toast, toastError } from "../../lib/toast";

const STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"];

export default function AdminReportsPage() {
  const [range, setRange] = useState<ReportRange>(defaultReportRange);
  const [draft, setDraft] = useState<ReportRange>(range);
  const [exporting, setExporting] = useState<ReportExportType | null>(null);
  const report = useAdminReport(range);

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.from || !draft.to) {
      return;
    }
    setRange({ from: draft.from, to: draft.to });
  }

  async function exportCsv(type: ReportExportType) {
    setExporting(type);
    try {
      await downloadReportCsv(type, range);
      toast.success(type === "bookings" ? "Bookings CSV downloaded." : "Payments CSV downloaded.");
    } catch (error) {
      toastError(error, "The export could not be generated.");
    } finally {
      setExporting(null);
    }
  }

  if (report.isPending) {
    return <ReportsSkeleton />;
  }

  if (report.isError && !report.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState
          title="The report could not load"
          error={report.error}
          onRetry={() => report.refetch()}
          isRetrying={report.isFetching}
        />
      </div>
    );
  }

  const data = report.data;
  if (!data) {
    return <ReportsSkeleton />;
  }

  const currency = data.currency || "KES";
  const rangeIsDefault = range.from === defaultReportRange().from;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-50 p-6 ring-1 ring-blush-100 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-blush-200/60 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
              <BarChart3 aria-hidden="true" className="size-3.5" />
              Month-end and operations
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {formatLongDate(data.range.from)} to {formatLongDate(data.range.to)} ·{" "}
              {data.range.days} day{data.range.days === 1 ? "" : "s"}. Figures come from the live
              booking, payment and refund rows.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Generated {formatDateTime(data.generatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              onClick={() => exportCsv("bookings")}
              disabled={exporting !== null}
            >
              {exporting === "bookings" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Download aria-hidden="true" className="size-4" />
              )}
              Bookings CSV
            </Button>
            <Button
              type="button"
              onClick={() => exportCsv("payments")}
              disabled={exporting !== null}
            >
              {exporting === "payments" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet aria-hidden="true" className="size-4" />
              )}
              Payments CSV
            </Button>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, from: event.target.value }))
                }
                className="w-40 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, to: event.target.value }))
                }
                className="w-40 bg-white"
              />
            </div>
            <Button type="submit" disabled={!draft.from || !draft.to || report.isFetching}>
              {report.isFetching ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <CalendarDays aria-hidden="true" className="size-4" />
              )}
              Apply range
            </Button>
            {!rangeIsDefault && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const next = defaultReportRange();
                  setDraft(next);
                  setRange(next);
                }}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                This month
              </Button>
            )}
          </form>

          <Button
            type="button"
            variant="outline"
            onClick={() => report.refetch()}
            disabled={report.isFetching}
            aria-busy={report.isFetching}
          >
            <RefreshCw
              aria-hidden="true"
              className={report.isFetching ? "size-4 animate-spin" : "size-4"}
            />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Net revenue"
          value={formatMoney(data.revenue.net, currency)}
          hint={`${data.revenue.paymentCount} payment${data.revenue.paymentCount === 1 ? "" : "s"} in range`}
          icon={TrendingUp}
        />
        <SummaryCard
          label="Gross collected"
          value={formatMoney(data.revenue.gross, currency)}
          hint="Paid and refunded payments"
          icon={Wallet}
        />
        <SummaryCard
          label="Refunded"
          value={formatMoney(data.revenue.refunded, currency)}
          hint={`${data.revenue.refundCount} refund${data.revenue.refundCount === 1 ? "" : "s"} in range`}
          icon={RotateCcw}
        />
        <SummaryCard
          label="Requests created"
          value={String(data.bookings.created)}
          hint="All statuses, by creation date"
          icon={BarChart3}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Bookings by status</CardTitle>
            <CardDescription>Requests created in this range, whatever they became.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((status) => (
            <Badge key={status} variant={data.bookings.byStatus[status] ? "default" : "outline"}>
              {status.toLowerCase()} · {data.bookings.byStatus[status] ?? 0}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by month</CardTitle>
          <CardDescription>
            Payments count by the date they were received; refunds by the date returned.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Refunds</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthly.map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium text-slate-900">
                    {formatMonthLabel(month.month)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{month.bookings}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(month.gross, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-rose-700">
                    {formatMoney(month.refunded, currency)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatMoney(month.net, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment utilisation</CardTitle>
          <CardDescription>
            Confirmed and completed unit-days inside the range, against inventory × days. Packages
            count the equipment they contain.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.equipment.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-500">
              No equipment has inventory or confirmed bookings in this range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Inventory</TableHead>
                  <TableHead className="text-right">Unit-days</TableHead>
                  <TableHead className="w-48">Utilisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.equipment.map((item) => (
                  <TableRow key={item.equipmentId}>
                    <TableCell>
                      <span className="font-medium text-slate-900">{item.name}</span>
                      {!item.isActive && (
                        <Badge variant="outline" className="ml-2">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.bookings}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.inventory}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.bookedUnitDays} / {item.capacityUnitDays}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${Math.min(100, item.utilisation)}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-slate-700">{item.utilisation}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Icon aria-hidden="true" className="size-4 text-brand-700" />
          {label}
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
