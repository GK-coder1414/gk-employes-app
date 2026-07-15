"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { LEAVE_TYPE_LABELS, type LeaveRequest, type LeaveType } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

export default function CongesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [type, setType] = useState<LeaveType>("vacances");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "leaveRequests"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
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
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(false);

    if (!startDate || !endDate) {
      setError("Veuillez indiquer une date de début et de fin.");
      return;
    }
    if (endDate < startDate) {
      setError("La date de fin doit être après la date de début.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "leaveRequests"), {
        userId: user.uid,
        type,
        startDate,
        endDate,
        reason: reason.trim(),
        status: "pending",
        createdAt: Timestamp.now(),
        reviewedBy: null,
        reviewedAt: null,
        adminComment: null,
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      setSuccess(true);
    } catch {
      setError("Impossible d'envoyer la demande. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Demandes de congé</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-zinc-700">Nouvelle demande</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Type de congé</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          >
            {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Date de début</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Date de fin</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Motif (optionnel)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Demande envoyée avec succès.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Envoi..." : "Envoyer la demande"}
        </button>
      </form>

      <h2 className="mb-3 text-sm font-semibold text-zinc-700">Historique</h2>
      {requests === null ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucune demande de congé.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800">
                  {LEAVE_TYPE_LABELS[r.type]}
                </span>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {format(new Date(r.startDate), "d MMM yyyy", { locale: fr })} –{" "}
                {format(new Date(r.endDate), "d MMM yyyy", { locale: fr })}
              </p>
              {r.reason && <p className="mt-1 text-xs text-zinc-400">{r.reason}</p>}
              {r.adminComment && (
                <p className="mt-1 text-xs italic text-zinc-500">
                  Commentaire admin : {r.adminComment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
