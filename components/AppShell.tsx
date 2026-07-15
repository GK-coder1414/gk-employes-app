"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";
import { ClockIcon, CalendarIcon, UsersIcon, ListIcon, HomeIcon, LogoutIcon } from "@/components/icons";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

const employeeNav: NavItem[] = [
  { href: "/dashboard", label: "Pointage", icon: ClockIcon },
  { href: "/timesheet", label: "Feuille de temps", icon: ListIcon },
  { href: "/conges", label: "Congés", icon: CalendarIcon },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: HomeIcon },
  { href: "/admin/employes", label: "Employés", icon: UsersIcon },
  { href: "/admin/pointages", label: "Pointages", icon: ClockIcon },
  { href: "/admin/conges", label: "Congés", icon: CalendarIcon },
];

export function AppShell({ profile, children }: { profile: UserProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = profile.role === "admin" ? adminNav : employeeNav;

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-5">
          <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded" />
          <span className="text-sm font-semibold text-zinc-900">GK Groupe</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 p-3">
          <div className="mb-2 px-2 text-xs text-zinc-500">
            {profile.firstName} {profile.lastName}
            <br />
            <span className="text-zinc-400">
              {profile.role === "admin" ? "Administrateur" : profile.department || "Employé"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
          >
            <LogoutIcon className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded" />
          <span className="text-sm font-semibold text-zinc-900">GK Groupe</span>
        </div>
        <button onClick={handleLogout} className="text-zinc-500">
          <LogoutIcon className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-zinc-200 bg-white md:hidden">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                active ? "text-blue-700" : "text-zinc-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
