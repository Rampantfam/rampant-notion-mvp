import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import RoleGate from "@/components/auth/RoleGate";
import { AppShell } from "@/components/shell/AppShell";
import ProjectDetails, { type ProjectLike } from "@/components/projects/details/ProjectDetails";
import { getUserContext } from "@/lib/authServer";
import { redirect } from "next/navigation";

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

async function fetchProject(id: string): Promise<{ project: ProjectLike | null; client: any }> {
  const supabase = getSupabaseAdmin();

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
  };

  return { project, client: record.clients || null };
}

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { user, role } = await getUserContext();
  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const { project, client } = await fetchProject(resolvedParams.id);

  if (!project) {
    notFound();
  }

  return (
    <RoleGate allow={["ADMIN"]}>
      <AppShell role="ADMIN">
        <ProjectDetails initialProject={project} persistent={true} client={client} />
      </AppShell>
    </RoleGate>
  );
}
