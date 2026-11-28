import type { Metadata } from "next";
import { AdminFaqsManager } from "@/components/admin/AdminFaqsManager";
import { requirePageRole } from "@/lib/auth/rbac";
import { listAdminFaqs } from "@/lib/db/admin-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAQ Management | Admin — RegistrarDocs AI",
};

export default async function AdminFaqsPage() {
  await requirePageRole("admin");
  const result = await listAdminFaqs();

  return (
    <AdminFaqsManager
      initialFaqs={result.faqs}
      schemaReady={result.schemaReady}
    />
  );
}
