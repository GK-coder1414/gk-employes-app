"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentPosition, mapsLink, isWithinWorkplace } from "@/lib/geolocation";
import { currentStatus } from "@/lib/hours";
import type { TimeEntry } from "@/lib/types";
import { ClockIcon, MapPinIcon } from "@/components/icons";
import { Spinner } from "@/components/Spinner";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[] | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "timeEntries"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(20)
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

  const status = useMemo(() => (entries ? currentStatus(entries) : "out"), [entries]);
  const todayEntries = useMemo(() => {
    if (!entries) return [];
    const today = format(Date.now(), "yyyy-MM-dd");
    return entries.filter((e) => format(e.timestamp, "yyyy-MM-dd") === today);
  }, [entries]);

  async function handlePunch() {
    if (!user) return;
    setError(null);
    setWorking(true);
    try {
      const geo = await getCurrentPosition();
      const workplaceLat = profile?.workplaceLat;
      const workplaceLng = profile?.workplaceLng;
      if (
        workplaceLat != null &&
        workplaceLng != null &&
        !isWithinWorkplace(geo, {
          lat: workplaceLat,
          lng: workplaceLng,
          radius: profile?.workplaceRadius,
        })
      ) {
        setError("Vous devez être sur le lieu de travail pour pointer.");
        return;
      }
      await addDoc(collection(db, "timeEntries"), {
        userId: user.uid,
        type: status === "out" ? "in" : "out",
        timestamp: Timestamp.now(),
        lat: geo.lat,
        lng: geo.lng,
        accuracy: geo.accuracy,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setWorking(false);
    }
  }

  const isIn = status === "in";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-zinc-900">
        Bonjour {profile?.firstName} 👋
      </h1>
      <p className="mb-6 text-sm text-zinc-500">{format(Date.now(), "EEEE d MMMM yyyy")}</p>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-4 text-sm font-medium text-zinc-500">
          Statut actuel :{" "}
          <span className={isIn ? "text-emerald-600" : "text-zinc-700"}>
            {isIn ? "Entré" : "Sorti"}
          </span>
        </p>

        <button
          onClick={handlePunch}
          disabled={working || entries === null}
          className={`mx-auto flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isIn ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          <ClockIcon className="h-10 w-10" />
          <span className="text-base font-semibold">
            {working ? "Localisation..." : isIn ? "Pointer la sortie" : "Pointer l'entrée"}
          </span>
        </button>

        <p className="mt-4 flex items-center justify-center gap-1 text-xs text-zinc-400">
          <MapPinIcon className="h-3.5 w-3.5" />
          Votre position est enregistrée à chaque pointage
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Pointages d&apos;aujourd&apos;hui</h2>
        {entries === null ? (
          <Spinner />
        ) : todayEntries.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun pointage aujourd&apos;hui.</p>
        ) : (
          <ul className="space-y-2">
            {todayEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                <span className={entry.type === "in" ? "text-emerald-600" : "text-zinc-700"}>
                  {entry.type === "in" ? "Entrée" : "Sortie"}
                </span>
                <span className="text-zinc-500">{format(entry.timestamp, "HH:mm")}</span>
                {entry.lat !== null && entry.lng !== null && (
                  <a
                    href={mapsLink(entry.lat, entry.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Voir la carte
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
