import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invites/verify
 * Verifies an invite token and returns profile information
 * Query params: email, token
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find profile by email with role TEAM or ADMIN and status INVITED
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, role, status")
      .eq("email", email)
      .in("role", ["TEAM", "ADMIN"])
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return NextResponse.json({ error: "Failed to verify invite" }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Invite not found for this email" }, { status: 404 });
    }

    // If user already has an account (user_id is set), they can just log in
    if (profile.user_id) {
      return NextResponse.json({
        profile: {
          full_name: profile.full_name,
          role: profile.role,
        },
        message: "Account already exists. You can log in directly.",
      });
    }

    // Verify status is INVITED
    if (profile.status !== "INVITED") {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    }

    // Token verification would go here in production
    // For now, we'll just verify the email matches an INVITED profile

    return NextResponse.json({
      profile: {
        full_name: profile.full_name,
        role: profile.role,
      },
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

