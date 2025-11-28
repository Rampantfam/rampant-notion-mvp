import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const access = cookieStore.get("sb-access-token")?.value;
    const refresh = cookieStore.get("sb-refresh-token")?.value;
    if (refresh) {
      await admin.auth.admin.signOut(refresh);
    }
    if (access) {
      // optional: revoke access token if API supports, ignored otherwise
    }
  } catch {
    // ignore errors during revocation
  }

  for (const c of cookieStore.getAll()) {
    const name = c.name;
    if (name.startsWith("sb-") || name.startsWith("supabase-") || name.includes("supabase")) {
      cookieStore.set(name, "", { path: "/", maxAge: 0 });
    }
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = NextResponse.redirect(new URL("/?logged_out=1", base));
  res.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
  res.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });
  return res;
}
