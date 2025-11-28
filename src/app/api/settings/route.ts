import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch the first (and typically only) organization settings row
    const { data, error } = await supabase
      .from("organization_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error fetching settings:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ settings: data || null });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const {
      organization_name,
      contact_email,
      phone,
      logo_url,
      email_notifications,
      budget_alerts,
    } = body;

    // Check if settings exist
    const { data: existing } = await supabase
      .from("organization_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload: Record<string, any> = {
      organization_name: organization_name || null,
      contact_email: contact_email || null,
      phone: phone || null,
      logo_url: logo_url || null,
      email_notifications: email_notifications !== undefined ? email_notifications : true,
      budget_alerts: budget_alerts !== undefined ? budget_alerts : false,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing?.id) {
      // Update existing
      const { data, error } = await supabase
        .from("organization_settings")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from("organization_settings")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Error creating settings:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      result = data;
    }

    return NextResponse.json({ settings: result });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

