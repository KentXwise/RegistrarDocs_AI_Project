import type { Metadata } from "next";
import { AdminAuditLogsView } from "@/components/admin/AdminAuditLogsView";
import { requirePageRole } from "@/lib/auth/rbac";
import { listAdminAuditLogs } from "@/lib/db/admin-audit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit Logs | Admin — RegistrarDocs AI",
};

export default async function AdminAuditLogsPage() {
  await requirePageRole("admin");
  const result = await listAdminAuditLogs({ limit: 200 });

  return (
    <AdminAuditLogsView
      initialLogs={result.logs}
      schemaReady={result.schemaReady}
    />
  );
}
