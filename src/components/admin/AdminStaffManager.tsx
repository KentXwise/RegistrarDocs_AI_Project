"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  X,
} from "lucide-react";
import type { AdminUserRecord } from "@/lib/db/admin-users";

interface AdminStaffManagerProps {
  initialStaff: AdminUserRecord[];
}

interface EmailDeliveryResponse {
  sent: boolean;
  provider: string;
  error?: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminStaffManager({ initialStaff }: AdminStaffManagerProps) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<AdminUserRecord[]>(initialStaff);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Create Staff Form (no manual initial password!)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<"active" | "invitation_pending">(
    "active"
  );
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Row action state
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.employeeId?.toLowerCase().includes(q) ?? false)
    );
  }, [staffList, search]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setCreateError(null);
    setIsCreating(true);

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          employeeId: employeeId.trim() || undefined,
          status,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        user?: AdminUserRecord;
        emailDelivery?: EmailDeliveryResponse;
      } | null;

      if (!res.ok || !data?.user) {
        setCreateError(data?.error || "Unable to create Staff account.");
        return;
      }

      setStaffList((prev) => [data.user!, ...prev]);
      setFullName("");
      setEmail("");
      setEmployeeId("");
      setStatus("active");
      setCreateOpen(false);

      if (data.emailDelivery?.sent) {
        setFeedback({
          type: "success",
          message:
            data.emailDelivery.provider === "supabase"
              ? `Staff account created successfully. A secure password-setup email has been sent to ${data.user.email} via Supabase Auth so the Staff member can set their password and sign in.`
              : `Staff account created successfully. Onboarding instructions have been sent to ${data.user.email}. The Staff member must change their temporary password on their first login.`,
        });
      } else {
        setFeedback({
          type: "warning",
          message: `Staff account for ${data.user.fullName} was created, but the onboarding email could not be sent (${data.emailDelivery?.error || "email delivery unavailable"}). Please check email configuration and use "Resend Onboarding".`,
        });
      }
      router.refresh();
    } catch {
      setCreateError("Network error while creating Staff account.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendOnboarding = async (member: AdminUserRecord) => {
    if (resendingId) return;
    if (
      !window.confirm(
        `Generate a new temporary password and resend onboarding instructions to ${member.email}?`
      )
    ) {
      return;
    }

    setResendingId(member.id);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/staff/${encodeURIComponent(member.id)}/resend-onboarding`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        emailDelivery?: EmailDeliveryResponse;
      } | null;

      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data?.error || "Unable to resend onboarding email.",
        });
        return;
      }

      if (data?.emailDelivery?.sent) {
        setFeedback({
          type: "success",
          message:
            data.emailDelivery.provider === "supabase"
              ? `A fresh password-setup email has been sent to ${member.email} via Supabase Auth.`
              : `Fresh temporary credentials and onboarding instructions were sent to ${member.email}.`,
        });
      } else {
        setFeedback({
          type: "warning",
          message: `Temporary credentials were rotated, but the onboarding email could not be sent (${data?.emailDelivery?.error || "email delivery unavailable"}).`,
        });
      }
      router.refresh();
    } finally {
      setResendingId(null);
    }
  };

  const handleToggleStatus = async (member: AdminUserRecord) => {
    const action =
      member.status === "active" ? "deactivate_account" : "activate_account";
    if (
      action === "deactivate_account" &&
      !window.confirm(
        `Deactivate Staff account for ${member.fullName}? They will no longer be able to access Registrar Staff routes.`
      )
    ) {
      return;
    }

    setBusyId(member.id);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(member.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        user?: AdminUserRecord;
      } | null;

      if (!res.ok || !data?.user) {
        setFeedback({
          type: "error",
          message: data?.error || "Unable to update Staff account.",
        });
        return;
      }

      setStaffList((prev) =>
        prev.map((s) => (s.id === data.user!.id ? data.user! : s))
      );
      setFeedback({
        type: "success",
        message: `${data.user.fullName} is now ${data.user.status.replace(/_/g, " ")}.`,
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Registrar Personnel
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            Staff Account Management
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Provision Registrar Staff accounts with automatic secure temporary
            credentials and manage account activation status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#246B45]"
        >
          <Plus className="h-4 w-4" />
          <span>Create Staff Account</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-xl border p-3.5 text-xs font-medium ${
            feedback.type === "success"
              ? "border-[#246B45]/30 bg-[#E6EFE8] text-[#25352B]"
              : feedback.type === "warning"
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
          ) : feedback.type === "warning" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          )}
          <span>{feedback.message}</span>
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
              placeholder="Search Staff by name, email, or Employee ID..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 sm:text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No Staff accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-[#F5F5EF]/80 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Staff Member</th>
                  <th className="px-5 py-3">Employee ID</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Last Login</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F5F5EF]/50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#25352B]">
                        {s.fullName}
                      </p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">
                      {s.employeeId || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          s.status === "active"
                            ? "border-[#246B45]/25 bg-[#E6EFE8] text-[#174D32]"
                            : s.status === "invitation_pending"
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {formatDate(s.lastLoginAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {s.status !== "inactive" && (
                          <button
                            type="button"
                            disabled={resendingId === s.id}
                            onClick={() => void handleResendOnboarding(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#174D32]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8] disabled:opacity-50"
                          >
                            {resendingId === s.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            <span>Resend Onboarding</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => void handleToggleStatus(s)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            s.status === "active"
                              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              : "border-[#174D32]/30 bg-[#E6EFE8] text-[#174D32] hover:bg-[#174D32] hover:text-white"
                          }`}
                        >
                          {s.status === "active" ? (
                            <>
                              <ShieldOff className="h-3.5 w-3.5" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Activate</span>
                            </>
                          )}
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

      {/* Create Staff Modal (Automatic Secure Temporary Credentials) */}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-[#25352B]">
                Create Registrar Staff Account
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-[#E6EFE8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateStaff}
              className="space-y-3.5 p-6 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#25352B]">
                  Full Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Maria Clara Santos"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#25352B]">
                  Official Email <span className="text-red-700">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@dnsc.edu.ph"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#25352B]">
                  Employee ID (Optional)
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g., EMP-2026-002"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#25352B]">
                  Initial Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "active" | "invitation_pending"
                    )
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B]"
                >
                  <option value="active">Active (Immediate Access)</option>
                  <option value="invitation_pending">Invitation Pending</option>
                </select>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/60 p-3 text-[11px] leading-relaxed text-[#25352B]">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
                  aria-hidden="true"
                />
                <span>
                  RegistrarDocs AI will securely generate temporary login
                  credentials and send account access instructions to the Staff
                  member&apos;s official email address. The Staff member will be
                  required to change their password upon their first login.
                </span>
              </div>

              {createError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-[#25352B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 font-semibold text-white hover:bg-[#246B45] disabled:opacity-60"
                >
                  {isCreating && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{isCreating ? "Creating..." : "Create Staff"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
