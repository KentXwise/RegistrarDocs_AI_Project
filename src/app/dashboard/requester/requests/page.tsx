import type { Metadata } from "next";
import { MyRequestsView } from "@/components/requester/MyRequestsView";
import { requirePageRole } from "@/lib/auth/rbac";
import { listRequesterDocumentRequests } from "@/lib/db/requests";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Requests | RegistrarDocs AI",
  description:
    "Track your submitted RegistrarDocs AI academic document requests, reference numbers, and status updates.",
};

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const user = await requirePageRole("requester");
  const params = await searchParams;
  const initialRef = params.ref?.trim() || null;

  const { requests } = await listRequesterDocumentRequests(user.id);

  return <MyRequestsView initialRequests={requests} initialRef={initialRef} />;
}
