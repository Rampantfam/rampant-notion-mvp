import { AppShell } from "@/components/shell/AppShell";
import RoleGate from "@/components/auth/RoleGate";
import InvoicesPage from "@/components/invoices/InvoicesPage";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserContext } from "@/lib/authServer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function fetchInvoices() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      amount,
      status,
      issue_date,
      due_date,
      client_id,
      project_id,
      clients:client_id (
        id,
        name,
        email,
        logo_url
      ),
      projects:project_id (
        id,
        title
      )
    `)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
  
  return (data || []).map((invoice: any) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number || `#${invoice.id.substring(0, 8)}`,
    clientName: invoice.clients?.name || "Unknown Client",
    clientAvatarUrl: invoice.clients?.logo_url || null,
    projectName: invoice.projects?.title || "No Project",
    amount: Number(invoice.amount) || 0,
    status: (invoice.status === "PAID" ? "PAID" : invoice.status === "PAST_DUE" ? "PAST_DUE" : "UNPAID") as "PAID" | "UNPAID" | "PAST_DUE",
    issueDate: invoice.issue_date || "",
    dueDate: invoice.due_date || "",
  }));
}

export default async function AdminInvoicesPage() {
  const { user, role } = await getUserContext();
  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  const invoices = await fetchInvoices();

  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <InvoicesPage invoices={invoices} />
      </AppShell>
    </RoleGate>
  );
}

