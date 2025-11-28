"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, getUserRoleAndClientId } from "@/lib/supabase";

export default function HomeLogin() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { role } = await getUserRoleAndClientId();
      if (role === "ADMIN") {
        router.replace("/admin");
      } else if (role === "CLIENT") {
        router.replace("/app");
      } else if (role === "TEAM") {
        router.replace("/team");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center bg-white text-black">
      <div className="w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1 text-center">Welcome back</h1>
        <p className="text-xs text-gray-500 mb-6 text-center">Sign in to your Rampant account</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const supabase = getSupabaseBrowser();
            const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
            const password = (e.currentTarget.elements.namedItem("password") as HTMLInputElement).value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
              alert(error.message);
              return;
            }

            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
              router.replace("/");
              return;
            }

            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("user_id", user.id)
              .maybeSingle();

            const normalizedRole = profile?.role?.toString().toUpperCase() ?? null;

            if (normalizedRole === "ADMIN") {
              router.replace("/admin");
            } else if (normalizedRole === "CLIENT") {
              router.replace("/app");
            } else if (normalizedRole === "TEAM") {
              router.replace("/team");
            } else {
              router.replace("/");
            }
          }}
        >
          <label className="block text-xs">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <label className="block text-xs">Password</label>
          <input
            name="password"
            type="password"
            required
            placeholder="Enter your password"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Continue
          </button>
        </form>
        <div className="mt-3 text-center">
          <Link href="/signup" className="text-xs text-orange-600 hover:underline">
            Don’t have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
