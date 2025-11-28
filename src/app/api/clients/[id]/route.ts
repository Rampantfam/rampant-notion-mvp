import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg: string, code = 500) {
  console.error("[/api/clients/[id]]", msg);
  return NextResponse.json({ error: msg }, { status: code });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    if (!url || !serviceKey) {
      return fail("Server missing Supabase credentials (.env.local). Did you restart npm run dev after adding them?", 500);
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const clientId = resolvedParams.id;

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return fail("Invalid JSON body.", 400);
    }

    const name = body.name ? String(body.name).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const logo_url = body.logo_url ? String(body.logo_url).trim() : null;
    const website = body.website ? String(body.website).trim() : null;
    const contact_person = body.contact_person ? String(body.contact_person).trim() : null;
    const address = body.address ? String(body.address).trim() : null;
    const slack_url = body.slack_url ? String(body.slack_url).trim() : null;

    const payload: Record<string, any> = {};
    if (name !== null) payload.name = name;
    if (email !== null) payload.email = email;
    if (phone !== null) payload.phone = phone;
    if (logo_url !== null) payload.logo_url = logo_url;
    if (website !== null) payload.website = website;
    if (contact_person !== null) payload.contact_person = contact_person;
    if (address !== null) payload.address = address;
    if (slack_url !== null) payload.slack_url = slack_url;

    if (Object.keys(payload).length === 0) {
      return fail("No fields to update.", 400);
    }

    // Note: clients table doesn't have updated_at column, so we don't set it

    console.log("[/api/clients/[id]] updating:", { clientId, payload });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update(payload)
      .eq("id", clientId)
      .select("id,name,email,phone,logo_url,website,contact_person,address,created_at")
      .single();

    if (error) {
      // Check if error is about missing slack_url column
      if (error.message.includes("slack_url")) {
        return fail(
          `The 'slack_url' column doesn't exist yet. Please run this SQL in your Supabase SQL Editor:\n\nALTER TABLE public.clients ADD COLUMN IF NOT EXISTS slack_url TEXT;\n\nThen refresh this page and try again.`,
          400
        );
      }
      return fail(`Supabase update error: ${error.message}`, 400);
    }

    // If slack_url was updated, fetch it separately in case it's not in the select
    if ('slack_url' in payload && data) {
      const { data: slackData } = await supabaseAdmin
        .from("clients")
        .select("slack_url")
        .eq("id", clientId)
        .maybeSingle();
      if (slackData && 'slack_url' in slackData) {
        (data as any).slack_url = slackData.slack_url;
      }
    }
    if (!data?.id) {
      return fail("Update returned no data.", 500);
    }

    console.log("[/api/clients/[id]] updated id:", data.id);
    return NextResponse.json({ client: data }, { status: 200 });
  } catch (err: any) {
    return fail(`Unexpected error: ${err?.message ?? String(err)}`, 500);
  }
}

