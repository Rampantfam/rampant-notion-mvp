"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  useEffect(() => {
    // Get email and token from URL
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");

    if (!emailParam) {
      setError("Invalid invite link. Missing email parameter.");
      setCheckingInvite(false);
      return;
    }

    setEmail(emailParam);

    // Verify the invite and fetch profile info
    async function checkInvite() {
      try {
        const res = await fetch(`/api/invites/verify?email=${encodeURIComponent(emailParam || "")}&token=${tokenParam || ""}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        } else {
          const json = await res.json();
          setError(json.error || "Invalid or expired invite link.");
        }
      } catch (err: any) {
        setError("Failed to verify invite. Please contact your administrator.");
      } finally {
        setCheckingInvite(false);
      }
    }

    checkInvite();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!email) {
      setError("Email is required.");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/accept?email=${encodeURIComponent(email)}`,
        },
      });

      if (signUpError) {
        // If user already exists, try signing in
        if (signUpError.message.includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
          }

          // Sign in successful, update profile and redirect
          await updateProfileAndRedirect();
          return;
        }

        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (signUpData.user) {
        // Update profile with user_id
        await updateProfileAndRedirect(signUpData.user.id);
      } else {
        setError("Account creation failed. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  async function updateProfileAndRedirect(userId?: string) {
    try {
      const supabase = getSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();

      const finalUserId = userId || user?.id;
      if (!finalUserId || !email) {
        setError("Unable to link account. Please contact support.");
        setLoading(false);
        return;
      }

      // Update profile with user_id
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          user_id: finalUserId,
          status: "ACTIVE",
        })
        .eq("email", email)
        .in("role", ["TEAM", "ADMIN"]);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        setError("Account created but failed to link profile. Please contact support.");
        setLoading(false);
        return;
      }

      // Redirect based on role
      const role = profile?.role || "TEAM";
      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "TEAM") {
        router.push("/team");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete setup.");
      setLoading(false);
    }
  }

  if (checkingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-lg">Verifying invite...</div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-md">
          <h1 className="mb-4 text-xl font-semibold">Invalid Invite</h1>
          <p className="mb-4 text-sm text-gray-600">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-md">
        <h1 className="mb-2 text-xl font-semibold">Accept Invitation</h1>
        <p className="mb-6 text-sm text-gray-600">
          {profile ? (
            <>
              You&apos;ve been invited to join as a <strong>{profile.role === "ADMIN" ? "Admin" : "Team Member"}</strong>.
              Create your account to get started.
            </>
          ) : (
            "Create your account to accept the invitation."
          )}
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email || ""}
              disabled
              className="mt-1 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter your password"
            />
            <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Accept Invitation & Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

