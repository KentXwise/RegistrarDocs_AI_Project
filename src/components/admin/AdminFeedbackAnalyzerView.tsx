"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import type {
  FeedbackAnalysisResult,
  FeedbackItemRecord,
} from "@/lib/ai/feedback-analyzer";

interface AdminFeedbackAnalyzerViewProps {
  initialRealItems: FeedbackItemRecord[];
  initialRealCount: number;
  initialSyntheticCount: number;
  schemaReady: boolean;
}

export function AdminFeedbackAnalyzerView({
  initialRealItems,
  initialRealCount,
  initialSyntheticCount,
  schemaReady,
}: AdminFeedbackAnalyzerViewProps) {
  const [dataset, setDataset] = useState<"real" | "synthetic">("real");
  const [items, setItems] = useState<FeedbackItemRecord[]>(initialRealItems);
  const [realCount, setRealCount] = useState(initialRealCount);
  const [syntheticCount, setSyntheticCount] = useState(initialSyntheticCount);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [analysis, setAnalysis] = useState<FeedbackAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadDataset = async (
    nextDataset: "real" | "synthetic",
    nextStart = startDate,
    nextEnd = endDate
  ) => {
    setDataset(nextDataset);
    setAnalysis(null);
    setError(null);
    setIsLoading(true);
    try {
      const sp = new URLSearchParams({ dataset: nextDataset });
      if (nextStart) sp.set("startDate", nextStart);
      if (nextEnd) sp.set("endDate", nextEnd);

      const res = await fetch(`/api/admin/feedback-analyzer?${sp.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        items?: FeedbackItemRecord[];
        realCount?: number;
        syntheticCount?: number;
        error?: string;
      } | null;

      if (res.ok && data?.items) {
        setItems(data.items);
        if (typeof data.realCount === "number") setRealCount(data.realCount);
        if (typeof data.syntheticCount === "number") {
          setSyntheticCount(data.syntheticCount);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSynthetic = async () => {
    setError(null);
    setBanner(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/feedback-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load_synthetic" }),
      });
      const data = (await res.json().catch(() => null)) as {
        inserted?: number;
        items?: FeedbackItemRecord[];
        realCount?: number;
        syntheticCount?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error || "Unable to load synthetic test dataset.");
        return;
      }
      setDataset("synthetic");
      setItems(data?.items ?? []);
      setRealCount(data?.realCount ?? realCount);
      setSyntheticCount(data?.syntheticCount ?? syntheticCount);
      setAnalysis(null);
      setBanner(
        data?.inserted && data.inserted > 0
          ? `Loaded ${data.inserted} TEST / SYNTHETIC feedback records (isolated from real user feedback).`
          : "TEST / SYNTHETIC feedback dataset is already loaded."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSynthetic = async () => {
    if (
      !window.confirm(
        "Remove all TEST / SYNTHETIC feedback records? Real user feedback will not be touched."
      )
    ) {
      return;
    }
    setError(null);
    setBanner(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/feedback-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_synthetic" }),
      });
      const data = (await res.json().catch(() => null)) as {
        items?: FeedbackItemRecord[];
        realCount?: number;
        syntheticCount?: number;
        error?: string;
      } | null;
      if (res.ok) {
        if (dataset === "synthetic") setItems(data?.items ?? []);
        setRealCount(data?.realCount ?? realCount);
        setSyntheticCount(data?.syntheticCount ?? 0);
        setAnalysis(null);
        setBanner("Removed all TEST / SYNTHETIC feedback records.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (isAnalyzing) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/admin/feedback-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          dataset,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        analysis?: FeedbackAnalysisResult;
        items?: FeedbackItemRecord[];
        error?: string;
      } | null;
      if (!res.ok || !data?.analysis) {
        setError(data?.error || "Unable to analyze feedback right now.");
        return;
      }
      setAnalysis(data.analysis);
      if (data.items) setItems(data.items);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#174D32] uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Administrative AI Oversight</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            AI Feedback Analyzer
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Summarize anonymized requester feedback to identify recurring
            usability issues, complaints, and improvement opportunities.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleLoadSynthetic()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
          >
            <Database className="h-3.5 w-3.5" />
            <span>Load Synthetic Test Data</span>
          </button>
          {syntheticCount > 0 && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleClearSynthetic()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove Test Data</span>
            </button>
          )}
        </div>
      </div>

      {!schemaReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          Run migration <code>0007_ai_knowledge_and_feedback.sql</code> in
          Supabase to enable the Feedback Analyzer database table.
        </div>
      )}

      {banner && (
        <div className="flex items-center gap-2 rounded-xl border border-[#246B45]/30 bg-[#E6EFE8] p-3.5 text-xs font-medium text-[#25352B]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#174D32]" />
          <span>{banner}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
          <span>{error}</span>
        </div>
      )}

      {/* Dataset Selector & Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Select Feedback Dataset (Strictly Separated)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadDataset("real")}
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  dataset === "real"
                    ? "border-[#174D32] bg-[#174D32] text-white"
                    : "border-slate-300 bg-white text-[#25352B] hover:bg-[#E6EFE8]"
                }`}
              >
                Real User Feedback ({realCount})
              </button>
              <button
                type="button"
                onClick={() => void loadDataset("synthetic")}
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  dataset === "synthetic"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
                }`}
              >
                TEST / SYNTHETIC DATA ({syntheticCount})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              disabled={isAnalyzing || items.length === 0}
              onClick={() => void handleRunAnalysis()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#246B45] disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>
                {isAnalyzing
                  ? "Analyzing..."
                  : `Analyze ${items.length} Comment${items.length === 1 ? "" : "s"}`}
              </span>
            </button>
          </div>
        </div>

        {dataset === "synthetic" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>
              Viewing TEST / SYNTHETIC DATA only. These sample comments are
              strictly for testing and are never mixed with real DNSC user
              feedback.
            </span>
          </div>
        )}
      </section>

      {/* AI Analysis Result */}
      {analysis && (
        <section className="space-y-4 rounded-2xl border border-[#174D32]/30 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#174D32] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                <Sparkles className="h-3 w-3" />
                AI-Generated Summary
              </span>
              {analysis.datasetType === "synthetic" && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                  TEST / SYNTHETIC DATA
                </span>
              )}
              <span className="text-xs font-semibold text-slate-600">
                Feedback Analyzed: {analysis.analyzedCount}
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Analyzed: {new Date(analysis.analyzedAt).toLocaleString()}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-[#25352B]">
            {analysis.summary}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/45 p-4">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#174D32] uppercase">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>Positive Themes</span>
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#25352B]">
                {analysis.positiveThemes.length === 0 ? (
                  <li className="list-none text-slate-500">None identified.</li>
                ) : (
                  analysis.positiveThemes.map((t, i) => <li key={i}>{t}</li>)
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-orange-950 uppercase">
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>Negative Themes &amp; Common Complaints</span>
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-orange-950">
                {analysis.commonComplaints.length === 0 ? (
                  <li className="list-none text-slate-500">None identified.</li>
                ) : (
                  analysis.commonComplaints.map((c, i) => <li key={i}>{c}</li>)
                )}
              </ul>
            </div>
          </div>

          {analysis.suggestedImprovements.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-[#F5F5EF]/70 p-4">
              <h3 className="text-xs font-bold text-[#25352B] uppercase">
                Suggested Improvement Areas
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                {analysis.suggestedImprovements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="rounded-lg bg-[#F5F5EF] px-3 py-2 text-[11px] text-slate-600">
            <strong>Disclaimer:</strong> AI summaries are analytical suggestions
            derived only from the {analysis.analyzedCount} anonymized comments
            selected. Administrators must review the original feedback records
            below before making operational changes.
          </p>
        </section>
      )}

      {/* Original Feedback Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-[#25352B]">
            Original Feedback Records ({items.length})
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500">
            {dataset === "synthetic"
              ? 'No synthetic test feedback loaded yet. Click "Load Synthetic Test Data" above to test the Feedback Analyzer.'
              : "No real user feedback submitted yet."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold text-[#174D32]">
                      {item.category}
                    </span>
                    {item.rating && (
                      <span className="font-semibold text-slate-600">
                        Rating: {item.rating}/5
                      </span>
                    )}
                    {item.isSynthetic && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        SYNTHETIC
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1.5 text-slate-700">{item.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
