import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getUserContext } from "@/lib/authServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import BudgetClient from "@/components/budget/BudgetClient";

export const dynamic = "force-dynamic";

type Invoice = {
  id: string;
  invoice_id: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
};

type Project = {
  id: string;
  title: string;
  status: string;
  event_date: string | null;
  service_type: string | null;
};

async function fetchClientInvoices(clientId: string): Promise<Invoice[]> {
  const supabase = getSupabaseAdmin();

  // Try to select with invoice_id first
  let { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_id, amount, status, due_date, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  // If invoice_id column doesn't exist, retry without it
  if (error && (error.code === "42703" || error.message?.includes("invoice_id"))) {
    console.log("[fetchClientInvoices] invoice_id column doesn't exist, retrying without it");
    const retryResult = await supabase
      .from("invoices")
      .select("id, amount, status, due_date, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    
    if (retryResult.error) {
      error = retryResult.error;
      data = null;
    } else {
      // Map the data to include invoice_id (using id as fallback)
      data = (retryResult.data || []).map((inv: any) => ({
        ...inv,
        invoice_id: inv.id, // Use id as invoice_id when column doesn't exist
      }));
      error = null;
    }
  }

  if (error) {
    console.error("Error fetching client invoices:", error);
    // If table doesn't exist, return empty array
    if (error.code === "42P01" || error.message.includes("does not exist")) {
      return [];
    }
    return [];
  }

  return (data || []).map((inv: any) => ({
    id: inv.id,
    invoice_id: inv.invoice_id || inv.id, // Use id as fallback if invoice_id doesn't exist
    amount: parseFloat(inv.amount) || 0,
    status: inv.status,
    due_date: inv.due_date,
    created_at: inv.created_at,
  }));
}

async function fetchClientProjects(clientId: string): Promise<Project[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, event_date, service_type, notes")
    .eq("client_id", clientId)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Error fetching client projects:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    event_date: p.event_date,
    service_type: p.service_type,
    notes: p.notes || null,
  }));
}

async function fetchClientBudget(clientId: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();

  try {
    // Try to get annual_budget from clients table
    const { data, error } = await supabase
      .from("clients")
      .select("annual_budget")
      .eq("id", clientId)
      .maybeSingle();

    if (error) {
      // Column might not exist yet
      if (error.code === "42703" || error.message?.includes("does not exist")) {
        return null;
      }
      console.error("Error fetching client budget:", error);
      return null;
    }

    return data?.annual_budget ? parseFloat(data.annual_budget) : null;
  } catch {
    return null;
  }
}

export default async function BudgetPage() {
  const { user, role, clientId } = await getUserContext();

  if (!user) {
    redirect("/");
  }

  if (role !== "CLIENT") {
    redirect("/");
  }

  if (!clientId) {
    redirect("/app");
  }

  const [invoices, projects, savedBudget] = await Promise.all([
    fetchClientInvoices(clientId),
    fetchClientProjects(clientId),
    fetchClientBudget(clientId),
  ]);

  return (
    <AppShell role="CLIENT">
      <BudgetClient invoices={invoices} projects={projects} initialBudget={savedBudget} clientId={clientId} />
    </AppShell>
  );
}

