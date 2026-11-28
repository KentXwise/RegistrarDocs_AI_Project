import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LoaderCircle,
  PackageCheck,
  XCircle,
} from "lucide-react";
import type { DocumentRequestStatus } from "@/types/requester";

export const REQUEST_STATUS_META: Record<
  DocumentRequestStatus,
  {
    label: string;
    description: string;
    className: string;
    icon: typeof Clock;
  }
> = {
  pending: {
    label: "Submitted / Pending",
    description: "Awaiting initial review by DNSC Registrar Staff.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Clock,
  },
  processing: {
    label: "Under Processing",
    description: "Your document is currently being prepared by Registrar Staff.",
    className: "border-[#246B45]/25 bg-[#E6EFE8] text-[#174D32]",
    icon: LoaderCircle,
  },
  needs_correction: {
    label: "Needs Correction",
    description:
      "Action required: review the recorded correction instructions and resubmit.",
    className: "border-orange-300 bg-orange-50 text-orange-900",
    icon: AlertTriangle,
  },
  ready_for_release: {
    label: "Ready for Release",
    description:
      "Your document is ready. Bring valid ID for Registrar Staff release verification.",
    className: "border-[#174D32]/30 bg-[#174D32] text-white",
    icon: PackageCheck,
  },
  released: {
    label: "Released",
    description: "This document has been officially released.",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    description: "This request was not approved by the Registrar's Office.",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle,
  },
};

export function RequestStatusBadge({
  status,
}: {
  status: DocumentRequestStatus;
}) {
  const meta = REQUEST_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}
