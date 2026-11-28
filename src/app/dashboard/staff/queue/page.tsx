import type { Metadata } from "next";
import { StaffRequestQueueView } from "@/components/staff/StaffRequestQueueView";
import { requirePageRole } from "@/lib/auth/rbac";
import { listStaffDocumentRequests } from "@/lib/db/staff-requests";
import type { DocumentRequestStatus } from "@/types/requester";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request Queue | Registrar Staff — RegistrarDocs AI",
  description:
    "Review and process incoming DNSC academic document requests.",
};

const VALID_STATUSES: readonly DocumentRequestStatus[] = [
  "pending",
  "processing",
  "needs_correction",
  "ready_for_release",
  "released",
  "rejected",
];

export default async function StaffRequestQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePageRole("staff");
  const params = await searchParams;
  const rawStatus = params.status?.trim();

  // Default /dashboard/staff/queue strictly to Submitted / Pending ("pending")
  // so the Request Queue exclusively shows incoming requests awaiting initial review.
  const scopedStatus: DocumentRequestStatus =
    rawStatus &&
    (VALID_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as DocumentRequestStatus)
      : "pending";

  const result = await listStaffDocumentRequests({ status: scopedStatus });

  return (
    <StaffRequestQueueView
      key={scopedStatus}
      initialRequests={result.ok ? result.requests : []}
      scopedStatus={scopedStatus}
      error={result.ok ? null : result.error}
    />
  );
}
