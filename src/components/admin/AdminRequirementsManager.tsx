"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Edit3, Loader2, Plus, X } from "lucide-react";
import type {
  AdminDocumentTypeRecord,
  AdminRequirementRecord,
} from "@/lib/db/admin-catalog";

interface AdminRequirementsManagerProps {
  initialRequirements: AdminRequirementRecord[];
  documentTypes: AdminDocumentTypeRecord[];
  schemaReady: boolean;
}

export function AdminRequirementsManager({
  initialRequirements,
  documentTypes,
  schemaReady,
}: AdminRequirementsManagerProps) {
  const router = useRouter();
  const [items, setItems] =
    useState<AdminRequirementRecord[]>(initialRequirements);
  const [docFilter, setDocFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRequirementRecord | null>(null);

  const [documentTypeId, setDocumentTypeId] = useState(
    documentTypes[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const docNameMap = useMemo(
    () => new Map(documentTypes.map((d) => [d.id, d.name])),
    [documentTypes]
  );

  const filtered = useMemo(() => {
    if (docFilter === "all") return items;
    return items.filter((r) => r.documentTypeId === docFilter);
  }, [items, docFilter]);

  const openCreate = () => {
    setEditing(null);
    setDocumentTypeId(docFilter !== "all" ? docFilter : documentTypes[0]?.id ?? "");
    setTitle("");
    setDescription("");
    setIsMandatory(true);
    setDisplayOrder(items.length + 1);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: AdminRequirementRecord) => {
    setEditing(item);
    setDocumentTypeId(item.documentTypeId);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setIsMandatory(item.isMandatory);
    setDisplayOrder(item.displayOrder);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/requirements", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          documentTypeId,
          title,
          description,
          isMandatory,
          displayOrder,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        requirement?: AdminRequirementRecord;
      } | null;

      if (!res.ok || !data?.requirement) {
        setError(data?.error || "Unable to save requirement.");
        return;
      }

      const enriched: AdminRequirementRecord = {
        ...data.requirement,
        documentTypeName: docNameMap.get(data.requirement.documentTypeId),
      };

      if (editing) {
        setItems((prev) =>
          prev.map((r) => (r.id === enriched.id ? enriched : r))
        );
        setBanner(`Updated requirement "${enriched.title}".`);
      } else {
        setItems((prev) => [...prev, enriched]);
        setBanner(`Added requirement "${enriched.title}".`);
      }
      setModalOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: AdminRequirementRecord) => {
    const res = await fetch("/api/admin/requirements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    const data = (await res.json().catch(() => null)) as {
      requirement?: AdminRequirementRecord;
    } | null;
    if (res.ok && data?.requirement) {
      setItems((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...data.requirement!, documentTypeName: r.documentTypeName }
            : r
        )
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
            Requirements Management
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Configure mandatory and optional requirements per document type.
            Changes appear dynamically in the Requester catalog without altering
            historical requests.
          </p>
        </div>

        <button
          type="button"
          disabled={documentTypes.length === 0}
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#246B45] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Add Requirement</span>
        </button>
      </div>

      {!schemaReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          Migration <code>0005_admin_management_and_audit.sql</code> must be
          executed in Supabase to manage document requirements.
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
          <select
            aria-label="Filter requirements by document type"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#25352B] sm:text-sm"
          >
            <option value="all">All Document Types</option>
            {documentTypes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No requirements configured yet. Click &ldquo;Add Requirement&rdquo;
            to configure requirements for a document type.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-[#F5F5EF]/80 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Requirement</th>
                  <th className="px-5 py-3">Document Type</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F5F5EF]/50">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                      #{req.displayOrder}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#25352B]">{req.title}</p>
                      {req.description && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {req.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-[#174D32]">
                      {req.documentTypeName ||
                        docNameMap.get(req.documentTypeId) ||
                        "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          req.isMandatory
                            ? "bg-[#E6EFE8] text-[#174D32]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {req.isMandatory ? "Mandatory" : "Optional"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {req.isActive ? "Active" : "Inactive"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(req)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-[#E6EFE8]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(req)}
                          className="rounded-lg border border-[#174D32]/30 px-2.5 py-1.5 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
                        >
                          {req.isActive ? "Deactivate" : "Activate"}
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
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-[#25352B]">
                {editing ? "Edit Requirement" : "Add Requirement"}
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
                  Document Type <span className="text-red-700">*</span>
                </label>
                <select
                  required
                  value={documentTypeId}
                  onChange={(e) => setDocumentTypeId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  {documentTypes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Requirement Title <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Valid DNSC Student ID or Government ID"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#25352B]">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={displayOrder}
                    onChange={(e) =>
                      setDisplayOrder(Number.parseInt(e.target.value, 10) || 0)
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 text-xs text-[#25352B]">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    className="h-4 w-4 accent-[#174D32]"
                  />
                  <span>Mandatory</span>
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
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
