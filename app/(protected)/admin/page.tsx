"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { db } from "@/lib/firebase/client";
import type { UserProfile, TimeEntry, LeaveRequest } from "@/lib/types";
import { LEAVE_TYPE_LABELS } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[] | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[] | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })));
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "timeEntries"),
      where("timestamp", ">=", Timestamp.fromDate(startOfDay(new Date()))),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snap) => {
      setTodayEntries(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            type: data.type,
            timestamp: (data.timestamp as Timestamp).toMillis(),
            lat: data.lat ?? null,
            lng: data.lng ?? null,
            accuracy: data.accuracy ?? null,
          } satisfies TimeEntry;
        })
      );
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "leaveRequests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setPendingLeaves(
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

  const presentNow = useMemo(() => {
    if (!todayEntries) return [];
    const lastByUser = new Map<string, TimeEntry>();
    for (const entry of todayEntries) lastByUser.set(entry.userId, entry);
    return [...lastByUser.values()].filter((e) => e.type === "in");
  }, [todayEntries]);

  const activeEmployees = users?.filter((u) => u.role === "employee" && u.status === "active") ?? [];

  const loading = users === null || todayEntries === null || pendingLeaves === null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Tableau de bord</h1>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Employés actifs" value={activeEmployees.length} />
            <StatCard label="Présents maintenant" value={presentNow.length} accent="emerald" />
            <StatCard label="Congés en attente" value={pendingLeaves.length} accent="amber" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-700">Présents maintenant</h2>
              </div>
              {presentNow.length === 0 ? (
                <p className="text-sm text-zinc-400">Personne n&apos;est pointé en ce moment.</p>
              ) : (
                <ul className="space-y-2">
                  {presentNow.map((entry) => {
                    const employee = usersById.get(entry.userId);
                    return (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-zinc-800">
                          {employee ? `${employee.firstName} ${employee.lastName}` : "Employé"}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">
                          depuis {format(entry.timestamp, "HH:mm")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-700">Congés en attente</h2>
                <Link href="/admin/conges" className="text-xs text-blue-600 hover:underline">
                  Voir tout
                </Link>
              </div>
              {pendingLeaves.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucune demande en attente.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingLeaves.slice(0, 5).map((leave) => {
                    const employee = usersById.get(leave.userId);
                    return (
                      <li
                        key={leave.id}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-zinc-800">
                            {employee ? `${employee.firstName} ${employee.lastName}` : "Employé"}
                          </span>
                          <span className="text-xs text-zinc-500">{LEAVE_TYPE_LABELS[leave.type]}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {format(new Date(leave.startDate), "d MMM", { locale: fr })} –{" "}
                          {format(new Date(leave.endDate), "d MMM yyyy", { locale: fr })}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const color =
    accent === "emerald" ? "text-emerald-700" : accent === "amber" ? "text-amber-700" : "text-zinc-900";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-center shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
