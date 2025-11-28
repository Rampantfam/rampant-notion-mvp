import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/authServer";
import { AppShell } from "@/components/shell/AppShell";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import ClientProjectsPage from "@/components/projects/ClientProjectsPage";

export const dynamic = "force-dynamic";

type ClientProject = {
  id: string;
  title: string;
  event_date: string | null;
  creative_name: string | null;
  service_type: string | null;
  status: string;
};

async function fetchClientProjects(clientId: string): Promise<ClientProject[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, event_date, creative_name, service_type, status, notes, created_at")
    .eq("client_id", clientId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching client projects:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    event_date: p.event_date,
    creative_name: p.creative_name,
    service_type: p.service_type,
    status: p.status,
    notes: p.notes || null,
  }));
}

export default async function ClientProjectsPageRoute() {
  const { user, role, clientId } = await getUserContext();

  if (!user) {
    redirect("/");
  }

  if (role !== "CLIENT") {
    redirect("/");
  }

  if (!clientId) {
    return (
      <AppShell role="CLIENT">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="text-sm text-gray-500">Your projects will appear here.</p>
          </div>
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Your account is not linked to a client organization. Please contact support.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const projects = await fetchClientProjects(clientId);

  return (
    <AppShell role="CLIENT">
      <ClientProjectsPage projects={projects} />
    </AppShell>
  );
}

