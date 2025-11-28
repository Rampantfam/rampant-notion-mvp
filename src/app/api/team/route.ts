import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch all team members (role = 'TEAM')
    const { data: teamMembers, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, status")
      .eq("role", "TEAM")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error fetching team members:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch all projects to calculate project counts
    const { data: projects } = await supabase
      .from("projects")
      .select("creative_name");

    // Calculate project counts per team member
    const projectCounts: Record<string, number> = {};
    if (projects) {
      projects.forEach((p: any) => {
        if (p.creative_name) {
          const name = p.creative_name.trim();
          if (name) {
            projectCounts[name] = (projectCounts[name] || 0) + 1;
          }
        }
      });
    }

    // Map team members with project counts
    // Use email as ID if user_id is NULL (for pending invites)
    const membersWithCounts = (teamMembers || []).map((member: any) => ({
      id: member.user_id || member.email || `temp-${member.email}`, // Use email as fallback ID
      name: member.full_name || "Unknown",
      email: member.email || "",
      status: member.status || "INVITED",
      projects: projectCounts[member.full_name || ""] || 0,
    }));

    return NextResponse.json({ members: membersWithCounts });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { full_name, email } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });
    }

    // Get the origin from the request to generate correct invite URL
    const origin = req.headers.get('origin') || 
                   req.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                   process.env.NEXT_PUBLIC_APP_URL || 
                   'http://localhost:3000';

    // Insert team member (no auth user created yet - directory only)
    // user_id is NULL until the team member is invited and creates an auth account
    // The foreign key constraint should allow NULL for pending invites
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: null, // NULL until auth user is created via invite flow
        full_name,
        email,
        role: "TEAM",
        status: "INVITED",
        client_id: null,
      })
      .select("user_id, full_name, email, status")
      .single();

    if (error) {
      console.error("Error creating team member:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generate and return invite URL
    let inviteUrl: string | null = null;
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
          role: "TEAM",
        }),
      });
      
      if (inviteRes.ok) {
        const inviteJson = await inviteRes.json();
        inviteUrl = inviteJson.inviteUrl || null;
      } else {
        console.warn("Failed to generate invite URL, but team member was created");
      }
    } catch (inviteErr) {
      console.warn("Error generating invite URL:", inviteErr);
      // Continue - member is still created
    }

    return NextResponse.json({ 
      member: data,
      inviteUrl,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

