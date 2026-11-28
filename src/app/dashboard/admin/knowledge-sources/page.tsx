import type { Metadata } from "next";
import { AdminKnowledgeManager } from "@/components/admin/AdminKnowledgeManager";
import { requirePageRole } from "@/lib/auth/rbac";
import { listAdminKnowledgeSources } from "@/lib/db/admin-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Knowledge Sources | Admin — RegistrarDocs AI",
};

export default async function AdminKnowledgeSourcesPage() {
  await requirePageRole("admin");
  const result = await listAdminKnowledgeSources();

  return (
    <AdminKnowledgeManager
      initialSources={result.sources}
      schemaReady={result.schemaReady}
    />
  );
}
