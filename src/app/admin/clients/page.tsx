import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import ClientList from "@/components/clients/ClientList";
import AddClientButton from "@/components/clients/AddClientButton";
import { AppShell } from "@/components/shell/AppShell";
import { getUserContext } from "@/lib/authServer";

async function fetchClients() {
  const supabase = getSupabaseAdmin();
  
  // Fetch clients (updated_at may not exist, so we'll use created_at for last activity if needed)
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id,name,email,phone,logo_url,created_at")
    .order("created_at", { ascending: false });
  
  if (clientsError) {
    throw new Error(`Supabase fetch error: ${clientsError.message}`);
  }

  if (!clients || clients.length === 0) {
    return [];
  }

  // Fetch projects for each client to calculate active projects
  const { data: allProjects, error: projectsError } = await supabase
    .from("projects")
    .select("id,client_id,status,updated_at,created_at")
    .in("client_id", clients.map(c => c.id));

  if (projectsError) {
    console.error("Error fetching projects for clients:", projectsError);
  }

  // Fetch invoices for each client to calculate unpaid total
  const { data: allInvoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id,client_id,amount,status")
    .in("client_id", clients.map(c => c.id));

  if (invoicesError) {
    console.error("Error fetching invoices for clients:", invoicesError);
  }

  // Calculate active projects (status IN_PROGRESS = CONFIRMED, IN_PRODUCTION, POST_PRODUCTION, FINAL_REVIEW)
  const inProgressStatuses = ["CONFIRMED", "IN_PRODUCTION", "POST_PRODUCTION", "FINAL_REVIEW"];
  
  // Map projects by client_id
  const projectsByClient: Record<string, any[]> = {};
  (allProjects || []).forEach((p: any) => {
    if (p.client_id) {
      if (!projectsByClient[p.client_id]) {
        projectsByClient[p.client_id] = [];
      }
      projectsByClient[p.client_id].push(p);
    }
  });

  // Map invoices by client_id
  const invoicesByClient: Record<string, any[]> = {};
  (allInvoices || []).forEach((inv: any) => {
    if (inv.client_id) {
      if (!invoicesByClient[inv.client_id]) {
        invoicesByClient[inv.client_id] = [];
      }
      invoicesByClient[inv.client_id].push(inv);
    }
  });

  // Enrich clients with calculated fields
  return clients.map((client: any) => {
    const clientProjects = projectsByClient[client.id] || [];
    const clientInvoices = invoicesByClient[client.id] || [];
    
    // Count active projects (in progress statuses)
    const activeProjects = clientProjects.filter((p: any) => 
      inProgressStatuses.includes(p.status)
    ).length;

    // Calculate unpaid total (UNPAID or PAST_DUE invoices)
    const unpaidTotal = clientInvoices
      .filter((inv: any) => inv.status === "UNPAID" || inv.status === "PAST_DUE")
      .reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);

    // Calculate last activity (most recent project or invoice update, or client updated_at)
    const projectDates = clientProjects.map((p: any) => 
      p.updated_at ? new Date(p.updated_at) : p.created_at ? new Date(p.created_at) : null
    ).filter(Boolean) as Date[];
    
    const invoiceDates = clientInvoices.map((inv: any) => 
      inv.updated_at ? new Date(inv.updated_at) : inv.created_at ? new Date(inv.created_at) : null
    ).filter(Boolean) as Date[];
    
    // clients table doesn't have updated_at, so use created_at as fallback
    const clientCreated = client.created_at ? new Date(client.created_at) : null;
    
    const allDates = [...projectDates, ...invoiceDates, clientCreated].filter(Boolean) as Date[];
    const lastActivity = allDates.length > 0 
      ? new Date(Math.max(...allDates.map(d => d.getTime()))).toISOString()
      : null;

    return {
      ...client,
      activeProjects,
      unpaidTotal,
      lastActivity,
    };
  });
}

export default async function AdminClientsPage() {
  const { user, role } = await getUserContext();
  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  const clients = await fetchClients();

  return (
    <AppShell role="ADMIN">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Clients</h1>
            <p className="text-sm text-gray-500">Manage all your client organizations</p>
          </div>
          <AddClientButton />
        </div>
        <ClientList clients={clients} />
      </div>
    </AppShell>
  );
}
