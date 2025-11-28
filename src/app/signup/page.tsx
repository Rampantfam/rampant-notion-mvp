"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, getUserRoleAndClientId } from "@/lib/supabase";

export default function Signup() {
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
      <div className="w-full max-w-xl rounded-xl border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2 text-center">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Let’s get you started with Rampant.</p>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const supabase = getSupabaseBrowser();
            const full_name = (e.currentTarget.elements.namedItem("full_name") as HTMLInputElement).value;
            const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
            const password = (e.currentTarget.elements.namedItem("password") as HTMLInputElement).value;
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) return alert(error.message);

            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (user) {
              await (supabase.from("profiles") as any).upsert({
                user_id: user.id,
                email,
                full_name,
                role: "CLIENT",
              });

              const { role } = await getUserRoleAndClientId();
              if (role === "ADMIN") {
                router.replace("/admin");
              } else if (role === "CLIENT") {
                router.replace("/app");
              } else if (role === "TEAM") {
                router.replace("/team");
              } else {
                router.replace("/");
              }
            } else {
              alert("Check your email to confirm, then log in.");
              router.replace("/");
            }
          }}
        >
          <div>
            <label className="block text-xs mb-1">Full Name</label>
            <input
              name="full_name"
              required
              placeholder="Enter your full name"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Email Address</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="Create a strong password"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Continue
          </button>
        </form>
        <div className="mt-4 text-center text-xs">
          Already have an account? <a href="/login" className="text-orange-600 hover:underline">Log in</a>
        </div>
      </div>
    </div>
  );
}
