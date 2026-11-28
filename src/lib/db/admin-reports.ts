import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AccountStatus, UserRole } from "@/types/auth";
import type { DocumentRequestStatus } from "@/types/requester";

export interface ReportFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  documentTypeCode?: string;
  status?: DocumentRequestStatus | "all";
}

export interface DocumentDemandItem {
  code: string;
  name: string;
  count: number;
  percentage: number;
}

export interface MonthlyTrendItem {
  monthKey: string; // YYYY-MM
  label: string; // e.g., "Nov 2026"
  count: number;
}

export interface ReportRequestRow {
  id: string;
  referenceNumber: string;
  documentTypeCode: string;
  documentTypeName: string;
  copies: number;
  status: DocumentRequestStatus;
  submittedAt: string;
  readyForReleaseAt: string | null;
  releasedAt: string | null;
}

export interface AdminReportsPayload {
  generatedAt: string;
  filters: {
    startDate: string | null;
    endDate: string | null;
    documentTypeCode: string | null;
    status: string | null;
  };
  requestOverview: {
    total: number;
    pending: number;
    processing: number;
    readyForRelease: number;
    released: number;
    needsCorrection: number;
    rejected: number;
    activePipeline: number;
  };
  documentDemand: DocumentDemandItem[];
  monthlyTrends: MonthlyTrendItem[];
  userStatistics: {
    totalAccounts: number;
    requesters: number;
    staff: number;
    admins: number;
    pendingApproval: number;
    approved: number;
    activeStaffAndAdmin: number;
    needsCorrection: number;
    rejected: number;
    inactive: number;
  };
  availableDocumentTypes: { code: string; name: string }[];
  requests: ReportRequestRow[];
}

function isMissingColumn(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("schema cache")
  );
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function validateReportDateRange(
  startDate?: string,
  endDate?: string
): string | null {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (startDate && !isoRegex.test(startDate)) {
    return "Start date must be in YYYY-MM-DD format.";
  }
  if (endDate && !isoRegex.test(endDate)) {
    return "End date must be in YYYY-MM-DD format.";
  }
  if (startDate && endDate && startDate > endDate) {
    return "Start date cannot be later than End date.";
  }
  return null;
}

/**
 * Computes accurate system-wide Reports & Analytics directly from
 * public.document_requests and public.profiles without fan-out joins so each
 * request is counted exactly once.
 */
export async function getAdminReportsData(
  filters: ReportFilters = {}
): Promise<
  { ok: true; report: AdminReportsPayload } | { ok: false; error: string }
