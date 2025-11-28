import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg: string, code = 500) {
  console.error("[/api/invoices/[id]]", msg);
  return NextResponse.json({ error: msg }, { status: code });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    if (!url || !serviceKey) {
      return fail("Server missing Supabase credentials (.env.local). Did you restart npm run dev after adding them?", 500);
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const invoiceId = resolvedParams.id;
    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return fail("Invalid JSON body.", 400);
    }

    // Validate required fields
    const clientId = body.clientId ? String(body.clientId).trim() : null;
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(String(body.amount || 0));
    const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];

    if (!clientId) {
      return fail("Client ID is required.", 400);
    }
    if (isNaN(amount) || amount < 0) {
      return fail("Amount must be a non-negative number.", 400);
    }
    if (lineItems.length === 0) {
      return fail("At least one line item is required.", 400);
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.item || !item.description || typeof item.qty !== "number" || typeof item.rate !== "number") {
        return fail("Each line item must have item, description, qty, and rate.", 400);
      }
      if (item.qty < 0 || item.rate < 0) {
        return fail("Line item qty and rate must be non-negative.", 400);
      }
    }

    // Map form fields to database fields
    const status = body.status === "PAID" || body.status === "PAST_DUE" ? body.status : "UNPAID";
    const invoiceNumber = body.invoiceNumber ? String(body.invoiceNumber).trim() : null;
    const projectId = body.projectId ? String(body.projectId).trim() : null;
    const issueDate = body.issueDate ? String(body.issueDate).trim() : null;
    const dueDate = body.dueDate ? String(body.dueDate).trim() : null;
    const billTo = body.billTo ? String(body.billTo).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    console.log("[/api/invoices/[id]] updating:", {
      invoiceId,
      invoiceNumber,
      clientId,
      projectId,
      amount,
      status,
      issueDate,
      dueDate,
      lineItemsCount: lineItems.length,
    });

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update({
        invoice_number: invoiceNumber,
        client_id: clientId,
        project_id: projectId || null,
        amount,
        status,
        issue_date: issueDate || null,
        due_date: dueDate || null,
        bill_to: billTo || null,
        line_items: lineItems,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select("id, invoice_number")
      .single();

    if (error) {
      return fail(`Supabase update error: ${error.message}`, 400);
    }
    if (!data?.id) {
      return fail("Update returned no data. Invoice may not exist.", 404);
    }

    console.log("[/api/invoices/[id]] updated id:", data.id);
    return NextResponse.json({ id: data.id, invoice_number: data.invoice_number }, { status: 200 });
  } catch (err: any) {
    return fail(`Unexpected error: ${err?.message ?? String(err)}`, 500);
  }
}

