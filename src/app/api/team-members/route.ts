import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/team-members
 * Fetches all team members and admin members for use in dropdowns (e.g., account manager selection)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch all profiles with role 'TEAM' or 'ADMIN'
    const { data: members, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, role, status")
      .in("role", ["TEAM", "ADMIN"])
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error fetching team/admin members:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to a simpler format for dropdowns
    const membersList = (members || []).map((member: any) => ({
      id: member.user_id || member.email || `temp-${member.email}`, // Use email as fallback ID
      name: member.full_name || "Unknown",
      email: member.email || "",
      role: member.role,
      status: member.status || "INVITED",
    }));

    return NextResponse.json({ members: membersList });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

