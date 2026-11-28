import type { Metadata } from "next";
import { AdminRequirementsManager } from "@/components/admin/AdminRequirementsManager";
import { requirePageRole } from "@/lib/auth/rbac";
import {
  listAdminDocumentTypes,
  listAdminRequirements,
} from "@/lib/db/admin-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Requirements Management | Admin — RegistrarDocs AI",
};

export default async function AdminRequirementsPage() {
  await requirePageRole("admin");
  const [reqResult, dtResult] = await Promise.all([
    listAdminRequirements(),
    listAdminDocumentTypes(),
  ]);

  return (
    <AdminRequirementsManager
      initialRequirements={reqResult.requirements}
      documentTypes={dtResult.documentTypes}
      schemaReady={reqResult.schemaReady && dtResult.schemaReady}
    />
  );
}
