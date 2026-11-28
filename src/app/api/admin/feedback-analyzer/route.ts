import { NextResponse } from "next/server";
import {
  analyzeFeedbackComments,
  clearSyntheticTestFeedback,
  listFeedbackForAnalyzer,
  loadSyntheticTestFeedback,
} from "@/lib/ai/feedback-analyzer";
import { requireApiAuth } from "@/lib/auth/rbac";

export async function GET(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const dataset =
    searchParams.get("dataset") === "synthetic" ? "synthetic" : "real";
  const startDate = searchParams.get("startDate")?.trim() || undefined;
  const endDate = searchParams.get("endDate")?.trim() || undefined;

  const result = await listFeedbackForAnalyzer({
    dataset,
    startDate,
    endDate,
  });

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  let body: {
    action?: unknown;
    dataset?: unknown;
    startDate?: unknown;
    endDate?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (body.action === "load_synthetic") {
    const res = await loadSyntheticTestFeedback(auth.user);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }
    const refreshed = await listFeedbackForAnalyzer({ dataset: "synthetic" });
    return NextResponse.json(
      { inserted: res.inserted, ...refreshed },
      { status: 200 }
    );
  }

  if (body.action === "clear_synthetic") {
    const res = await clearSyntheticTestFeedback(auth.user);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }
    const refreshed = await listFeedbackForAnalyzer({ dataset: "synthetic" });
    return NextResponse.json({ ok: true, ...refreshed }, { status: 200 });
  }

  if (body.action === "analyze") {
    const dataset = body.dataset === "synthetic" ? "synthetic" : "real";
    const startDate =
      typeof body.startDate === "string" && body.startDate.trim()
        ? body.startDate.trim()
        : undefined;
    const endDate =
      typeof body.endDate === "string" && body.endDate.trim()
        ? body.endDate.trim()
        : undefined;

    const listed = await listFeedbackForAnalyzer({
      dataset,
      startDate,
      endDate,
    });
    const analysis = await analyzeFeedbackComments({
      items: listed.items,
      datasetType: dataset,
    });

    return NextResponse.json({ analysis, ...listed }, { status: 200 });
  }

  return NextResponse.json(
    { error: "Unsupported feedback analyzer action." },
    { status: 400 }
  );
}
