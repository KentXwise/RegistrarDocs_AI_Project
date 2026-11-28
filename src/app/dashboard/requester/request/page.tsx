import { Suspense } from "react";
import type { Metadata } from "next";
import { DocumentCatalogAndRequestFlow } from "@/components/requester/DocumentCatalogAndRequestFlow";
import { requirePageRole } from "@/lib/auth/rbac";
import { listActiveCatalogForRequester } from "@/lib/db/admin-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a Document | RegistrarDocs AI",
  description:
    "Browse available DNSC Registrar's Office document types, review requirements, and submit a document request.",
};

export default async function RequestDocumentPage() {
  const user = await requirePageRole("requester");
  const catalog = await listActiveCatalogForRequester();
  return (
    <Suspense fallback={null}>
      <DocumentCatalogAndRequestFlow user={user} catalog={catalog} />
    </Suspense>
  );
}
