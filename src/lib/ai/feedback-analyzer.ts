import { SYNTHETIC_FEEDBACK_DATASET } from "@/lib/ai/dnsc-knowledge-seed";
import { recordAdminAuditLog } from "@/lib/db/admin-audit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SafeUser } from "@/types/auth";

export interface FeedbackItemRecord {
  id: string;
  category: string;
  rating: number | null;
  comment: string;
  isSynthetic: boolean;
  createdAt: string;
}

export interface FeedbackThemeFrequency {
  theme: string;
  sentiment: "positive" | "negative" | "neutral";
  count: number;
}

export interface FeedbackAnalysisResult {
  analyzedCount: number;
  datasetType: "real" | "synthetic";
  analyzedAt: string;
  mode: "gemini" | "grounded_analyzer";
  summary: string;
  positiveThemes: string[];
  negativeThemes: string[];
  commonComplaints: string[];
  suggestedImprovements: string[];
  themeFrequencies: FeedbackThemeFrequency[];
}

function isMissingTable(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("schema cache")
  );
}

/**
 * Lists strictly EITHER real user feedback (`is_synthetic = false`) OR
 * synthetic test feedback (`is_synthetic = true`). Never mixes them.
 * Excludes all PII (no names, emails, or student IDs).
 */
export async function listFeedbackForAnalyzer(options: {
  dataset: "real" | "synthetic";
  startDate?: string;
  endDate?: string;
}): Promise<{
  items: FeedbackItemRecord[];
  realCount: number;
  syntheticCount: number;
  schemaReady: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const isSynthetic = options.dataset === "synthetic";

  let query = admin
    .from("user_feedback")
    .select("id, category, rating, comment, is_synthetic, created_at")
    .eq("is_synthetic", isSynthetic)
    .order("created_at", { ascending: false });

  if (options.startDate) {
    query = query.gte("created_at", `${options.startDate}T00:00:00.000Z`);
  }
  if (options.endDate) {
    query = query.lte("created_at", `${options.endDate}T23:59:59.999Z`);
  }

  const [{ data, error }, { count: realCount }, { count: syntheticCount }] =
    await Promise.all([
      query,
      admin
        .from("user_feedback")
        .select("id", { count: "exact", head: true })
        .eq("is_synthetic", false),
      admin
        .from("user_feedback")
        .select("id", { count: "exact", head: true })
        .eq("is_synthetic", true),
    ]);

  if (error) {
    return {
      items: [],
      realCount: 0,
      syntheticCount: 0,
      schemaReady: !isMissingTable(error.message),
    };
  }

  type RawFb = {
    id: string;
    category: string;
    rating: number | null;
    comment: string;
    is_synthetic: boolean;
    created_at: string;
  };

  return {
    items: ((data ?? []) as RawFb[]).map((r) => ({
      id: r.id,
      category: r.category,
      rating: r.rating,
      comment: r.comment,
      isSynthetic: r.is_synthetic,
      createdAt: r.created_at,
    })),
    realCount: realCount ?? 0,
    syntheticCount: syntheticCount ?? 0,
    schemaReady: true,
  };
}

export async function loadSyntheticTestFeedback(
  adminUser: SafeUser
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("user_feedback")
    .select("id", { count: "exact", head: true })
    .eq("is_synthetic", true);

  if ((count ?? 0) > 0) {
    return { ok: true, inserted: 0 };
  }

  const rows = SYNTHETIC_FEEDBACK_DATASET.map((item) => ({
    user_id: null,
    category: item.category,
    rating: item.rating,
    comment: item.comment,
    is_synthetic: true,
  }));

  const { error } = await admin.from("user_feedback").insert(rows);
  if (error) {
    return {
      ok: false,
      error: isMissingTable(error.message)
        ? "Please run migration 0007_ai_knowledge_and_feedback.sql in Supabase first."
        : error.message,
    };
  }

  await recordAdminAuditLog({
    actor: adminUser,
    action: "synthetic_feedback_loaded",
    entityType: "ai_knowledge_source",
    entityLabel: "Synthetic Feedback Test Dataset",
    description: `Loaded ${rows.length} clearly labeled TEST / SYNTHETIC feedback entries for Feedback Analyzer testing.`,
  });

  return { ok: true, inserted: rows.length };
}

