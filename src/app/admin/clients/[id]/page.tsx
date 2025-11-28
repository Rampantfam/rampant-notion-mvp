import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppShell } from "@/components/shell/AppShell";
import { getUserContext } from "@/lib/authServer";
import ClientHeader from "@/components/admin/clients/ClientHeader";
import ClientInfoCard from "@/components/admin/clients/ClientInfoCard";
import ClientProjectsCard, { type ClientProject } from "@/components/admin/clients/ClientProjectsCard";
import ClientInvoicesCard, { type ClientInvoice } from "@/components/admin/clients/ClientInvoicesCard";
import ClientActivityCard, { type ClientActivityItem } from "@/components/admin/clients/ClientActivityCard";
import ClientSlackCard from "@/components/admin/clients/ClientSlackCard";

async function fetchClient(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(`Supabase fetch error: ${error.message}`);
  }
  return data;
}

async function fetchClientProjects(clientId: string): Promise<ClientProject[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, event_date, creative_name")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching client projects:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.title,
    status: p.status === "IN_PRODUCTION" ? "In Progress" : p.status === "REQUEST_RECEIVED" ? "Request Received" : p.status === "COMPLETED" ? "Completed" : p.status || "Unknown",
    due_date: p.event_date || null,
    assigned_creative: p.creative_name || null,
  }));
}

async function fetchClientInvoices(clientId: string): Promise<ClientInvoice[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      amount,
      status,
      issue_date,
      project_id,
      projects:project_id (
        title
      )
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching client invoices:", error);
    return [];
  }

  return (data || []).map((inv: any) => ({
    id: inv.id, // Use actual UUID for navigation
    invoice_number: inv.invoice_number || inv.id.substring(0, 8), // Display number
    project_id: inv.project_id,
    project_name: inv.projects?.title || "No Project",
    amount: Number(inv.amount) || 0,
    date: inv.issue_date || inv.created_at?.split("T")[0] || "",
    status: inv.status === "PAID" ? "Paid" : inv.status === "PAST_DUE" ? "Past Due" : "Unpaid",
  }));
}

// Activity feed is not yet implemented in database, so we'll use empty array for now
const demoActivity: ClientActivityItem[] = [];

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { user, role } = await getUserContext();
  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const client = await fetchClient(resolvedParams.id);

  if (!client) {
    notFound();
  }

  const [projects, invoices] = await Promise.all([
    fetchClientProjects(client.id),
    fetchClientInvoices(client.id),
  ]);

  return (
    <AppShell role="ADMIN">
      <div className="space-y-6">
        <ClientHeader 
          client={{
            name: client.name,
            email: client.email,
            phone: client.phone,
            website: client.website,
            logo_url: client.logo_url,
            contact_person: client.contact_person,
            address: client.address,
            slack_url: (client as any).slack_url,
          }}
          clientId={client.id}
        />

        <ClientInfoCard client={{
          contact_person: client.contact_person,
          email: client.email,
          phone: client.phone,
          address: client.address,
          created_at: client.created_at,
          website: client.website,
        }} />

        <ClientSlackCard slackUrl={(client as any).slack_url} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ClientProjectsCard projects={projects} clientId={client.id} />
          <ClientInvoicesCard invoices={invoices} clientId={client.id} />
        </div>

        <ClientActivityCard activities={demoActivity} />
      </div>
    </AppShell>
  );
}
