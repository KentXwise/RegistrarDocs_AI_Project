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
  X,
} from "lucide-react";
import type { AdminDocumentTypeRecord } from "@/lib/db/admin-catalog";

interface AdminDocumentTypesManagerProps {
  initialDocumentTypes: AdminDocumentTypeRecord[];
  schemaReady: boolean;
}

export function AdminDocumentTypesManager({
  initialDocumentTypes,
  schemaReady,
}: AdminDocumentTypesManagerProps) {
  const router = useRouter();
  const [items, setItems] =
    useState<AdminDocumentTypeRecord[]>(initialDocumentTypes);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDocumentTypeRecord | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [category, setCategory] = useState("Registrar Document");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [processingInfo, setProcessingInfo] = useState("");
  const [requiresAdditionalNotes, setRequiresAdditionalNotes] = useState(false);
  const [additionalNotesLabel, setAdditionalNotesLabel] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setShortLabel("");
    setCategory("Registrar Document");
    setShortDescription("");
    setFullDescription("");
    setInstructions("");
    setProcessingInfo("");
    setRequiresAdditionalNotes(false);
    setAdditionalNotesLabel("");
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: AdminDocumentTypeRecord) => {
    setEditing(item);
    setCode(item.code);
    setName(item.name);
    setShortLabel(item.shortLabel);
    setCategory(item.category);
    setShortDescription(item.shortDescription);
    setFullDescription(item.fullDescription);
    setInstructions(item.instructions ?? "");
    setProcessingInfo(item.processingInfo ?? "");
    setRequiresAdditionalNotes(item.requiresAdditionalNotes);
    setAdditionalNotesLabel(item.additionalNotesLabel ?? "");
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/document-types", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : { code }),
          name,
          shortLabel,
          category,
          shortDescription,
          fullDescription,
          instructions,
          processingInfo,
          requiresAdditionalNotes,
          additionalNotesLabel,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        documentType?: AdminDocumentTypeRecord;
      } | null;

      if (!res.ok || !data?.documentType) {
        setError(data?.error || "Unable to save document type.");
        return;
      }

      if (editing) {
        setItems((prev) =>
          prev.map((d) =>
            d.id === data.documentType!.id ? data.documentType! : d
          )
        );
        setBanner(`Updated "${data.documentType.name}".`);
      } else {
        setItems((prev) => [...prev, data.documentType!]);
        setBanner(`Added document type "${data.documentType.name}".`);
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: AdminDocumentTypeRecord) => {
    const res = await fetch("/api/admin/document-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    const data = (await res.json().catch(() => null)) as {
      documentType?: AdminDocumentTypeRecord;
    } | null;
    if (res.ok && data?.documentType) {
      setItems((prev) =>
        prev.map((d) =>
          d.id === data.documentType!.id ? data.documentType! : d
        )
      );
      setBanner(
        `"${data.documentType.name}" is now ${data.documentType.isActive ? "Enabled for Requesters" : "Disabled (historical requests preserved)"}.`
      );
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Catalog Configuration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            Document Types Management
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Configure academic document services offered by the DNSC
            Registrar&apos;s Office. Disabling a type prevents new requests
            without affecting historical records.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#246B45]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Document Type</span>
        </button>
      </div>

      {!schemaReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          Migration <code>0005_admin_management_and_audit.sql</code> has not
          been executed in Supabase yet. Run it to enable live Document Type
          persistence.
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
              placeholder="Search document types..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] sm:text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No document types found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-[#F5F5EF]/80 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Document Type</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Availability</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#F5F5EF]/50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#25352B]">{doc.name}</p>
                      <p className="mt-0.5 max-w-md truncate text-xs text-slate-500">
                        {doc.shortDescription}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#174D32]">
                      {doc.code}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {doc.category}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          doc.isActive
                            ? "border-[#246B45]/25 bg-[#E6EFE8] text-[#174D32]"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {doc.isActive ? "Available" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(doc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#25352B] hover:bg-[#E6EFE8]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(doc)}
                          className="rounded-lg border border-[#174D32]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
                        >
                          {doc.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-[#25352B]">
                {editing ? "Edit Document Type" : "Add Document Type"}
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
              <div className="grid gap-3 sm:grid-cols-2">
                {!editing && (
                  <div>
                    <label className="block font-semibold text-[#25352B]">
                      Unique Code <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g., cog, gmc"
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-[#25352B]">
                    Document Name <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Certificate of Grades"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#25352B]">
                    Short Label
                  </label>
                  <input
                    type="text"
                    value={shortLabel}
                    onChange={(e) => setShortLabel(e.target.value)}
                    placeholder="e.g., COG"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
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

              <div>
                <label className="block font-semibold text-[#25352B]">
                  Short Description <span className="text-red-700">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#25352B]">
                  Full Description
                </label>
                <textarea
                  rows={2}
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#25352B]">
                  Instructions (one per line)
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#25352B]">
                  Processing Information
                </label>
                <textarea
                  rows={2}
                  value={processingInfo}
                  onChange={(e) => setProcessingInfo(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#25352B]">
                <input
                  type="checkbox"
                  checked={requiresAdditionalNotes}
                  onChange={(e) => setRequiresAdditionalNotes(e.target.checked)}
                  className="h-4 w-4 accent-[#174D32]"
                />
                <span>Require requester to enter Additional Details</span>
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 font-semibold text-white hover:bg-[#246B45] disabled:opacity-60"
                >
                  {isSaving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{isSaving ? "Saving..." : "Save"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
