"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="mt-3 w-full rounded-md bg-orange-500 text-white px-3 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
      aria-label="Log out"
      title="Log out"
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
