"use client";

import { createClient } from "./supabaseClient";

let browserClient = createClient();

export function getSupabaseBrowser() {
  return browserClient;
}

export type UserRole = "ADMIN" | "CLIENT" | "TEAM";

export async function getUserRoleAndClientId() {
  const supabase = getSupabaseBrowser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { role: null as null, client_id: null as null, session };
  const { data, error } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) {
    console.warn("profiles lookup failed", error);
    return { role: null as null, client_id: null as null, session };
  }
  const normalizedRole = data?.role?.toString().toUpperCase() ?? null;
  const role = normalizedRole === "ADMIN" || normalizedRole === "CLIENT" || normalizedRole === "TEAM" ? (normalizedRole as UserRole) : null;
  return { role, client_id: data?.client_id ?? null, session };
}

export function routeForRole(role: UserRole | null) {
  if (role === "ADMIN") return "/admin";
  if (role === "CLIENT") return "/app";
  if (role === "TEAM") return "/team";
  return "/";
}
