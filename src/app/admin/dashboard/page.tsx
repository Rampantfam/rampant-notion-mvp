import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getUserContext } from "@/lib/authServer";

export default async function AdminDashboard() {
  const { user, role } = await getUserContext();
  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  return (
    <AppShell role="ADMIN">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome to the admin dashboard. This page will be built next.</p>
      </div>
    </AppShell>
  );
}
