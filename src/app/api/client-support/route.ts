import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/authServer";
import { sendEmail } from "@/lib/sendEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const userContext = await getUserContext();
    if (!userContext.user || userContext.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subject, message } = body;

    if (!subject || !message || !subject.trim() || !message.trim()) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Get user profile and client info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, client_id")
      .eq("user_id", userContext.user.id)
      .maybeSingle();

    const clientId = profile?.client_id || userContext.clientId;

    // Get client name
    let clientName = "Unknown Client";
    if (clientId) {
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .maybeSingle();
      if (client?.name) {
        clientName = client.name;
      }
    }

    // Insert support request
    const { data: supportRequest, error: insertError } = await supabaseAdmin
      .from("support_requests")
      .insert({
        user_id: userContext.user.id,
        client_id: clientId,
        subject: subject.trim(),
        message: message.trim(),
        status: "OPEN",
      })
      .select()
      .single();

    if (insertError) {
      // If table doesn't exist, that's okay - continue with email
      if (insertError.code === "42P01") {
        console.warn("[POST /api/client-support] support_requests table doesn't exist, skipping DB insert");
      } else {
        console.error("[POST /api/client-support] Error inserting support request:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }

    // Attempt to send email (gracefully handles missing configuration)
    const userName = profile?.full_name || userContext.user.email || "Unknown User";
    const userEmail = profile?.email || userContext.user.email || "unknown@example.com";

    const emailHtml = `
      <h2>New Support Request from Client Portal</h2>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>User:</strong> ${userName} (${userEmail})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `;

    const emailResult = await sendEmail({
      to: process.env.SUPPORT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@rampant.com",
      subject: `Support Request: ${subject}`,
      html: emailHtml,
    });

    if (!emailResult.success && emailResult.error) {
      console.warn("[POST /api/client-support] Email send failed:", emailResult.error);
      // Still return success - the support request was saved to DB
    }

    return NextResponse.json({ success: true, id: supportRequest?.id });
  } catch (error: any) {
    console.error("[POST /api/client-support] Unexpected error:", error);
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}

