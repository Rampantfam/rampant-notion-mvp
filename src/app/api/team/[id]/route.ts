import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const memberId = resolvedParams.id;
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { full_name, email, status } = body;

    const payload: Record<string, any> = {};
    if (full_name !== undefined) payload.full_name = full_name;
    if (email !== undefined) payload.email = email;
    if (status !== undefined) payload.status = status;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Handle both user_id (UUID) and email (for pending invites with NULL user_id)
    let query = supabase
      .from("profiles")
      .update(payload)
      .eq("role", "TEAM"); // Only allow updating TEAM members

    // If memberId looks like a UUID, use user_id; otherwise use email
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);
    if (isUUID) {
      query = query.eq("user_id", memberId);
    } else {
      // Remove "temp-" prefix if present
      const emailId = memberId.startsWith("temp-") ? memberId.slice(5) : memberId;
      query = query.eq("email", emailId).is("user_id", null);
    }

    const { data, error } = await query
      .select("user_id, full_name, email, status")
      .single();

    if (error) {
      console.error("Error updating team member:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    return NextResponse.json({ member: data });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const memberId = resolvedParams.id;
    const supabase = getSupabaseAdmin();

    // Handle both user_id (UUID) and email (for pending invites with NULL user_id)
    let query = supabase
      .from("profiles")
      .delete()
      .eq("role", "TEAM"); // Only allow deleting TEAM members

    // If memberId looks like a UUID, use user_id; otherwise use email
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);
    if (isUUID) {
      query = query.eq("user_id", memberId);
    } else {
      // Remove "temp-" prefix if present
      const emailId = memberId.startsWith("temp-") ? memberId.slice(5) : memberId;
      query = query.eq("email", emailId).is("user_id", null);
    }

    const { error } = await query;

    if (error) {
      console.error("Error deleting team member:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

