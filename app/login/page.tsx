"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/Spinner";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Adresse courriel invalide.",
  "auth/invalid-credential": "Courriel ou mot de passe incorrect.",
  "auth/user-disabled": "Ce compte a été désactivé. Contactez l'administrateur.",
  "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
};

export default function LoginPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(profile.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, profile, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      console.error("Login error code:", code, err);
      setError(ERROR_MESSAGES[code] ?? `Une erreur est survenue (${code}). Veuillez réessayer.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || (user && !profile)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Connexion en cours..." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-horizontal.png"
            alt="GK Groupe inc"
            width={220}
            height={70}
            priority
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-zinc-900">Connexion employé</h1>
          <p className="mb-6 text-sm text-zinc-500">
            Utilisez les identifiants fournis par votre administrateur.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
                Courriel
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="nom@gkgroupe.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Pas de compte ? Demandez à votre administrateur d&apos;en créer un pour vous.
        </p>
      </div>
    </div>
  );
}
