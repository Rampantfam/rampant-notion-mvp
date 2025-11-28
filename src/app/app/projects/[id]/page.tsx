import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppShell } from "@/components/shell/AppShell";
import ProjectDetails, { type ProjectLike } from "@/components/projects/details/ProjectDetails";
import { getUserContext } from "@/lib/authServer";

export const dynamic = "force-dynamic";

const normalizeStatus = (status?: string | null): ProjectLike["status"] => {
  switch (status) {
    case "REQUEST_RECEIVED":
    case "CONFIRMED":
    case "IN_PRODUCTION":
    case "POST_PRODUCTION":
    case "FINAL_REVIEW":
    case "COMPLETED":
    case "CANCELLED":
      return status;
    default:
      return "REQUEST_RECEIVED";
  }
};

async function fetchProject(id: string, clientId: string): Promise<{ project: ProjectLike | null; client: any }> {
  const supabase = getSupabaseAdmin();

  // Fetch project and verify it belongs to the client
  // Note: slack_channel and budget fields might not exist if migration hasn't been run yet
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      client_id,
      event_date,
      event_time,
      location,
      service_type,
      deliverables,
      status,
      creative_name,
      creative_phone,
      content_links,
      notes,
      account_manager_names,
      account_manager_emails,
      account_manager_phones,
      clients:client_id (
        id,
        name,
        email,
        phone,
        logo_url,
        website,
        address,
        contact_person
      )
    `)
    .eq("id", id)
    .eq("client_id", clientId) // Ensure project belongs to this client
    .maybeSingle();

  // Try to get slack_channel separately if it exists
  let slackChannel: string | null = null;
  try {
    const { data: slackData } = await supabase
      .from("projects")
      .select("slack_channel")
      .eq("id", id)
      .maybeSingle();
    slackChannel = slackData?.slack_channel || null;
  } catch {
    // Column doesn't exist yet, that's okay
    slackChannel = null;
  }

  // Try to get budget fields separately if they exist
  let requestedBudget: number | undefined = undefined;
  let budgetStatus: string | undefined = undefined;
  let proposedBudget: number | undefined = undefined;
  try {
    const { data: budgetData } = await supabase
      .from("projects")
      .select("requested_budget, budget_status, proposed_budget")
      .eq("id", id)
      .maybeSingle();
    if (budgetData) {
      requestedBudget = budgetData.requested_budget ? parseFloat(budgetData.requested_budget) : undefined;
      budgetStatus = budgetData.budget_status || undefined;
      proposedBudget = budgetData.proposed_budget ? parseFloat(budgetData.proposed_budget) : undefined;
    }
  } catch {
    // Columns don't exist yet, that's okay
    requestedBudget = undefined;
    budgetStatus = undefined;
    proposedBudget = undefined;
  }

  if (error || !data) {
    console.error("Error fetching project:", error);
    return { project: null, client: null };
  }

  const record = data as any;

  // Map account managers from arrays
  const accountManagers: { name: string; email?: string; phone?: string }[] = [];
  const names = record.account_manager_names ?? [];
  const emails = record.account_manager_emails ?? [];
  const phones = record.account_manager_phones ?? [];
  const maxLen = Math.max(names.length, emails.length, phones.length);
  for (let i = 0; i < maxLen; i++) {
    if (names[i] || emails[i] || phones[i]) {
      accountManagers.push({
        name: names[i] ?? "",
        email: emails[i] || undefined,
        phone: phones[i] || undefined,
      });
    }
  }

  const project: ProjectLike = {
    id: record.id,
    title: record.title,
    client_id: record.client_id ?? undefined,
    client_name: record.clients?.name ?? "Unknown Client",
    event_date: record.event_date ?? undefined,
    event_time: record.event_time ?? undefined,
    location: record.location ?? undefined,
    service_type: record.service_type ?? undefined,
    deliverables: Array.isArray(record.deliverables)
      ? record.deliverables
      : typeof record.deliverables === "string"
      ? record.deliverables.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
    status: normalizeStatus(record.status),
    creative_name: record.creative_name ?? undefined,
    creative_phone: record.creative_phone ?? undefined,
    content_links:
      record.content_links?.map((link: any) => ({
        label: link.label ?? "",
        url: link.url ?? "",
      })) ?? [],
    notes: record.notes ?? undefined,
    account_managers: accountManagers.length > 0 ? accountManagers : undefined,
    slack_channel: slackChannel ?? undefined,
    requested_budget: requestedBudget,
    budget_status: budgetStatus as "PENDING" | "APPROVED" | "COUNTER_PROPOSED" | "REJECTED" | undefined,
    proposed_budget: proposedBudget,
  };

  return { project, client: record.clients || null };
}

export default async function ClientProjectDetailsPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
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

  const resolvedParams = params instanceof Promise ? await params : params;
  const { project, client } = await fetchProject(resolvedParams.id, clientId);

  if (!project) {
    // Project doesn't exist or doesn't belong to this client
    notFound();
  }

  return (
    <AppShell role="CLIENT">
      <ProjectDetails initialProject={project} persistent={true} client={client} readOnly={true} />
    </AppShell>
  );
}


