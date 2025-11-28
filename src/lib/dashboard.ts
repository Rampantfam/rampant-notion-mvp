import { getSupabaseAdmin } from "./supabaseAdmin";

export type ClientDashboardSummary = {
  activeProjectsCount: number;
  projectRequestsCount: number;
  completedProjectsCount: number;
  pendingDeliverablesCount: number;
  invoicesDueCount: number;
  invoicesDueTotal: number;
  remainingBudget: number | null;
  annualBudget: number | null;
  spentSoFar: number;
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    eventDate: string | null;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string | null;
    amount: number;
    status: string;
    dueDate: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    message: string;
    notificationType: string;
    createdAt: string;
  }>;
};

export async function getClientDashboardSummary(clientId: string): Promise<ClientDashboardSummary> {
  const supabase = getSupabaseAdmin();

  // Initialize default values
  const summary: ClientDashboardSummary = {
    activeProjectsCount: 0,
    projectRequestsCount: 0,
    completedProjectsCount: 0,
    pendingDeliverablesCount: 0,
    invoicesDueCount: 0,
    invoicesDueTotal: 0,
    remainingBudget: null,
    annualBudget: null,
    spentSoFar: 0,
    recentProjects: [],
    recentInvoices: [],
    recentActivity: [],
  };

  try {
    // Fetch all projects for this client
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, title, status, event_date, created_at, notes")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (projectsError) {
      console.error("Error fetching projects for dashboard:", projectsError);
    } else if (projects) {
      // Helper to check if project is cancelled
      const isCancelled = (project: any) => {
        return project.status === "CANCELLED" || (project.notes && project.notes.includes("[CANCELLED"));
      };

      // Calculate project metrics
      // Active projects: only CONFIRMED and beyond (not REQUEST_RECEIVED)
      summary.activeProjectsCount = projects.filter(
        (p) =>
          !isCancelled(p) &&
          ["CONFIRMED", "IN_PRODUCTION", "POST_PRODUCTION", "FINAL_REVIEW"].includes(p.status)
      ).length;

      summary.projectRequestsCount = projects.filter((p) => !isCancelled(p) && p.status === "REQUEST_RECEIVED").length;

      summary.completedProjectsCount = projects.filter((p) => !isCancelled(p) && p.status === "COMPLETED").length;

      summary.pendingDeliverablesCount = projects.filter(
        (p) =>
          !isCancelled(p) &&
          ["CONFIRMED", "IN_PRODUCTION", "POST_PRODUCTION", "FINAL_REVIEW"].includes(p.status)
      ).length;

      // Get recent projects (3-5 most recent)
      summary.recentProjects = projects
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          eventDate: p.event_date,
        }));
    }

    // Fetch invoices for this client
    let invoicesQuery = supabase
      .from("invoices")
      .select("id, invoice_id, amount, status, due_date, created_at, issue_date")
      .eq("client_id", clientId);

    const { data: invoices, error: invoicesError } = await invoicesQuery;

    if (invoicesError) {
      // If invoice_id column doesn't exist, retry without it
      if (invoicesError.code === "42703" || invoicesError.message?.includes("invoice_id")) {
        const retryResult = await supabase
          .from("invoices")
          .select("id, amount, status, due_date, created_at, issue_date")
          .eq("client_id", clientId);

        if (!retryResult.error && retryResult.data) {
          const invoicesData = retryResult.data.map((inv: any) => ({
            ...inv,
            invoice_id: inv.id, // Use id as fallback
          }));

          // Calculate invoice metrics
          const unpaidInvoices = invoicesData.filter((inv: any) => ["UNPAID", "OVERDUE"].includes(inv.status));
          summary.invoicesDueCount = unpaidInvoices.length;
          summary.invoicesDueTotal = unpaidInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0);

          // Calculate spent so far (PAID invoices)
          const paidInvoices = invoicesData.filter((inv: any) => inv.status === "PAID");
          summary.spentSoFar = paidInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0);

          // Get recent invoices (3 most recent)
          summary.recentInvoices = invoicesData
            .sort((a: any, b: any) => {
              const dateA = a.issue_date || a.created_at || "";
              const dateB = b.issue_date || b.created_at || "";
              return dateB.localeCompare(dateA);
            })
            .slice(0, 3)
            .map((inv: any) => ({
              id: inv.id,
              invoiceNumber: inv.invoice_id || `INV-${inv.id.slice(0, 8)}`,
              amount: parseFloat(inv.amount || 0),
              status: inv.status,
              dueDate: inv.due_date,
            }));
        }
      } else {
        console.error("Error fetching invoices for dashboard:", invoicesError);
      }
    } else if (invoices) {
      // Calculate invoice metrics
      const unpaidInvoices = invoices.filter((inv: any) => ["UNPAID", "OVERDUE"].includes(inv.status));
      summary.invoicesDueCount = unpaidInvoices.length;
      summary.invoicesDueTotal = unpaidInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0);

      // Calculate spent so far (PAID invoices)
      const paidInvoices = invoices.filter((inv: any) => inv.status === "PAID");
      summary.spentSoFar = paidInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0);

      // Get recent invoices (3 most recent)
      summary.recentInvoices = invoices
        .sort((a: any, b: any) => {
          const dateA = a.issue_date || a.created_at || "";
          const dateB = b.issue_date || b.created_at || "";
          return dateB.localeCompare(dateA);
        })
        .slice(0, 3)
        .map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_id || `INV-${inv.id.slice(0, 8)}`,
          amount: parseFloat(inv.amount || 0),
          status: inv.status,
          dueDate: inv.due_date,
        }));
    }

    // Fetch annual budget from clients table
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("annual_budget")
        .eq("id", clientId)
        .maybeSingle();

      if (!clientError && clientData?.annual_budget) {
        summary.annualBudget = parseFloat(clientData.annual_budget);
        summary.remainingBudget = summary.annualBudget - summary.spentSoFar;
      }
    } catch (budgetError) {
      // annual_budget column might not exist, that's okay
      console.log("Could not fetch annual budget (column may not exist):", budgetError);
    }

    // Fetch recent activity from project_notifications
    try {
      // First get project IDs for this client
      const { data: clientProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", clientId);

      if (clientProjects && clientProjects.length > 0) {
        const projectIds = clientProjects.map((p) => p.id);

        const { data: notifications, error: notificationsError } = await supabase
          .from("project_notifications")
          .select("id, message, notification_type, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!notificationsError && notifications) {
          summary.recentActivity = notifications.map((n: any) => ({
            id: n.id,
            message: n.message || "",
            notificationType: n.notification_type || "",
            createdAt: n.created_at,
          }));
        }
      }
    } catch (notifError) {
      // project_notifications table might not exist, that's okay
      console.log("Could not fetch notifications (table may not exist):", notifError);
    }
  } catch (error) {
    console.error("Error in getClientDashboardSummary:", error);
  }

  return summary;
}

