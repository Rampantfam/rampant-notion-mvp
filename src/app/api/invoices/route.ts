import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function haveEnv() {
  return Boolean(url && serviceKey);
}

async function getUserContext() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { user: null, role: null, clientId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const normalizedRole = profile?.role?.toString().toUpperCase();
  const role =
    normalizedRole === "ADMIN" || normalizedRole === "CLIENT" || normalizedRole === "TEAM"
      ? normalizedRole
      : null;

  return {
    user: session.user,
    role,
    clientId: (profile?.client_id as string) ?? null,
  };
}

// GET - Fetch invoices (filtered by client for CLIENT users, all for ADMIN)
export async function GET(req: Request) {
  try {
    if (!haveEnv()) {
      return new NextResponse("Supabase not configured", { status: 501 });
    }

    const userContext = await getUserContext();
    if (!userContext.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabaseAdmin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const monthFilter = searchParams.get("month");

    // Select invoice fields - invoice_id might not exist if migration hasn't been run
    // Build base query - try with invoice_id first
    const baseSelect = `
      id,
      invoice_id,
      amount,
      status,
      due_date,
      invoice_url,
      created_at,
      projects:project_id (
        id,
        title
      )
    `;
    
    let query = supabaseAdmin
      .from("invoices")
      .select(baseSelect)
      .order("due_date", { ascending: false });

    // If user is CLIENT, filter by their client_id
    if (userContext.role === "CLIENT") {
      if (!userContext.clientId) {
        return new NextResponse("Client account not properly configured", { status: 403 });
      }
      query = query.eq("client_id", userContext.clientId);
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter.toUpperCase());
    }

    // Apply month filter (format: YYYY-MM)
    if (monthFilter && monthFilter !== "all") {
      const [year, month] = monthFilter.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      query = query.gte("due_date", startDate).lte("due_date", endDate);
    }

    let { data, error } = await query;

    // If invoice_id column doesn't exist, retry without it
    if (error && (error.code === "42703" || error.message?.includes("invoice_id"))) {
      console.log("[GET /api/invoices] invoice_id column doesn't exist, retrying without it");
      const retrySelect = `
        id,
        amount,
        status,
        due_date,
        invoice_url,
        created_at,
        projects:project_id (
          id,
          title
        )
      `;
      
      let retryQuery = supabaseAdmin
        .from("invoices")
        .select(retrySelect)
        .order("due_date", { ascending: false });
      
      if (userContext.role === "CLIENT" && userContext.clientId) {
        retryQuery = retryQuery.eq("client_id", userContext.clientId);
      }
      
      if (statusFilter && statusFilter !== "all") {
        retryQuery = retryQuery.eq("status", statusFilter.toUpperCase());
      }
      
      if (monthFilter && monthFilter !== "all") {
        const [year, month] = monthFilter.split("-");
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;
        retryQuery = retryQuery.gte("due_date", startDate).lte("due_date", endDate);
      }
      
      const retryResult = await retryQuery;
      if (retryResult.error) {
        error = retryResult.error;
        data = null;
      } else {
        // Map retry data to include invoice_id (using id as fallback)
        data = (retryResult.data || []).map((inv: any) => ({
          ...inv,
          invoice_id: inv.id, // Use id as invoice_id when column doesn't exist
        }));
        error = null;
      }
    }

    if (error) {
      console.error("[GET /api/invoices] Error:", error);
      // If table doesn't exist, return empty array
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json([]);
      }
      return new NextResponse(error.message, { status: 400 });
    }

    // Format the response - ensure invoice_id is always present
    const formattedInvoices = (data || []).map((invoice: any) => ({
      id: invoice.id,
      invoice_id: invoice.invoice_id || invoice.id, // Fallback to id if invoice_id doesn't exist
      project_name: invoice.projects?.title || "Unknown Project",
      amount: parseFloat(invoice.amount),
      status: invoice.status,
      due_date: invoice.due_date,
      invoice_url: invoice.invoice_url || null,
      created_at: invoice.created_at,
    }));

    return NextResponse.json(formattedInvoices);
  } catch (error: any) {
    console.error("[GET /api/invoices] Unexpected error:", error);
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}
