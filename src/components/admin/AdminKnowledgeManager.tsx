"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  AdminKnowledgeSourceRecord,
  KnowledgeSourceType,
} from "@/lib/db/admin-catalog";

interface AdminKnowledgeManagerProps {
  initialSources: AdminKnowledgeSourceRecord[];
  schemaReady: boolean;
}

const SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
  official_document: "Official Document",
  registrar_procedure: "Registrar Procedure",
  document_requirements: "Document Requirements",
  institutional_faq: "Institutional FAQ",
  official_webpage: "Official Webpage",
};

export function AdminKnowledgeManager({
  initialSources,
  schemaReady,
}: AdminKnowledgeManagerProps) {
  const router = useRouter();
  const [sources, setSources] =
    useState<AdminKnowledgeSourceRecord[]>(initialSources);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminKnowledgeSourceRecord | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Document requirements");
  const [sourceType, setSourceType] =
    useState<KnowledgeSourceType>("registrar_procedure");
  const [sourceUrl, setSourceUrl] = useState("https://dnsc.edu.ph/college-registrar/");
  const [contentSummary, setContentSummary] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [isVerified, setIsVerified] = useState(true);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.contentSummary.toLowerCase().includes(q)
    );
  }, [sources, search]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setCategory("Document requirements");
    setSourceType("registrar_procedure");
    setSourceUrl("https://dnsc.edu.ph/college-registrar/");
    setContentSummary("");
    setIsEnabled(true);
    setIsVerified(true);
    setLastVerifiedAt(new Date().toISOString().slice(0, 10));
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: AdminKnowledgeSourceRecord) => {
    setEditing(item);
    setTitle(item.title);
    setCategory(item.category);
    setSourceType(item.sourceType);
    setSourceUrl(item.sourceUrl ?? "");
    setContentSummary(item.contentSummary);
    setIsEnabled(item.isEnabled);
    setIsVerified(item.isVerified);
    setLastVerifiedAt(
      item.lastVerifiedAt ?? new Date().toISOString().slice(0, 10)
    );
    setError(null);
    setModalOpen(true);
  };

  const handleSeedOfficial = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/knowledge-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_official_dnsc" }),
      });
      const data = (await res.json().catch(() => null)) as {
        insertedCount?: number;
        sources?: AdminKnowledgeSourceRecord[];
        error?: string;
      } | null;
      if (res.ok && data?.sources) {
        setSources(data.sources);
        setBanner(
          data.insertedCount && data.insertedCount > 0
            ? `Seeded ${data.insertedCount} official DNSC Registrar knowledge entries.`
            : "All official DNSC Registrar knowledge entries are already seeded."
        );
        router.refresh();
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/knowledge-sources", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          title,
          category,
          sourceType,
          sourceUrl,
          contentSummary,
          isEnabled,
          isVerified,
          lastVerifiedAt,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        source?: AdminKnowledgeSourceRecord;
      } | null;

      if (!res.ok || !data?.source) {
        setError(data?.error || "Unable to save knowledge source.");
        return;
      }

      if (editing) {
        setSources((prev) =>
          prev.map((s) => (s.id === data.source!.id ? data.source! : s))
        );
        setBanner(`Updated "${data.source.title}".`);
      } else {
        setSources((prev) => [data.source!, ...prev]);
        setBanner(`Added approved knowledge source "${data.source.title}".`);
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (
    item: AdminKnowledgeSourceRecord,
    field: "isEnabled" | "isVerified"
  ) => {
    const res = await fetch("/api/admin/knowledge-sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        [field]: !item[field],
        ...(field === "isVerified" && !item.isVerified
          ? { lastVerifiedAt: new Date().toISOString().slice(0, 10) }
          : {}),
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      source?: AdminKnowledgeSourceRecord;
    } | null;
    if (res.ok && data?.source) {
      setSources((prev) =>
        prev.map((s) => (s.id === data.source!.id ? data.source! : s))
      );
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            AI Assistant Knowledge Base
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            Approved AI Knowledge Sources
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Only <strong>Enabled</strong> and <strong>Verified</strong> entries
            are used by the AI Registrar Assistant.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSeeding}
            onClick={() => void handleSeedOfficial()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#174D32] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8] disabled:opacity-60"
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span>Seed Official DNSC Knowledge</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#246B45]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Approved Source</span>
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/60 p-4 text-xs text-[#25352B]">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
        <p className="leading-relaxed text-slate-700">
          <strong className="font-semibold text-[#174D32]">
            Informational Assistance Only:
          </strong>{" "}
          The AI Registrar Assistant answers strictly from enabled &amp;
          verified entries below. It cannot approve or reject registrations,
          modify request statuses, or fabricate fees or unverified document
          checklists.
        </p>
      </div>

      {!schemaReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          Run migrations <code>0005</code> and <code>0007</code> in Supabase to
          persist knowledge sources.
        </div>
      )}

      {banner && (
        <div className="flex items-center gap-2 rounded-xl border border-[#246B45]/30 bg-[#E6EFE8] p-3.5 text-xs font-medium text-[#25352B]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#174D32]" />
          <span>{banner}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search approved knowledge entries..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] sm:text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No knowledge entries found. Click{" "}
            <strong>Seed Official DNSC Knowledge</strong> to populate the
            verified DNSC Registrar sources.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((src) => {
              const availableToAi = src.isEnabled && src.isVerified;
              return (
                <li key={src.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[#E6EFE8] px-2.5 py-0.5 text-[10px] font-bold text-[#174D32] uppercase">
                          {src.category}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            availableToAi
                              ? "bg-[#174D32] text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {availableToAi
                            ? "Available to AI"
                            : "Excluded from AI"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            src.isVerified
                              ? "bg-emerald-50 text-[#174D32]"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {src.isVerified ? "Verified" : "Unverified"}
                        </span>
                        {src.lastVerifiedAt && (
                          <span className="text-[10px] text-slate-500">
                            Reviewed: {src.lastVerifiedAt}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-[#25352B]">
                        {src.title}
                      </h3>
                      <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                        {src.contentSummary}
                      </p>
                      {src.sourceUrl && (
                        <a
                          href={src.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#174D32] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{src.sourceUrl}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(src)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-[#E6EFE8]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggle(src, "isVerified")}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-[#25352B] hover:bg-[#E6EFE8]"
                      >
                        {src.isVerified ? "Mark Unverified" : "Mark Verified"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggle(src, "isEnabled")}
                        className="rounded-lg border border-[#174D32]/30 px-2.5 py-1.5 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
                      >
                        {src.isEnabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-[#25352B]">
                {editing ? "Edit Approved Source" : "Add Approved Source"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={handleSave}
              className="flex-1 space-y-3 overflow-y-auto p-6 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Source Title <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-[#25352B]">
                    Source Type
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) =>
                      setSourceType(e.target.value as KnowledgeSourceType)
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#25352B]">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-[#25352B]">
                    Official Source URL
                  </label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://dnsc.edu.ph/college-registrar/"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#25352B]">
                    Last Verified Date
                  </label>
                  <input
                    type="date"
                    value={lastVerifiedAt}
                    onChange={(e) => setLastVerifiedAt(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Approved Content Used by AI{" "}
                  <span className="text-red-700">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={contentSummary}
                  onChange={(e) => setContentSummary(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-[#25352B]">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="h-4 w-4 accent-[#174D32]"
                  />
                  <span>Enabled</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#25352B]">
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="h-4 w-4 accent-[#174D32]"
                  />
                  <span>Verified Official Source</span>
                </label>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 font-semibold text-white hover:bg-[#246B45]"
                >
                  {isSaving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Save Source</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
