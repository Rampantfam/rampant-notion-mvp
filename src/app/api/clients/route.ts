import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg: string, code = 500) {
  console.error("[/api/clients]", msg);
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET() {
  if (!url || !serviceKey) {
    return fail("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    if (!url || !serviceKey) {
      return fail("Server missing Supabase credentials (.env.local). Did you restart npm run dev after adding them?", 500);
    }

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return fail("Invalid JSON body.", 400);
    }

    const name = (body.name ?? "").toString().trim();
    const email = body.email ? String(body.email).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const logo_url = body.logo_url ? String(body.logo_url).trim() : null;
    const website = body.website ? String(body.website).trim() : null;
    const contact_person = body.contact_person ? String(body.contact_person).trim() : null;
    const address = body.address ? String(body.address).trim() : null;
    const slack_url = body.slack_url ? String(body.slack_url).trim() : null;

    if (!name) return fail("Client name is required.", 400);

    console.log("[/api/clients] inserting:", { name, email, phone, logo_url, website, contact_person, address, slack_url });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .insert({ name, email, phone, logo_url, website, contact_person, address, slack_url })
      .select("id,name,email,phone,logo_url,website,contact_person,address,slack_url,created_at")
      .single();

    if (error) {
      return fail(`Supabase insert error: ${error.message}`, 400);
    }
    if (!data?.id) {
      return fail("Insert returned no id.", 500);
    }

    console.log("[/api/clients] created id:", data.id);
    return NextResponse.json({ client: data }, { status: 201 });
  } catch (err: any) {
    return fail(`Unexpected error: ${err?.message ?? String(err)}`, 500);
  }
}
