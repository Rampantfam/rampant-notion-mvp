import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/authServer";
import { AppShell } from "@/components/shell/AppShell";
import RoleGate from "@/components/auth/RoleGate";
import SettingsPage from "@/components/settings/SettingsPage";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function fetchSettings() {
  const supabase = getSupabaseAdmin();

  // Fetch organization settings
  const { data: orgSettings } = await supabase
    .from("organization_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  // Fetch current admin user's profile
  const { user } = await getUserContext();
  let adminProfile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    adminProfile = data;
  }

  // Fetch all admin profiles for Team Members section
  const { data: adminMembers } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, status")
    .eq("role", "ADMIN")
    .order("full_name", { ascending: true });

  return {
    orgSettings: orgSettings || {
      organization_name: null,
      contact_email: null,
      phone: null,
      logo_url: null,
      email_notifications: true,
      budget_alerts: false,
    },
    adminProfile: adminProfile || { full_name: null, email: null },
    adminMembers: adminMembers || [],
  };
}

export default async function AdminSettingsPage() {
  const { user, role } = await getUserContext();

  if (!user || role !== "ADMIN") {
    redirect("/");
  }

  const { orgSettings, adminProfile, adminMembers } = await fetchSettings();

  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <SettingsPage
          initialOrgSettings={orgSettings}
          initialAdminProfile={adminProfile}
          initialAdminMembers={adminMembers}
        />
      </AppShell>
    </RoleGate>
  );
}

