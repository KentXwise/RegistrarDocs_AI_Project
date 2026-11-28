import type { Metadata } from "next";
import { AdminDocumentTypesManager } from "@/components/admin/AdminDocumentTypesManager";
import { requirePageRole } from "@/lib/auth/rbac";
import { listAdminDocumentTypes } from "@/lib/db/admin-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Document Types | Admin — RegistrarDocs AI",
};

export default async function AdminDocumentTypesPage() {
  await requirePageRole("admin");
  const result = await listAdminDocumentTypes();

  return (
    <AdminDocumentTypesManager
      initialDocumentTypes={result.documentTypes}
      schemaReady={result.schemaReady}
    />
  );
}
