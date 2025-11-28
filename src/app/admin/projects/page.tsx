import { AppShell } from "@/components/shell/AppShell";
import RoleGate from "@/components/auth/RoleGate";
import ProjectsBoard from "@/components/projects/ProjectsBoard";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserContext } from "@/lib/authServer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function fetchProjects() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      status,
      event_date,
      client_id,
      notes,
      clients:client_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }

  return (data || []).map((project: any) => {
    // Check if project is cancelled (either by status or notes marker)
    const isCancelled = project.status === "CANCELLED" || (project.notes && project.notes.includes("[CANCELLED"));
    
    // Map database status to display status for board columns
    // Bucket mapping:
    // - REQUEST_RECEIVED → "Request Received" column
    // - CONFIRMED, IN_PRODUCTION, POST_PRODUCTION, FINAL_REVIEW → "In Progress" column
    // - COMPLETED → "Completed" column
    // - CANCELLED → "Cancelled" column (new)
    let displayStatus: "REQUEST_RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" = "REQUEST_RECEIVED";
    if (isCancelled) {
      displayStatus = "CANCELLED";
    } else if (project.status === "COMPLETED") {
      displayStatus = "COMPLETED";
    } else if (["IN_PRODUCTION", "CONFIRMED", "POST_PRODUCTION", "FINAL_REVIEW"].includes(project.status)) {
      displayStatus = "IN_PROGRESS";
    }

    return {
      id: project.id,
      name: project.title,
      client: project.clients?.name || "Unknown Client",
      status: displayStatus,
      dateLabel: project.event_date ? new Date(project.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
      badge: isCancelled ? "Cancelled" : project.status === "REQUEST_RECEIVED" ? "New" : ["IN_PRODUCTION", "CONFIRMED", "POST_PRODUCTION", "FINAL_REVIEW"].includes(project.status) ? "Active" : project.status === "COMPLETED" ? "Paid" : undefined,
    };
  });
}

export default async function AdminProjectsPage() {
  const { user, role } = await getUserContext();
  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  const projects = await fetchProjects();

  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="text-sm text-gray-500">Track every engagement from initial request to completion.</p>
          </div>
          <ProjectsBoard projects={projects} />
        </div>
      </AppShell>
    </RoleGate>
  );
}
