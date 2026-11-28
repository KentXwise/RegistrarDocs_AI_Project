"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AdminAuditLogRecord } from "@/lib/db/admin-audit";

interface AdminAuditLogsViewProps {
  initialLogs: AdminAuditLogRecord[];
  schemaReady: boolean;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminAuditLogsView({
  initialLogs,
  schemaReady,
}: AdminAuditLogsViewProps) {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialLogs.filter((log) => {
      if (entityFilter !== "all" && log.entityType !== entityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        (log.entityLabel?.toLowerCase().includes(q) ?? false) ||
        log.description.toLowerCase().includes(q)
      );
    });
  }, [initialLogs, entityFilter, search]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
          System Oversight
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
          Administrative Audit Logs
        </h1>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Immutable, chronological record of all administrative actions
          performed across RegistrarDocs AI.
        </p>
      </div>

      {!schemaReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          Run migration <code>0005_admin_management_and_audit.sql</code> in
          Supabase to persist and view administrative audit logs.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by admin, action, affected record, or description..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] sm:text-sm"
            />
          </div>

          <select
            aria-label="Filter audit logs by module"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#25352B] sm:text-sm"
          >
            <option value="all">All Modules</option>
            <option value="document_request">Request Workflow</option>
            <option value="student_registration">Student Approvals</option>
            <option value="staff_account">Staff Accounts</option>
            <option value="user">User Accounts</option>
            <option value="document_type">Document Types</option>
            <option value="requirement">Requirements</option>
            <option value="faq">FAQs</option>
            <option value="ai_knowledge_source">AI Knowledge Sources</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No administrative audit events recorded yet matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-[#F5F5EF]/80 font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Date &amp; Time</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Affected Record</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F5EF]/50">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#25352B]">
                        {log.actorName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {log.actorRole}
                        {log.actorAccountRef ? ` · ${log.actorAccountRef}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-block rounded-full bg-[#E6EFE8] px-2.5 py-0.5 font-semibold text-[#174D32]">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#25352B]">
                        {log.entityLabel || log.entityId || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {log.entityType.replace(/_/g, " ")}
                      </p>
                    </td>
                    <td className="max-w-md px-5 py-3 text-slate-700">
                      <p>{log.description}</p>
                      {(log.previousValue || log.newValue) && (
                        <p className="mt-1 font-mono text-[10px] text-slate-500">
                          {log.previousValue
                            ? `Before: ${JSON.stringify(log.previousValue)}`
                            : ""}
                          {log.previousValue && log.newValue ? " → " : ""}
                          {log.newValue
                            ? `After: ${JSON.stringify(log.newValue)}`
                            : ""}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
