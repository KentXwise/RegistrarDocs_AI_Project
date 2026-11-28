import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { listStaffDocumentRequests } from "@/lib/db/staff-requests";
import type { AuthErrorCode } from "@/types/auth";
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
  const auth = await requireApiAuth(["staff"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status")?.trim();
  const statusFilter =
    rawStatus && (VALID_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as DocumentRequestStatus)
      : undefined;

  const result = await listStaffDocumentRequests(
    statusFilter ? { status: statusFilter } : undefined
  );
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      requests: result.requests,
      counts: result.counts,
    },
    { status: 200 }
  );
}
