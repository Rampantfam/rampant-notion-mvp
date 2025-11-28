"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";

export default function OrganizationOnboarding() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,email")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.full_name) setContactName(profile.full_name);
      if (profile?.email) setOrgEmail(profile.email);
    })();
  }, [router]);

  const onNext = async () => {
    setErr(null);
    if (!orgName || !contactName || !orgEmail) {
      setErr("Organization name, contact name, and email are required.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        throw new Error("You must be signed in to continue.");
      }

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: orgName,
          email: orgEmail,
          phone: orgPhone,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (clientError) throw clientError;
      if (!client) throw new Error("Unable to create organization record.");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ client_id: client.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Unable to save organization info.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <BrandHeader />
      <main className="flex-1 grid place-items-center">
        <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 border-t-4 border-orange-500 pt-3">
            <h1 className="text-xl font-semibold">Tell us about your organization.</h1>
            <p className="text-xs text-gray-500">We&apos;ll use this to personalize your account and project dashboard.</p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-xs font-medium">Organization Name *</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Enter your organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium">Contact Name *</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Your full name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium">Organization Email *</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="you@company.com"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium">Phone Number</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="+1 (555) 000-0000"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium">Logo URL (optional)</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="https://yourcdn.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                For MVP we&apos;ll use a URL instead of file uploads.
              </p>
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            <div className="mt-2 flex justify-end">
              <button
                onClick={onNext}
                disabled={loading}
                className="rounded-md bg-orange-500 px-4 py-2 text-white disabled:opacity-60"
              >
                {loading ? "Saving..." : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
