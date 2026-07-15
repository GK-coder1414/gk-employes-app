import type { LeaveStatus } from "@/lib/types";
import { LEAVE_STATUS_LABELS } from "@/lib/types";

const STYLES: Record<LeaveStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}>
      {LEAVE_STATUS_LABELS[status]}
    </span>
  );
}
