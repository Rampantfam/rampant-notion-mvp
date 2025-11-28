import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/authServer";
import { AppShell } from "@/components/shell/AppShell";
import RoleGate from "@/components/auth/RoleGate";
import TeamPage from "@/components/team/TeamPage";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function fetchTeamData() {
  const supabase = getSupabaseAdmin();

  // Fetch all team members (role = 'TEAM')
  const { data: teamMembers, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, status")
    .eq("role", "TEAM")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching team members:", error);
    return [];
  }

  // Fetch all projects to calculate project counts
  const { data: projects } = await supabase
    .from("projects")
    .select("creative_name");

  // Calculate project counts per team member
  const projectCounts: Record<string, number> = {};
  if (projects) {
    projects.forEach((p: any) => {
      if (p.creative_name) {
        const name = p.creative_name.trim();
        if (name) {
          projectCounts[name] = (projectCounts[name] || 0) + 1;
        }
      }
    });
  }

  // Map team members with project counts
  // Use email as ID if user_id is NULL (for pending invites)
  return (teamMembers || []).map((member: any) => ({
    id: member.user_id || member.email || `temp-${member.email}`, // Use email as fallback ID
    name: member.full_name || "Unknown",
    email: member.email || "",
    status: member.status || "INVITED",
    projects: projectCounts[member.full_name || ""] || 0,
  }));
}

export default async function AdminTeamPage() {
  const { user, role } = await getUserContext();

  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  const members = await fetchTeamData();

  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Team</h1>
              <p className="text-sm text-gray-500">Manage internal team members working on projects.</p>
            </div>
          </div>
          <TeamPage initialMembers={members} />
        </div>
      </AppShell>
    </RoleGate>
  );
}

