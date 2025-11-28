"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabaseClient";

const baseLinkClasses = "block rounded px-3 py-2 text-sm transition hover:bg-orange-50";
const activeClasses = "bg-orange-100 text-orange-700";

type SidebarProps = {
  role: "ADMIN" | "CLIENT" | "TEAM";
};

export function Sidebar({ role }: SidebarProps) {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "";
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut({ scope: "global" as any });
    try {
      for (const k of Object.keys(window.localStorage)) {
        if (k.startsWith("sb-")) localStorage.removeItem(k);
      }
    } catch (error) {
      console.warn("localStorage cleanup failed", error);
    }
    await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
    router.replace("/");
  }, [router, supabase]);

  const links = useMemo(() => {
    if (role === "ADMIN") {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/clients", label: "Clients" },
        { href: "/admin/projects", label: "Projects" },
        { href: "/admin/invoices", label: "Invoices" },
        { href: "/admin/team", label: "Team" },
        { href: "/admin/settings", label: "Settings" },
      ];
    }
    if (role === "TEAM") {
      return [
        { href: "/team", label: "Dashboard" },
      ];
    }
    return [
      { href: "/app", label: "Overview" },
      { href: "/app/projects", label: "Projects" },
      { href: "/app/invoices", label: "Invoices" },
      { href: "/app/budget", label: "Budget" },
      { href: "/app/settings", label: "Settings" },
    ];
  }, [role]);

  return (
    <aside className="w-60 min-h-screen border-r bg-white p-4">
      <div className="mb-6 text-lg font-semibold">
        {role === "ADMIN" ? "Rampant Admin" : role === "TEAM" ? "Rampant Team" : "Rampant Client"}
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label }) => {
          const isActive = pathname === href || (href !== "/admin" && href !== "/app" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={[baseLinkClasses, isActive ? activeClasses : ""].join(" ")}>
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-8 w-full rounded bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
      >
        Log out
      </button>
    </aside>
  );
}
