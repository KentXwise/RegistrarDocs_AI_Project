"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { AdminFaqRecord } from "@/lib/db/admin-catalog";

interface AdminFaqsManagerProps {
  initialFaqs: AdminFaqRecord[];
  schemaReady: boolean;
}

export function AdminFaqsManager({
  initialFaqs,
  schemaReady,
}: AdminFaqsManagerProps) {
  const router = useRouter();
  const [faqs, setFaqs] = useState<AdminFaqRecord[]>(initialFaqs);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFaqRecord | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [isPublished, setIsPublished] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const openCreate = () => {
    setEditing(null);
    setQuestion("");
    setAnswer("");
    setCategory("General");
    setIsPublished(true);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (faq: AdminFaqRecord) => {
    setEditing(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category);
    setIsPublished(faq.isPublished);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/faqs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          question,
          answer,
          category,
          isPublished,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        faq?: AdminFaqRecord;
      } | null;

      if (!res.ok || !data?.faq) {
        setError(data?.error || "Unable to save FAQ.");
        return;
      }

      if (editing) {
        setFaqs((prev) =>
          prev.map((f) => (f.id === data.faq!.id ? data.faq! : f))
        );
        setBanner("FAQ updated.");
      } else {
        setFaqs((prev) => [data.faq!, ...prev]);
        setBanner("FAQ created.");
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (faq: AdminFaqRecord) => {
    const res = await fetch("/api/admin/faqs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: faq.id, isPublished: !faq.isPublished }),
    });
    const data = (await res.json().catch(() => null)) as {
      faq?: AdminFaqRecord;
    } | null;
    if (res.ok && data?.faq) {
      setFaqs((prev) =>
        prev.map((f) => (f.id === data.faq!.id ? data.faq! : f))
      );
      router.refresh();
    }
  };

  const handleDelete = async (faq: AdminFaqRecord) => {
    if (!window.confirm("Delete this FAQ permanently?")) return;
    const res = await fetch(
      `/api/admin/faqs?id=${encodeURIComponent(faq.id)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
      setBanner("FAQ deleted.");
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Approved Guidance
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            FAQ Management
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Manage published Registrar FAQs displayed in the Requester Help
            section and approved for informational guidance.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#246B45]"
        >
          <Plus className="h-4 w-4" />
          <span>Add FAQ</span>
        </button>
      </div>

      {!schemaReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          Run migration <code>0005_admin_management_and_audit.sql</code> in
          Supabase to persist Admin-managed FAQs.
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
              placeholder="Search FAQs by question, answer, or category..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] sm:text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No FAQs found. Click &ldquo;Add FAQ&rdquo; to publish approved
            Registrar guidance.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((faq) => (
              <li key={faq.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#E6EFE8] px-2.5 py-0.5 text-[10px] font-bold text-[#174D32] uppercase">
                        {faq.category}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          faq.isPublished
                            ? "bg-[#174D32] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {faq.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-[#25352B]">
                      {faq.question}
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(faq)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-[#E6EFE8]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTogglePublish(faq)}
                      className="rounded-lg border border-[#174D32]/30 px-2.5 py-1.5 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
                    >
                      {faq.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(faq)}
                      aria-label="Delete FAQ"
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-[#25352B]">
                {editing ? "Edit FAQ" : "Add FAQ"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3 p-6 text-xs">
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Document Requests, Claiming, Account Approval"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Question <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Answer <span className="text-red-700">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#25352B]">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 accent-[#174D32]"
                />
                <span>Publish immediately for Requesters</span>
              </label>
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
                  <span>Save FAQ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
