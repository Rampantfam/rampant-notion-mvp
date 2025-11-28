import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/authServer";
import { AppShell } from "@/components/shell/AppShell";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { user, role } = await getUserContext();

  if (!user || role !== "TEAM") {
    redirect("/");
  }

  return (
    <AppShell role="TEAM">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Team Member Dashboard</h1>
          <p className="text-sm text-gray-500">Team member dashboard coming soon. You will see only the projects assigned to you here.</p>
        </div>
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-600">Your personalized dashboard is under development.</p>
        </div>
      </div>
    </AppShell>
  );
}

