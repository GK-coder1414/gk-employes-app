"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/Spinner";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || !profile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (profile.status === "inactive") {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm text-zinc-600">
          Votre compte est désactivé. Contactez l&apos;administrateur.
        </p>
      </div>
    );
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
