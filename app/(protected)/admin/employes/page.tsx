"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, doc, updateDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import type { UserProfile } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

export default function EmployesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })));
    });
  }, []);

  async function toggleStatus(target: UserProfile) {
    await updateDoc(doc(db, "users", target.uid), {
      status: target.status === "active" ? "inactive" : "active",
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Employés</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Annuler" : "+ Ajouter un employé"}
        </button>
      </div>

      {showForm && (
        <AddEmployeeForm
          onCreated={() => setShowForm(false)}
          idToken={async () => (user ? user.getIdToken() : "")}
        />
      )}

      {users === null ? (
        <Spinner />
      ) : users.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun employé pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Courriel</th>
                <th className="px-4 py-3">Département</th>
                <th className="px-4 py-3">Adresse de pointage</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.uid}>
                  <tr className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-800">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-600">{u.department || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {u.workplaceAddress || "Adresse par défaut"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {u.role === "admin" ? "Admin" : "Employé"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {u.status === "active" ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setEditingUid(editingUid === u.uid ? null : u.uid)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        {editingUid === u.uid ? "Fermer" : "Adresse"}
                      </button>
                      {u.role !== "admin" && (
                        <button
                          onClick={() => toggleStatus(u)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          {u.status === "active" ? "Désactiver" : "Réactiver"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {editingUid === u.uid && (
                    <tr className="border-b border-zinc-100 last:border-0 bg-zinc-50">
                      <td colSpan={7} className="px-4 py-4">
                        <WorkplaceAddressForm
                          user={u}
                          idToken={async () => (user ? user.getIdToken() : "")}
                          onSaved={() => setEditingUid(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddEmployeeForm({
  onCreated,
  idToken,
}: {
  onCreated: () => void;
  idToken: () => Promise<string>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [workplaceAddress, setWorkplaceAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await idToken();

      let workplaceLat: number | undefined;
      let workplaceLng: number | undefined;
      if (workplaceAddress.trim()) {
        const geoRes = await fetch("/api/admin/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ address: workplaceAddress.trim() }),
        });
        const geoData = await geoRes.json();
        if (!geoRes.ok) {
          setError(geoData.error ?? "Adresse introuvable.");
          return;
        }
        workplaceLat = geoData.lat;
        workplaceLng = geoData.lng;
      }

      const res = await fetch("/api/admin/employes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          department,
          phone,
          workplaceAddress: workplaceAddress.trim(),
          workplaceLat,
          workplaceLng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue.");
        return;
      }
      onCreated();
    } catch {
      setError("Impossible de créer l'employé. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" value={firstName} onChange={setFirstName} required />
        <Field label="Nom" value={lastName} onChange={setLastName} required />
      </div>
      <Field label="Courriel" type="email" value={email} onChange={setEmail} required />
      <Field
        label="Mot de passe temporaire"
        type="text"
        value={password}
        onChange={setPassword}
        required
        hint="Au moins 6 caractères. Transmettez-le à l'employé de façon sécurisée."
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Département" value={department} onChange={setDepartment} />
        <Field label="Téléphone" value={phone} onChange={setPhone} />
      </div>
      <Field
        label="Adresse de pointage"
        value={workplaceAddress}
        onChange={setWorkplaceAddress}
        hint="Optionnel. Laissez vide pour utiliser l'adresse par défaut de l'entreprise."
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Création..." : "Créer le compte employé"}
      </button>
    </form>
  );
}

function WorkplaceAddressForm({
  user,
  idToken,
  onSaved,
}: {
  user: UserProfile;
  idToken: () => Promise<string>;
  onSaved: () => void;
}) {
  const [address, setAddress] = useState(user.workplaceAddress ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const trimmed = address.trim();

      if (!trimmed) {
        await updateDoc(doc(db, "users", user.uid), {
          workplaceAddress: "",
          workplaceLat: null,
          workplaceLng: null,
        });
        onSaved();
        return;
      }

      const token = await idToken();
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Adresse introuvable.");
        return;
      }

      await updateDoc(doc(db, "users", user.uid), {
        workplaceAddress: trimmed,
        workplaceLat: data.lat,
        workplaceLng: data.lng,
      });
      onSaved();
    } catch {
      setError("Impossible de mettre à jour l'adresse. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Field
          label={`Adresse de pointage — ${user.firstName} ${user.lastName}`}
          value={address}
          onChange={setAddress}
          hint="Laissez vide pour revenir à l'adresse par défaut de l'entreprise."
        />
      </div>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mb-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      />
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
