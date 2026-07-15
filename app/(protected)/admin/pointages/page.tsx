"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { format, startOfDay, endOfDay } from "date-fns";
import { db } from "@/lib/firebase/client";
import type { UserProfile, TimeEntry } from "@/lib/types";
import { mapsLink } from "@/lib/geolocation";
import { Spinner } from "@/components/Spinner";

export default function PointagesPage() {
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [entries, setEntries] = useState<TimeEntry[] | null>(null);
  const [date, setDate] = useState(() => format(Date.now(), "yyyy-MM-dd"));
  const [employeeFilter, setEmployeeFilter] = useState("all");

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })));
    });
  }, []);

  useEffect(() => {
    const day = new Date(`${date}T00:00:00`);
    const q = query(
      collection(db, "timeEntries"),
      where("timestamp", ">=", Timestamp.fromDate(startOfDay(day))),
      where("timestamp", "<=", Timestamp.fromDate(endOfDay(day))),
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
  }, [date]);

  const usersById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users?.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return employeeFilter === "all" ? entries : entries.filter((e) => e.userId === employeeFilter);
  }, [entries, employeeFilter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Pointages</h1>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        >
          <option value="all">Tous les employés</option>
          {users?.map((u) => (
            <option key={u.uid} value={u.uid}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
      </div>

      {entries === null ? (
        <Spinner />
      ) : filteredEntries.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun pointage pour cette date.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-4 py-3">Employé</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Heure</th>
                <th className="px-4 py-3">Position</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const employee = usersById.get(entry.userId);
                return (
                  <tr key={entry.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-800">
                      {employee ? `${employee.firstName} ${employee.lastName}` : "Employé"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={entry.type === "in" ? "text-emerald-600" : "text-zinc-700"}>
                        {entry.type === "in" ? "Entrée" : "Sortie"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{format(entry.timestamp, "HH:mm")}</td>
                    <td className="px-4 py-3">
                      {entry.lat !== null && entry.lng !== null ? (
                        <a
                          href={mapsLink(entry.lat, entry.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Voir la carte
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">Non disponible</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
