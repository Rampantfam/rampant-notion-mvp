import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/authServer";

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
    const { client_id, annual_budget } = body;

    // Verify the client_id matches the logged-in user's client_id
    if (client_id !== userContext.clientId) {
      return NextResponse.json({ error: "Forbidden: You can only update your own budget" }, { status: 403 });
    }

    const budgetValue = parseFloat(annual_budget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      return NextResponse.json({ error: "Invalid budget value" }, { status: 400 });
    }

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Try to update annual_budget column (might not exist if migration hasn't been run)
    const { data, error } = await supabaseAdmin
      .from("clients")
      .update({ annual_budget: budgetValue })
      .eq("id", client_id)
      .select()
      .maybeSingle();

    if (error) {
      // If column doesn't exist, provide helpful error message
      if (error.code === "42703" || error.message?.includes("does not exist") || error.message?.includes("column")) {
        console.error("[PUT /api/clients/budget] annual_budget column doesn't exist:", error);
        return NextResponse.json({ 
          error: "The annual_budget column doesn't exist in the database. Please run the migration file: supabase/migrations/20241205000000_add_annual_budget_to_clients.sql",
          needsMigration: true 
        }, { status: 400 });
      }
      console.error("[PUT /api/clients/budget] Error updating budget:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data, annual_budget: data.annual_budget });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}

