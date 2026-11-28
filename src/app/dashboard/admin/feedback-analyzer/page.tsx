import type { Metadata } from "next";
import { AdminFeedbackAnalyzerView } from "@/components/admin/AdminFeedbackAnalyzerView";
import { listFeedbackForAnalyzer } from "@/lib/ai/feedback-analyzer";
import { requirePageRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Feedback Analyzer | Admin — RegistrarDocs AI",
};

export default async function AdminFeedbackAnalyzerPage() {
  await requirePageRole("admin");
  const data = await listFeedbackForAnalyzer({ dataset: "real" });

  return (
    <AdminFeedbackAnalyzerView
      initialRealItems={data.items}
      initialRealCount={data.realCount}
      initialSyntheticCount={data.syntheticCount}
      schemaReady={data.schemaReady}
    />
  );
}
