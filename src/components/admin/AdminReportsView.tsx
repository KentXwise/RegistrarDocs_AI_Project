"use client";

import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  FilterX,
  Loader2,
  PackageCheck,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { RequestStatusBadge } from "@/components/requester/RequestStatusBadge";
import type { AdminReportsPayload } from "@/lib/db/admin-reports";
import type { DocumentRequestStatus } from "@/types/requester";

interface AdminReportsViewProps {
  initialReport: AdminReportsPayload;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getCurrentYearRange(): { start: string; end: string } {
  const y = new Date().getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export function AdminReportsView({ initialReport }: AdminReportsViewProps) {
  const [report, setReport] = useState<AdminReportsPayload>(initialReport);
  const [startDate, setStartDate] = useState(
    initialReport.filters.startDate ?? ""
  );
  const [endDate, setEndDate] = useState(initialReport.filters.endDate ?? "");
  const [documentTypeCode, setDocumentTypeCode] = useState(
    initialReport.filters.documentTypeCode ?? "all"
  );
  const [status, setStatus] = useState<DocumentRequestStatus | "all">(
    (initialReport.filters.status as DocumentRequestStatus | null) ?? "all"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = (params: {
    start: string;
    end: string;
    docCode: string;
    st: string;
  }) => {
    const sp = new URLSearchParams();
    if (params.start) sp.set("startDate", params.start);
    if (params.end) sp.set("endDate", params.end);
    if (params.docCode && params.docCode !== "all") {
      sp.set("documentTypeCode", params.docCode);
    }
    if (params.st && params.st !== "all") sp.set("status", params.st);
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
  };

  const fetchFilteredReport = async (params: {
    start: string;
    end: string;
    docCode: string;
    st: DocumentRequestStatus | "all";
  }) => {
    if (params.start && params.end && params.start > params.end) {
      setError("Start date cannot be later than End date.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const qs = buildQueryString(params);
      const res = await fetch(`/api/admin/reports${qs}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | (AdminReportsPayload & { error?: string })
        | null;
      if (!res.ok || !data || data.error) {
        setError(data?.error || "Unable to load filtered report data.");
        return;
      }
      setReport(data);
    } catch {
      setError("A network error occurred while loading report data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchFilteredReport({
      start: startDate,
      end: endDate,
      docCode: documentTypeCode,
      st: status,
    });
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setDocumentTypeCode("all");
    setStatus("all");
    void fetchFilteredReport({
      start: "",
      end: "",
      docCode: "all",
      st: "all",
    });
  };

  const handleQuickPeriod = (period: "month" | "year") => {
    const range =
      period === "month" ? getCurrentMonthRange() : getCurrentYearRange();
    setStartDate(range.start);
    setEndDate(range.end);
    void fetchFilteredReport({
      start: range.start,
      end: range.end,
      docCode: documentTypeCode,
      st: status,
    });
  };

  const exportUrl = `/api/admin/reports/export${buildQueryString({
    start: startDate,
    end: endDate,
    docCode: documentTypeCode,
    st: status,
  })}`;

  const maxTrendCount = Math.max(
    1,
    ...report.monthlyTrends.map((t) => t.count)
  );
  const maxDemandCount = Math.max(
    1,
    ...report.documentDemand.map((d) => d.count)
  );

  return (
    <div className="space-y-6">
      {/* Header + Export Actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            System Oversight &amp; Reporting
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            Reports &amp; Analytics
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Live database analytics for DNSC RegistrarDocs AI document demand,
            workflow progression, and user registrations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <a
            href={exportUrl}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D32] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45]"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#25352B] transition-colors hover:bg-[#E6EFE8]"
          >
            <Printer className="h-4 w-4 text-[#174D32]" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleApply}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-[#25352B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-[#25352B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Document Type
            </label>
            <select
              value={documentTypeCode}
              onChange={(e) => setDocumentTypeCode(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#25352B]"
            >
              <option value="all">All Document Types</option>
              {report.availableDocumentTypes.map((dt) => (
                <option key={dt.code} value={dt.code}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Request Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as DocumentRequestStatus | "all")
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#25352B]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Submitted / Pending</option>
              <option value="processing">Under Processing</option>
              <option value="ready_for_release">Ready for Release</option>
              <option value="released">Released</option>
              <option value="needs_correction">Needs Correction</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#174D32] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#246B45] disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#25352B] hover:bg-[#F5F5EF]"
              title="Reset all filters"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px]">
          <span className="font-semibold text-slate-500">Quick Period:</span>
          <button
            type="button"
            onClick={() => handleQuickPeriod("month")}
            className="rounded-md border border-[#174D32]/25 bg-[#E6EFE8]/60 px-2.5 py-1 font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => handleQuickPeriod("year")}
            className="rounded-md border border-[#174D32]/25 bg-[#E6EFE8]/60 px-2.5 py-1 font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
          >
            This Year
          </button>
          <span className="ml-auto text-slate-500">
            Generated: {formatDate(report.generatedAt)}
          </span>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* 2.1 System-wide Request Overview */}
      <section aria-label="Request Overview">
        <h2 className="mb-3 text-sm font-bold text-[#25352B]">
          System-Wide Request Overview (Filtered)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Requests",
              value: report.requestOverview.total,
              icon: FileText,
            },
            {
              label: "Active Pipeline (Pending + Processing + Ready)",
              value: report.requestOverview.activePipeline,
              icon: Clock,
            },
            {
              label: "Released (Completed)",
              value: report.requestOverview.released,
              icon: CheckCircle2,
            },
            {
              label: "Needs Correction / Rejected",
              value:
                report.requestOverview.needsCorrection +
                report.requestOverview.rejected,
              icon: ClipboardList,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
              >
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-[#25352B]">
                    {card.value}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Exact Per-Status Breakdown Strip */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Submitted / Pending", count: report.requestOverview.pending },
            { label: "Under Processing", count: report.requestOverview.processing },
            {
              label: "Ready for Release",
              count: report.requestOverview.readyForRelease,
            },
            { label: "Released", count: report.requestOverview.released },
            {
              label: "Needs Correction",
              count: report.requestOverview.needsCorrection,
            },
            { label: "Rejected", count: report.requestOverview.rejected },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
            >
              <p className="text-[11px] text-slate-500">{s.label}</p>
              <p className="mt-0.5 text-lg font-bold text-[#174D32]">
                {s.count}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 2.2 Document Demand + 2.3 Monthly Request Trends */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Document Demand */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#25352B]">
            <BarChart3 className="h-4 w-4 text-[#174D32]" />
            <span>Document Demand Report</span>
          </h2>
          {report.documentDemand.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">
              No requests matched the selected filters.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {report.documentDemand.map((item) => (
                <div key={item.code}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#25352B]">
                      {item.name}
                    </span>
                    <span className="font-mono text-slate-600">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#E6EFE8]">
                    <div
                      className="h-full rounded-full bg-[#174D32]"
                      style={{
                        width: `${Math.max(4, (item.count / maxDemandCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Monthly Trends */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#25352B]">
            <TrendingUp className="h-4 w-4 text-[#174D32]" />
            <span>Monthly Request Volume Trends</span>
          </h2>
          {report.monthlyTrends.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">
              No monthly trend data available for the selected filters.
            </p>
          ) : (
            <>
              <div className="mt-4 flex h-40 items-end gap-3 border-b border-slate-200 pb-2">
                {report.monthlyTrends.map((m) => (
                  <div
                    key={m.monthKey}
                    className="flex flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="text-[11px] font-bold text-[#174D32]">
                      {m.count}
                    </span>
                    <div
                      className="w-full max-w-[44px] rounded-t-md bg-[#246B45]"
                      style={{
                        height: `${Math.max(12, Math.round((m.count / maxTrendCount) * 110))}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-3 text-center text-[10px] font-medium text-slate-500">
                {report.monthlyTrends.map((m) => (
                  <span key={m.monthKey} className="flex-1 truncate">
                    {m.label}
                  </span>
                ))}
              </div>
              {report.monthlyTrends.length === 1 && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Only one month of data is currently recorded; multi-month
                  comparative trends will appear automatically as additional
                  months accumulate.
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {/* 2.5 User & Registration Statistics */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#25352B]">
          <Users className="h-4 w-4 text-[#174D32]" />
          <span>User &amp; Registration Statistics</span>
        </h2>
        <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total Registered Accounts", val: report.userStatistics.totalAccounts },
            { label: "Requester / Student", val: report.userStatistics.requesters },
            { label: "Registrar Staff", val: report.userStatistics.staff },
            { label: "Administrators", val: report.userStatistics.admins },
            { label: "Pending Approval", val: report.userStatistics.pendingApproval },
            { label: "Approved Students", val: report.userStatistics.approved },
            { label: "Active Staff & Admin", val: report.userStatistics.activeStaffAndAdmin },
            { label: "Needs Correction", val: report.userStatistics.needsCorrection },
            { label: "Rejected Accounts", val: report.userStatistics.rejected },
            { label: "Inactive Accounts", val: report.userStatistics.inactive },
          ].map((u) => (
            <div
              key={u.label}
              className="rounded-xl border border-slate-200 bg-[#F5F5EF]/60 px-3.5 py-2.5"
            >
              <p className="text-[11px] text-slate-500">{u.label}</p>
              <p className="mt-0.5 text-lg font-bold text-[#25352B]">{u.val}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filtered Request Records Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#25352B]">
            <PackageCheck className="h-4 w-4 text-[#174D32]" />
            <span>Filtered Request Records ({report.requests.length})</span>
          </h2>
        </div>
        {report.requests.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500">
            No document requests match the selected report filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-[#F5F5EF]/80 font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Reference #</th>
                  <th className="px-5 py-3">Document Type</th>
                  <th className="px-5 py-3">Copies</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Released</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.requests.slice(0, 100).map((r) => (
                  <tr key={r.id} className="hover:bg-[#F5F5EF]/50">
                    <td className="px-5 py-3 font-mono font-bold text-[#174D32]">
                      {r.referenceNumber}
                    </td>
                    <td className="px-5 py-3 font-medium text-[#25352B]">
                      {r.documentTypeName}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{r.copies}</td>
                    <td className="px-5 py-3">
                      <RequestStatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(r.submittedAt)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(r.releasedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
