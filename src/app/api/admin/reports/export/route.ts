import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  buildAdminReportCsv,
  getAdminReportsData,
} from "@/lib/db/admin-reports";
import type { DocumentRequestStatus } from "@/types/requester";

const VALID_STATUSES: readonly DocumentRequestStatus[] = [
  "pending",
  "processing",
  "needs_correction",
  "ready_for_release",
  "released",
  "rejected",
];

export async function GET(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate")?.trim() || undefined;
  const endDate = searchParams.get("endDate")?.trim() || undefined;
  const documentTypeCode =
    searchParams.get("documentTypeCode")?.trim() || undefined;
  const rawStatus = searchParams.get("status")?.trim();
  const status: DocumentRequestStatus | "all" =
    rawStatus && (VALID_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as DocumentRequestStatus)
      : "all";

  const result = await getAdminReportsData({
    startDate,
    endDate,
    documentTypeCode,
    status,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const csv = buildAdminReportCsv(result.report);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrardocs-report-${today}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