export async function clearSyntheticTestFeedback(
  adminUser: SafeUser
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_feedback")
    .delete()
    .eq("is_synthetic", true);

  if (error) {
    return { ok: false, error: error.message };
  }

  await recordAdminAuditLog({
    actor: adminUser,
    action: "synthetic_feedback_cleared",
    entityType: "ai_knowledge_source",
    entityLabel: "Synthetic Feedback Test Dataset",
    description:
      "Removed all TEST / SYNTHETIC feedback entries without affecting real user feedback.",
  });

  return { ok: true };
}

/**
 * Deterministic, mathematically exact theme analysis over anonymized comments.
 * Never fabricates themes or counts.
 */
function runDeterministicFeedbackAnalysis(
  items: FeedbackItemRecord[],
  datasetType: "real" | "synthetic"
): FeedbackAnalysisResult {
  const rules: {
    theme: string;
    sentiment: "positive" | "negative";
    regex: RegExp;
    suggestion?: string;
  }[] = [
    {
      theme: "Ease of Online Document Submission & Convenience",
      sentiment: "positive",
      regex: /easier|convenient|saved me|lining up|smooth|fast/i,
    },
    {
      theme: "Useful Request Tracking & Reference Numbers",
      sentiment: "positive",
      regex: /tracking|reference number|status update|knew what to do/i,
    },
    {
      theme: "Clear Collection & Claiming Instructions",
      sentiment: "positive",
      regex: /collection instructions|claiming window|catalog descriptions/i,
    },
    {
      theme: "Confusion Around Document Requirements & Clearances",
      sentiment: "negative",
      regex: /confused|unsure|requirements|clearance|stamp/i,
      suggestion:
        "Highlight document-specific requirement checklists and link the AI Registrar Assistant directly on the Document Catalog page.",
    },
    {
      theme: "Unclear Payment Process / LandBank Instructions",
      sentiment: "negative",
      regex: /payment|landbank|pay|bizportal/i,
      suggestion:
        "Add a dedicated, verified Payment Instructions guide referencing LandBank Link.BizPortal and Registrar confirmation steps.",
    },
    {
      theme: "Mobile Usability & Layout Cramping",
      sentiment: "negative",
      regex: /mobile|phone|cramped|small screen/i,
      suggestion:
        "Audit mobile spacing and button sizes on My Requests and Request Catalog views for smaller viewports.",
    },
    {
      theme: "Uncertainty About Release Schedule / Readiness Notifications",
      sentiment: "negative",
      regex: /when my document|would be ready|email notification|ready/i,
      suggestion:
        "Clarify status expectations in My Requests and consider enabling email notifications in a future release.",
    },
    {
      theme: "Difficulty Finding the Right Document Type",
      sentiment: "negative",
      regex: /trouble finding|finding the document/i,
      suggestion:
        "Improve Document Catalog search keywords and short descriptions so students locate credentials faster.",
    },
  ];

  const freq: FeedbackThemeFrequency[] = [];
  const positiveThemes: string[] = [];
  const negativeThemes: string[] = [];
  const commonComplaints: string[] = [];
  const suggestedImprovements: string[] = [];

  for (const rule of rules) {
    const matchedCount = items.filter((i) => rule.regex.test(i.comment)).length;
    if (matchedCount > 0) {
      freq.push({
        theme: rule.theme,
        sentiment: rule.sentiment,
        count: matchedCount,
      });
      if (rule.sentiment === "positive") {
        positiveThemes.push(`${rule.theme} (${matchedCount} mention${matchedCount === 1 ? "" : "s"})`);
      } else {
        negativeThemes.push(`${rule.theme} (${matchedCount} mention${matchedCount === 1 ? "" : "s"})`);
        commonComplaints.push(`${rule.theme} — reported in ${matchedCount} of ${items.length} comment${items.length === 1 ? "" : "s"}.`);
        if (rule.suggestion) suggestedImprovements.push(rule.suggestion);
      }
    }
  }

  freq.sort((a, b) => b.count - a.count);

  const posCount = items.filter((i) => (i.rating ?? 0) >= 4).length;
  const negCount = items.filter((i) => i.rating !== null && i.rating <= 3).length;

  const summary =
    items.length === 0
      ? "No feedback comments were available in the selected dataset and date range."
      : `Analyzed ${items.length} ${datasetType === "synthetic" ? "TEST / SYNTHETIC" : "real"} feedback comment${items.length === 1 ? "" : "s"} (${posCount} rated 4–5 stars, ${negCount} rated 1–3 stars). ${
          positiveThemes.length > 0
            ? `Key strengths include ${positiveThemes[0].toLowerCase()}. `
            : ""
        }${
          negativeThemes.length > 0
            ? `Top area for improvement: ${negativeThemes[0].toLowerCase()}.`
            : "No recurring complaints were detected in this sample."
        }`;

  return {
    analyzedCount: items.length,
    datasetType,
    analyzedAt: new Date().toISOString(),
    mode: "grounded_analyzer",
    summary,
    positiveThemes,
    negativeThemes,
    commonComplaints,
    suggestedImprovements,
    themeFrequencies: freq,
  };
}

