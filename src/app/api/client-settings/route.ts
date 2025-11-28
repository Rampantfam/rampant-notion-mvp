import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function PUT(req: Request) {
  try {
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const userContext = await getUserContext();
    if (!userContext.user || userContext.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!userContext.clientId) {
      return NextResponse.json({ error: "Client account not properly configured" }, { status: 403 });
    }

    const body = await req.json();
    const { fullName, email, organizationName, receiveEmailUpdates, notifyOnDeliverables, notifyOnInvoiceDue } = body;

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Update profile
    const profileUpdate: Record<string, any> = {
      full_name: fullName || null,
    };

    // Add notification preferences if columns exist
    if (receiveEmailUpdates !== undefined) {
      profileUpdate.receive_email_updates = receiveEmailUpdates;
    }
    if (notifyOnDeliverables !== undefined) {
      profileUpdate.notify_on_deliverables = notifyOnDeliverables;
    }
    if (notifyOnInvoiceDue !== undefined) {
      profileUpdate.notify_on_invoice_due = notifyOnInvoiceDue;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", userContext.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // If columns don't exist, that's okay - continue with other updates
      if (profileError.code !== "42703") {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    // Update client organization name
    if (organizationName !== undefined) {
      const { error: clientError } = await supabaseAdmin
        .from("clients")
        .update({ name: organizationName || null })
        .eq("id", userContext.clientId);

      if (clientError) {
        console.error("Error updating client:", clientError);
        return NextResponse.json({ error: clientError.message }, { status: 400 });
      }
    }

    // Update email in auth.users if it changed
    if (email && email !== userContext.user.email) {
      try {
        // Create a Supabase client with the user's session to update their email
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
        const userSupabase = createSupabaseClient(url, serviceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        // Update email in auth.users
        const { error: emailError } = await userSupabase.auth.admin.updateUserById(userContext.user.id, {
          email: email,
        });

        if (emailError) {
          console.error("Error updating email:", emailError);
          // Don't fail the whole request if email update fails
        } else {
          // Also update email in profiles
          await supabaseAdmin
            .from("profiles")
            .update({ email: email })
            .eq("user_id", userContext.user.id);
        }
      } catch (emailUpdateError) {
        console.error("Error in email update process:", emailUpdateError);
        // Continue - email update is not critical
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in PUT /api/client-settings:", error);
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}

