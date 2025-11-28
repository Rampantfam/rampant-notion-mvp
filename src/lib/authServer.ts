import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type UserRole = "ADMIN" | "CLIENT" | "TEAM";
export type UserContext = {
  user: { id: string; email?: string | null } | null;
  role: UserRole | null;
  clientId: string | null;
};

export async function getUserContext(): Promise<UserContext> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          /* disabled in server components */
        },
        remove() {
          /* disabled in server components */
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Supabase session error", sessionError.message);
  }

  if (!session?.user) {
    return { user: null, role: null, clientId: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Supabase profile error", error.message);
    return { user: session.user, role: null, clientId: null };
  }

  const normalizedRole = profile?.role?.toString().toUpperCase();
  const role =
    normalizedRole === "ADMIN" || normalizedRole === "CLIENT" || normalizedRole === "TEAM"
      ? (normalizedRole as UserRole)
      : null;

  return {
    user: session.user,
    role,
    clientId: (profile?.client_id as string) ?? null,
  };
}
