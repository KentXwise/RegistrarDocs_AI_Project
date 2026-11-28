import type { Metadata } from "next";
import { RegistrarAssistantChat } from "@/components/requester/RegistrarAssistantChat";
import { requirePageRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Registrar Assistant | RegistrarDocs AI",
  description:
    "Ask questions in English, Filipino, or Cebuano grounded on approved DNSC Registrar's Office information.",
};

export default async function RequesterAssistantPage() {
  await requirePageRole("requester");
  return <RegistrarAssistantChat />;
}
