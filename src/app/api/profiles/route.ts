import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { user_id, full_name, email, role, status } = body;

    // user_id can be null for ADMIN/TEAM members who haven't been invited yet
    if (!full_name || !email || !role) {
      return NextResponse.json({ error: "full_name, email, and role are required" }, { status: 400 });
    }

    // Validate role
    if (!["ADMIN", "CLIENT", "TEAM"].includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be ADMIN, CLIENT, or TEAM" }, { status: 400 });
    }

    // Get the origin from the request to generate correct invite URL
    const origin = req.headers.get('origin') || 
                   req.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                   process.env.NEXT_PUBLIC_APP_URL || 
                   'http://localhost:3000';

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: user_id || null, // Allow NULL for pending invites
        full_name,
        email,
        role,
        status: status || "INVITED",
        client_id: null,
      })
      .select("user_id, full_name, email, status, role")
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generate and return invite URL for ADMIN/TEAM members (not for CLIENT)
    let inviteUrl: string | null = null;
    if ((role === "ADMIN" || role === "TEAM") && !user_id) {
      try {
        const baseUrl = origin.replace(/\/$/, ''); // Remove trailing slash
        const inviteRes = await fetch(`${baseUrl}/api/invites`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "origin": origin, // Pass origin to invite route
          },
          body: JSON.stringify({
            email,
            full_name,
            role,
          }),
        });
        
        if (inviteRes.ok) {
          const inviteJson = await inviteRes.json();
          inviteUrl = inviteJson.inviteUrl || null;
        } else {
          console.warn("Failed to generate invite URL, but profile was created");
        }
      } catch (inviteErr) {
        console.warn("Error generating invite URL:", inviteErr);
        // Continue - profile is still created
      }
    }

    return NextResponse.json({ 
      profile: data,
      inviteUrl,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

