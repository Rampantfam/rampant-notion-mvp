import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg: string, code = 500) {
  console.error("[/api/projects]", msg);
  return NextResponse.json({ error: msg }, { status: code });
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

    const required = ["name", "client_id", "status"];
    for (const k of required) {
      if (!body?.[k] || String(body[k]).trim() === "") {
        return fail(`Missing required field: ${k}`, 400);
      }
    }

    // Normalize deliverables: string of comma-separated -> string[] (trimmed)
    let deliverables = body.deliverables ?? "";
    let deliverables_array: string[] | null = null;
    if (typeof deliverables === "string") {
      deliverables_array = deliverables
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    // Map form field "name" to DB field "title" to match existing schema
    // Map "assigned_creative" to "creative_name" to match existing schema
    // Normalize status: form uses "Request Received" but DB may use "REQUEST_RECEIVED"
    const statusMap: Record<string, string> = {
      "Request Received": "REQUEST_RECEIVED",
      "Confirmed": "CONFIRMED",
      "In Production": "IN_PRODUCTION",
      "Post-Production": "POST_PRODUCTION",
      "Final Review": "FINAL_REVIEW",
      "Completed": "COMPLETED",
    };
    const normalizedStatus = statusMap[body.status] ?? body.status;

    // Handle account managers if provided
    let account_manager_names: string[] | null = null;
    let account_manager_emails: string[] | null = null;
    let account_manager_phones: string[] | null = null;

    if (body.account_managers && Array.isArray(body.account_managers)) {
      const managers = body.account_managers.filter((m: any) => m && m.name?.trim());
      if (managers.length > 0) {
        account_manager_names = managers.map((m: any) => m.name ?? "");
        account_manager_emails = managers.map((m: any) => m.email ?? "");
        account_manager_phones = managers.map((m: any) => m.phone ?? "");
      }
    }

    const payload: Record<string, any> = {
      title: body.name,
      client_id: body.client_id,
      creative_name: body.assigned_creative ?? null,
      creative_phone: body.creative_phone ?? null,
      event_date: body.event_date ?? null,
      event_time: body.event_time ?? null,
      location: body.location ?? null,
      service_type: body.service_type ?? null,
      status: normalizedStatus,
      notes: body.notes ?? null,
      deliverables: deliverables_array ?? null,
      account_manager_names,
      account_manager_emails,
      account_manager_phones,
    };

    // Handle budget fields (only if columns exist)
    let budgetFields: Record<string, any> = {};
    if (body.requested_budget !== undefined) {
      const budget = parseFloat(String(body.requested_budget));
      if (!isNaN(budget) && budget > 0) {
        budgetFields.requested_budget = budget;
        budgetFields.budget_status = "PENDING"; // Budget starts as pending
      }
    }

    console.log("[/api/projects] inserting:", { title: payload.title, client_id: payload.client_id, status: payload.status });

    // Try inserting with budget fields first
    let insertPayload = { ...payload, ...budgetFields };
    let { data, error } = await supabaseAdmin
      .from("projects")
      .insert(insertPayload)
      .select("id")
      .single();

    // If error is due to missing budget columns, retry without them
    if (error && (error.code === "42703" || error.message?.includes("budget_status") || error.message?.includes("requested_budget") || error.message?.includes("schema cache"))) {
      console.log("[/api/projects] Budget columns don't exist, retrying without budget fields");
      insertPayload = { ...payload }; // Remove budget fields
      const retryResult = await supabaseAdmin
        .from("projects")
        .insert(insertPayload)
        .select("id")
        .single();
      
      data = retryResult.data;
      error = retryResult.error;
      
      // If still error, check if it's a table issue
      if (error && (error.message?.includes("Could not find the table") || error.message?.includes("schema cache"))) {
        return fail(
          `Table 'public.projects' not found. Please run the SQL script in Supabase SQL Editor: docs/sql/setup-all-tables-and-mock-data.sql. Error: ${error.message}`,
          500
        );
      }
    }

    if (error) {
      console.error("[/api/projects] Supabase error:", error);
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes("Could not find the table") || error.message?.includes("schema cache")) {
        return fail(
          `Table 'public.projects' not found. Please run the SQL script in Supabase SQL Editor: docs/sql/setup-all-tables-and-mock-data.sql. Error: ${error.message}`,
          500
        );
      }
      return fail(`Supabase insert error: ${error.message}`, 500);
    }

    if (!data?.id) {
      return fail("Insert returned no id.", 500);
    }

    // Create notification for budget pending (only if budget fields were included and table exists)
    if (budgetFields.budget_status === "PENDING" && budgetFields.requested_budget) {
      try {
        await supabaseAdmin.from("project_notifications").insert({
          project_id: data.id,
          notification_type: "PROJECT_BUDGET_PENDING",
          message: `New project "${body.name}" submitted with a budget request of $${budgetFields.requested_budget.toLocaleString()}.`,
        });
      } catch (notifError) {
        console.warn("[/api/projects] Could not create budget pending notification (table may not exist):", notifError);
        // Don't fail the request if notification fails
      }
    }

    console.log("[/api/projects] created id:", data.id);
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err: any) {
    return fail(`Unexpected error: ${err?.message ?? String(err)}`, 500);
  }
}

