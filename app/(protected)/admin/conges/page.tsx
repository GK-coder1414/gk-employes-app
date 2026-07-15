"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, updateDoc, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import type { UserProfile, LeaveRequest, LeaveStatus } from "@/lib/types";
import { LEAVE_TYPE_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckIcon, XIcon } from "@/components/icons";
import { Spinner } from "@/components/Spinner";

const FILTERS: { value: LeaveStatus | "all"; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvés" },
  { value: "rejected", label: "Refusés" },
  { value: "all", label: "Tous" },
];

export default function AdminCongesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [filter, setFilter] = useState<LeaveStatus | "all">("pending");

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "leaveRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setRequests(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            type: data.type,
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason,
            status: data.status,
            createdAt: (data.createdAt as Timestamp).toMillis(),
            reviewedBy: data.reviewedBy ?? null,
            reviewedAt: data.reviewedAt ? (data.reviewedAt as Timestamp).toMillis() : null,
            adminComment: data.adminComment ?? null,
          } satisfies LeaveRequest;
        })
      );
    });
  }, []);

  const usersById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users?.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    if (!requests) return [];
    return filter === "all" ? requests : requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  async function review(request: LeaveRequest, status: "approved" | "rejected") {
    if (!user) return;
    await updateDoc(doc(db, "leaveRequests", request.id), {
      status,
      reviewedBy: user.uid,
      reviewedAt: Timestamp.now(),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Demandes de congé</h1>

      <div className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? "bg-blue-600 text-white" : "bg-white text-zinc-600 border border-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {requests === null ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucune demande.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const employee = usersById.get(r.userId);
            return (
              <li key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">
                      {employee ? `${employee.firstName} ${employee.lastName}` : "Employé"}
                    </p>
                    <p className="text-xs text-zinc-500">{LEAVE_TYPE_LABELS[r.type]}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  {format(new Date(r.startDate), "d MMM yyyy", { locale: fr })} –{" "}
                  {format(new Date(r.endDate), "d MMM yyyy", { locale: fr })}
                </p>
                {r.reason && <p className="mt-1 text-sm text-zinc-500">{r.reason}</p>}

                {r.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => review(r, "approved")}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Approuver
                    </button>
                    <button
                      onClick={() => review(r, "rejected")}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <XIcon className="h-4 w-4" />
                      Refuser
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
