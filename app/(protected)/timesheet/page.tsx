"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, addMonths, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { summarizeByDay, totalHours, formatHours } from "@/lib/hours";
import type { TimeEntry } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

export default function TimesheetPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[] | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "timeEntries"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snap) => {
      setEntries(
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
  }, [user]);

  const monthDate = addMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const monthEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => isWithinInterval(e.timestamp, { start: monthStart, end: monthEnd }));
  }, [entries, monthStart, monthEnd]);

  const days = useMemo(() => summarizeByDay(monthEntries), [monthEntries]);
  const total = totalHours(days);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Feuille de temps</h1>

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setMonthOffset((m) => m - 1)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          ← Précédent
        </button>
        <span className="text-sm font-semibold capitalize text-zinc-800">
          {format(monthDate, "MMMM yyyy", { locale: fr })}
        </span>
        <button
          onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
          disabled={monthOffset >= 0}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
        >
          Suivant →
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total du mois</p>
        <p className="text-2xl font-bold text-blue-800">{formatHours(total)}</p>
      </div>

      {entries === null ? (
        <Spinner />
      ) : days.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun pointage ce mois-ci.</p>
      ) : (
        <div className="space-y-2">
          {days.map((day) => (
            <div
              key={day.date}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-zinc-800">
                  {format(day.date, "EEEE d MMMM", { locale: fr })}
                </span>
                <span className="text-sm font-semibold text-zinc-900">
                  {formatHours(day.hoursWorked)}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {day.shifts.map((shift, i) => (
                  <p key={i} className="text-xs text-zinc-500">
                    {format(shift.start, "HH:mm")} – {format(shift.end, "HH:mm")}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
