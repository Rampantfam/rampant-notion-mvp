"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

type Allowed = "ADMIN" | "CLIENT" | "TEAM";

type RoleGateProps = {
  allow: Allowed | Allowed[];
  children: React.ReactNode;
};

export default function RoleGate({ allow, children }: RoleGateProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const [checking, setChecking] = useState(true);

  const allowedSet = useMemo<Allowed[]>(() => (Array.isArray(allow) ? allow : [allow]), [allow]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const normalizedRole = ((profile as { role?: string } | null)?.role ?? "CLIENT")?.toString().toUpperCase();
      const role = (normalizedRole === "ADMIN" || normalizedRole === "CLIENT" || normalizedRole === "TEAM"
        ? normalizedRole
        : "CLIENT") as Allowed;
      
      if (role === "ADMIN" && !allowedSet.includes("ADMIN")) {
        router.replace("/app");
        return;
      }
      if (role === "CLIENT" && !allowedSet.includes("CLIENT")) {
        router.replace("/admin");
        return;
      }
      if (role === "TEAM" && !allowedSet.includes("TEAM")) {
        router.replace("/admin");
        return;
      }
      if (mounted) setChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, [allowedSet, router, supabase]);

  if (checking) return <div className="p-8 text-sm text-gray-500">Checking access…</div>;
  return <>{children}</>;
}