> {
  const dateError = validateReportDateRange(
    filters.startDate,
    filters.endDate
  );
  if (dateError) {
    return { ok: false, error: dateError };
  }

  try {
    const admin = createSupabaseAdminClient();

    // 1. Query document_requests (single-table query = zero join inflation)
    const FULL_SELECT =
      "id, reference_number, document_type_code, document_type_name, copies, status, submitted_at, ready_for_release_at, released_at";
    const BASE_SELECT =
      "id, reference_number, document_type_code, document_type_name, copies, status, submitted_at";

    let reqQuery = admin
      .from("document_requests")
      .select(FULL_SELECT)
      .order("submitted_at", { ascending: false });

    if (filters.startDate) {
      reqQuery = reqQuery.gte("submitted_at", `${filters.startDate}T00:00:00.000Z`);
    }
    if (filters.endDate) {
      reqQuery = reqQuery.lte("submitted_at", `${filters.endDate}T23:59:59.999Z`);
    }
    if (filters.documentTypeCode && filters.documentTypeCode !== "all") {
      reqQuery = reqQuery.eq("document_type_code", filters.documentTypeCode);
    }
    if (filters.status && filters.status !== "all") {
      reqQuery = reqQuery.eq("status", filters.status);
    }

    const [initialReqRes, { data: profileData }, { data: allTypesData }] =
      await Promise.all([
        reqQuery,
        admin.from("profiles").select("role, status"),
        admin
          .from("document_requests")
          .select("document_type_code, document_type_name"),
      ]);

    let reqData = initialReqRes.data;
    let reqError = initialReqRes.error;

    if (reqError && isMissingColumn(reqError.message)) {
      let fbQuery = admin
        .from("document_requests")
        .select(BASE_SELECT)
        .order("submitted_at", { ascending: false });
      if (filters.startDate) {
        fbQuery = fbQuery.gte("submitted_at", `${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        fbQuery = fbQuery.lte("submitted_at", `${filters.endDate}T23:59:59.999Z`);
      }
      if (filters.documentTypeCode && filters.documentTypeCode !== "all") {
        fbQuery = fbQuery.eq("document_type_code", filters.documentTypeCode);
      }
      if (filters.status && filters.status !== "all") {
        fbQuery = fbQuery.eq("status", filters.status);
      }
      const fb = await fbQuery;
      reqData = fb.data as typeof reqData;
      reqError = fb.error;
    }

    if (reqError) {
      return { ok: false, error: "Unable to query document request records." };
    }

    type RawReq = {
      id: string;
      reference_number: string;
      document_type_code: string;
      document_type_name: string;
      copies: number;
      status: DocumentRequestStatus;
      submitted_at: string;
      ready_for_release_at?: string | null;
      released_at?: string | null;
    };

    const rows = (reqData ?? []) as RawReq[];

    // Request overview counts (exact 1-to-1 per unique request row)
    const overview = {
      total: rows.length,
      pending: 0,
      processing: 0,
      readyForRelease: 0,
      released: 0,
      needsCorrection: 0,
      rejected: 0,
      activePipeline: 0,
    };

    const demandMap = new Map<string, { code: string; name: string; count: number }>();
    const monthMap = new Map<string, number>();

    for (const r of rows) {
      switch (r.status) {
        case "pending":
          overview.pending += 1;
          break;
        case "processing":
          overview.processing += 1;
          break;
        case "ready_for_release":
          overview.readyForRelease += 1;
          break;
        case "released":
          overview.released += 1;
          break;
        case "needs_correction":
          overview.needsCorrection += 1;
          break;
        case "rejected":
          overview.rejected += 1;
          break;
      }

      const existingDemand = demandMap.get(r.document_type_code);
      if (existingDemand) {
        existingDemand.count += 1;
      } else {
        demandMap.set(r.document_type_code, {
          code: r.document_type_code,
          name: r.document_type_name,
          count: 1,
        });
      }

      const monthKey = (r.submitted_at || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(monthKey)) {
        monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
      }
    }

    overview.activePipeline =
      overview.pending + overview.processing + overview.readyForRelease;

    const documentDemand: DocumentDemandItem[] = Array.from(demandMap.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        percentage:
          overview.total > 0
            ? Math.round((item.count / overview.total) * 1000) / 10
            : 0,
      }));

    const monthlyTrends: MonthlyTrendItem[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, count]) => ({
        monthKey,
        label: formatMonthLabel(monthKey),
        count,
      }));

    // User & Registration Statistics from profiles
    const profiles = (profileData ?? []) as {
      role: UserRole;
      status: AccountStatus;
    }[];

    const userStatistics = {
      totalAccounts: profiles.length,
      requesters: profiles.filter((p) => p.role === "requester").length,
      staff: profiles.filter((p) => p.role === "staff").length,
      admins: profiles.filter((p) => p.role === "admin").length,
      pendingApproval: profiles.filter((p) => p.status === "pending_approval")
        .length,
      approved: profiles.filter((p) => p.status === "approved").length,
      activeStaffAndAdmin: profiles.filter((p) => p.status === "active").length,
      needsCorrection: profiles.filter((p) => p.status === "needs_correction")
        .length,
      rejected: profiles.filter((p) => p.status === "rejected").length,
      inactive: profiles.filter((p) => p.status === "inactive").length,
    };

    // Available document types for filter dropdown
    const typeOptionsMap = new Map<string, string>();
    for (const t of (allTypesData ?? []) as {
      document_type_code: string;
      document_type_name: string;
    }[]) {
      if (!typeOptionsMap.has(t.document_type_code)) {
        typeOptionsMap.set(t.document_type_code, t.document_type_name);
      }
    }

    const requests: ReportRequestRow[] = rows.map((r) => ({
      id: r.id,
      referenceNumber: r.reference_number,
      documentTypeCode: r.document_type_code,
      documentTypeName: r.document_type_name,
      copies: r.copies,
      status: r.status,
      submittedAt: r.submitted_at,
      readyForReleaseAt: r.ready_for_release_at ?? null,
      releasedAt: r.released_at ?? null,
    }));

    return {
      ok: true,
      report: {
        generatedAt: new Date().toISOString(),
        filters: {
          startDate: filters.startDate || null,
          endDate: filters.endDate || null,
          documentTypeCode:
            filters.documentTypeCode && filters.documentTypeCode !== "all"
              ? filters.documentTypeCode
              : null,
          status:
            filters.status && filters.status !== "all" ? filters.status : null,
        },
        requestOverview: overview,
        documentDemand,
        monthlyTrends,
        userStatistics,
        availableDocumentTypes: Array.from(typeOptionsMap.entries())
          .map(([code, name]) => ({ code, name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        requests,
      },
    };
  } catch {
    return {
      ok: false,
      error: "Unable to generate reports from the database right now.",
    };
  }
}

function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180-compliant UTF-8 CSV report reflecting the exact active
 * filters, metadata header, summary counts, document demand, and request rows.
 * Excludes private/internal Staff remarks and sensitive account fields.
 */
export function buildAdminReportCsv(report: AdminReportsPayload): string {
  const lines: string[] = [];
  const row = (...cells: (string | number | null | undefined)[]) =>
    lines.push(cells.map(csvCell).join(","));

  row("DNSC RegistrarDocs AI — Administrative Report");
  row("Generated At (UTC)", report.generatedAt);
  row(
    "Date Range",
    report.filters.startDate || report.filters.endDate
      ? `${report.filters.startDate ?? "Beginning"} to ${report.filters.endDate ?? "Present"}`
      : "All Dates"
  );
  row("Document Type Filter", report.filters.documentTypeCode ?? "All");
  row("Status Filter", report.filters.status ?? "All");
  lines.push("");

  row("SECTION 1 — REQUEST OVERVIEW SUMMARY");
  row("Metric", "Count");
  row("Total Document Requests", report.requestOverview.total);
  row("Submitted / Pending", report.requestOverview.pending);
  row("Under Processing", report.requestOverview.processing);
  row("Ready for Release", report.requestOverview.readyForRelease);
  row("Released", report.requestOverview.released);
  row("Needs Correction", report.requestOverview.needsCorrection);
  row("Rejected", report.requestOverview.rejected);
  lines.push("");

  row("SECTION 2 — DOCUMENT DEMAND");
  row("Document Type", "Code", "Requests", "Percentage (%)");
  if (report.documentDemand.length === 0) {
    row("No matching requests", "", 0, "0");
  } else {
    for (const d of report.documentDemand) {
      row(d.name, d.code, d.count, d.percentage);
    }
  }
  lines.push("");

  row("SECTION 3 — FILTERED REQUEST RECORDS");
  row(
    "Reference Number",
    "Document Type",
    "Copies",
    "Status",
    "Submitted At (UTC)",
    "Ready for Release At (UTC)",
    "Released At (UTC)"
  );
  for (const r of report.requests) {
    row(
      r.referenceNumber,
      r.documentTypeName,
      r.copies,
      r.status,
      r.submittedAt,
      r.readyForReleaseAt ?? "",
      r.releasedAt ?? ""
    );
  }

  // UTF-8 BOM + CRLF for clean display in Excel & spreadsheet tools
  return "\uFEFF" + lines.join("\r\n");
}