/**
 * Analyzes anonymized feedback comments (ZERO PII sent to AI).
 * Uses Gemini if `GEMINI_API_KEY` is configured, with automatic fallback to
 * the mathematically exact grounded analyzer.
 */
export async function analyzeFeedbackComments(params: {
  items: FeedbackItemRecord[];
  datasetType: "real" | "synthetic";
}): Promise<FeedbackAnalysisResult> {
  const baseline = runDeterministicFeedbackAnalysis(
    params.items,
    params.datasetType
  );
  if (params.items.length === 0) return baseline;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return baseline;

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const anonymizedList = params.items
    .map(
      (item, idx) =>
        `${idx + 1}. [${item.category}${item.rating ? `, ${item.rating}/5` : ""}] ${item.comment}`
    )
    .join("\n");

  const prompt = `You are an administrative feedback analyst for DNSC RegistrarDocs AI.
Analyze ONLY the ${params.items.length} anonymized feedback comments below.
STRICT RULES:
- Never fabricate counts, percentages, or themes not directly present in these ${params.items.length} comments.
- Return ONLY valid JSON with keys: "summary" (string), "positiveThemes" (string[]), "negativeThemes" (string[]), "commonComplaints" (string[]), "suggestedImprovements" (string[]).

COMMENTS (${params.items.length} total):
${anonymizedList}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return baseline;
    const raw = (await res.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    } | null;
    const jsonText = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) return baseline;

    const parsed = JSON.parse(jsonText) as Partial<FeedbackAnalysisResult>;
    return {
      ...baseline,
      mode: "gemini",
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : baseline.summary,
      positiveThemes: Array.isArray(parsed.positiveThemes)
        ? parsed.positiveThemes.map(String)
        : baseline.positiveThemes,
      negativeThemes: Array.isArray(parsed.negativeThemes)
        ? parsed.negativeThemes.map(String)
        : baseline.negativeThemes,
      commonComplaints: Array.isArray(parsed.commonComplaints)
        ? parsed.commonComplaints.map(String)
        : baseline.commonComplaints,
      suggestedImprovements: Array.isArray(parsed.suggestedImprovements)
        ? parsed.suggestedImprovements.map(String)
        : baseline.suggestedImprovements,
    };
  } catch {
    return baseline;
  }
}
