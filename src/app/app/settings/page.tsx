import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/authServer";
import { AppShell } from "@/components/shell/AppShell";
import { getClientSettings } from "@/lib/clientSettings";
import ClientSettingsPage from "@/components/settings/ClientSettingsPage";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, role } = await getUserContext();

  if (!user) {
    redirect("/");
  }

  if (role !== "CLIENT") {
    redirect("/");
  }

  const settingsData = await getClientSettings();

  if (!settingsData) {
    return (
      <AppShell role="CLIENT">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Help & Settings</h1>
            <p className="text-sm text-gray-500">Manage your account settings and preferences.</p>
          </div>
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Unable to load settings. Please contact support if this issue persists.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="CLIENT">
      <ClientSettingsPage initialData={settingsData} />
    </AppShell>
  );
}

