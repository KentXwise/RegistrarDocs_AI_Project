"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Loader2,
  Search,
  ShieldOff,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import type { AdminUserAction, AdminUserRecord } from "@/lib/db/admin-users";
import type { AccountStatus, UserRole } from "@/types/auth";

interface AdminUsersManagerProps {
  initialUsers: AdminUserRecord[];
  currentAdminId: string;
  mode: "all_users" | "student_approvals";
}

const STATUS_BADGE_STYLES: Record<AccountStatus, string> = {
  approved: "bg-[#E6EFE8] text-[#174D32] border-[#246B45]/25",
  active: "bg-[#E6EFE8] text-[#174D32] border-[#246B45]/25",
  pending_approval: "bg-amber-50 text-amber-900 border-amber-200",
  invitation_pending: "bg-amber-50 text-amber-900 border-amber-200",
  needs_correction: "bg-orange-50 text-orange-900 border-orange-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
};

const PAGE_SIZE = 15;

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

export function AdminUsersManager({
  initialUsers,
  currentAdminId,
  mode,
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">(
    mode === "student_approvals" ? "requester" : "all"
  );
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">(
    mode === "student_approvals" ? "pending_approval" : "all"
  );
  const [page, setPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(
    null
  );
  const [remarks, setRemarks] = useState("");
  const [pendingAction, setPendingAction] = useState<AdminUserAction | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (mode === "student_approvals" && u.role !== "requester") return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.studentId?.toLowerCase().includes(q) ?? false) ||
        (u.employeeId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, mode, roleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const openModal = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setRemarks(user.approvalRemarks ?? "");
    setPendingAction(null);
    setActionError(null);
    setActionSuccess(null);
  };

  const initiateAction = (action: AdminUserAction) => {
    setActionError(null);
    setActionSuccess(null);
    if (
      (action === "request_student_correction" || action === "reject_student") &&
      !remarks.trim()
    ) {
      setActionError(
        action === "request_student_correction"
          ? "Please enter a clear correction explanation for the student."
          : "Please enter a rejection reason before rejecting this account."
      );
      return;
    }
    setPendingAction(action);
  };

  const executeAction = async (action: AdminUserAction) => {
    if (!selectedUser || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(selectedUser.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            remarks: remarks.trim(),
          }),
        }
      );

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        user?: AdminUserRecord;
      } | null;

      if (!res.ok || !data?.user) {
        setPendingAction(null);
        setActionError(data?.error || "Unable to complete action.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === data.user!.id ? data.user! : u))
      );
      setSelectedUser(data.user);
      setPendingAction(null);
      setActionSuccess("Account updated and recorded in the Admin Audit Log.");
      router.refresh();
    } catch {
      setPendingAction(null);
      setActionError("A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
          {mode === "student_approvals" ? "Registration Review" : "Accounts"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
          {mode === "student_approvals"
            ? "Student Registration Approvals"
            : "User Management"}
        </h1>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          {mode === "student_approvals"
            ? "Review newly registered student accounts, verify uploaded Student IDs, and approve, request corrections, or reject."
            : "Search, filter, inspect, and manage all registered Requester, Staff, and Admin accounts."}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, Student ID, or Employee ID..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {mode === "all_users" && (
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as UserRole | "all");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#25352B] sm:text-sm"
              >
                <option value="all">All Roles</option>
                <option value="requester">Requester / Student</option>
                <option value="staff">Registrar Staff</option>
                <option value="admin">Admin</option>
              </select>
            )}

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AccountStatus | "all");
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#25352B] sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="needs_correction">Needs Correction</option>
              <option value="rejected">Rejected</option>
              {mode === "all_users" && (
                <>
                  <option value="active">Active</option>
                  <option value="invitation_pending">Invitation Pending</option>
                </>
              )}
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {paginated.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No user accounts matched your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-[#F5F5EF]/80 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">ID Number</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Registered</th>
                  <th className="px-5 py-3">Last Login</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F5F5EF]/50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#25352B]">
                        {u.fullName}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">
                      {u.studentId || u.employeeId || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-[#E6EFE8] px-2.5 py-0.5 text-[11px] font-bold text-[#174D32] uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          STATUS_BADGE_STYLES[u.status]
                        }`}
                      >
                        {u.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {formatDate(u.lastLoginAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(u)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
            <span>
              Page {safePage} of {totalPages} ({filtered.length} accounts)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1 font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-300 px-3 py-1 font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Account Review & Actions Modal */}
      {selectedUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-[#174D32] uppercase">
                  Account Management &middot; {selectedUser.role}
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-[#25352B]">
                  {selectedUser.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-[#E6EFE8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-xs">
              <dl className="grid gap-3 rounded-xl border border-slate-200 bg-[#F5F5EF]/60 p-4 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-500">Email</dt>
                  <dd className="mt-0.5 font-medium text-[#25352B]">
                    {selectedUser.email}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Status</dt>
                  <dd className="mt-0.5 font-bold capitalize text-[#174D32]">
                    {selectedUser.status.replace(/_/g, " ")}
                  </dd>
                </div>
                {selectedUser.role === "requester" && (
                  <>
                    <div>
                      <dt className="font-semibold text-slate-500">
                        Institute
                      </dt>
                      <dd className="mt-0.5 font-medium text-[#25352B]">
                        {selectedUser.institute || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Program</dt>
                      <dd className="mt-0.5 font-medium text-[#25352B]">
                        {selectedUser.program || "Not provided"}
                      </dd>
                    </div>
                  </>
                )}
                <div>
                  <dt className="font-semibold text-slate-500">
                    {selectedUser.role === "requester"
                      ? "Student ID"
                      : "Employee ID"}
                  </dt>
                  <dd className="mt-0.5 font-mono font-semibold text-[#25352B]">
                    {selectedUser.studentId ||
                      selectedUser.employeeId ||
                      "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Registered</dt>
                  <dd className="mt-0.5 text-[#25352B]">
                    {formatDate(selectedUser.createdAt)}
                  </dd>
                </div>
              </dl>

              {selectedUser.hasStudentIdImage && (
                <div className="flex items-center justify-between rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/45 p-3.5">
                  <div>
                    <p className="font-bold text-[#174D32]">
                      Submitted Student ID Verification File
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Private Admin-only access via secure backend stream.
                    </p>
                  </div>
                  <a
                    href={`/api/admin/users/${encodeURIComponent(selectedUser.id)}/student-id`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#246B45]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Inspect ID</span>
                  </a>
                </div>
              )}

              {selectedUser.role === "requester" && (
                <div>
                  <label
                    htmlFor="admin-approval-remarks"
                    className="block font-semibold text-[#25352B]"
                  >
                    Correction / Rejection Reason (Required for Correction or
                    Rejection)
                  </label>
                  <textarea
                    id="admin-approval-remarks"
                    rows={2}
                    maxLength={1000}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Provide clear instructions if requesting a correction or rejecting this registration..."
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                  />
                </div>
              )}

              {pendingAction ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-bold text-amber-950">
                    Confirm Administrative Action:{" "}
                    {pendingAction.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-amber-900">
                    This change takes effect immediately and will be permanently
                    recorded in the Admin Audit Log.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void executeAction(pendingAction)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#246B45] disabled:opacity-60"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      <span>Confirm</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setPendingAction(null)}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#25352B]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedUser.role === "requester" &&
                    selectedUser.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => initiateAction("approve_student")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#246B45]"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Approve Student</span>
                      </button>
                    )}

                  {selectedUser.role === "requester" &&
                    selectedUser.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() =>
                          initiateAction("request_student_correction")
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-900 hover:bg-orange-100"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Request Correction</span>
                      </button>
                    )}

                  {selectedUser.role === "requester" &&
                    selectedUser.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => initiateAction("reject_student")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                  {selectedUser.status === "inactive" ||
                  selectedUser.status === "invitation_pending" ? (
                    <button
                      type="button"
                      onClick={() => initiateAction("activate_account")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#246B45]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Activate Account</span>
                    </button>
                  ) : (
                    selectedUser.id !== currentAdminId && (
                      <button
                        type="button"
                        onClick={() => initiateAction("deactivate_account")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        <span>Deactivate Account</span>
                      </button>
                    )
                  )}
                </div>
              )}

              {actionSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-[#246B45]/30 bg-[#E6EFE8] p-3 text-xs text-[#25352B]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-[#F5F5EF]/60 px-6 py-3">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-[#25352B]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
