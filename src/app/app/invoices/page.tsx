import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getUserContext } from "@/lib/authServer";
import InvoicesClient from "@/components/invoices/InvoicesClient";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
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

  return (
    <AppShell role="CLIENT">
      <InvoicesClient />
    </AppShell>
  );
}

