import { getSupabaseAdmin } from "./supabaseAdmin";
import { getUserContext } from "./authServer";

export type ClientSettingsData = {
  fullName: string | null;
  email: string | null;
  organizationName: string | null;
  notificationPrefs: {
    receiveEmailUpdates: boolean;
    notifyOnDeliverables: boolean;
    notifyOnInvoiceDue: boolean;
  };
};

export async function getClientSettings(): Promise<ClientSettingsData | null> {
  try {
    const userContext = await getUserContext();
    
    if (!userContext.user || !userContext.clientId) {
      return null;
    }

    const supabase = getSupabaseAdmin();

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, receive_email_updates, notify_on_deliverables, notify_on_invoice_due")
      .eq("user_id", userContext.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return null;
    }

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name")
      .eq("id", userContext.clientId)
      .maybeSingle();

    if (clientError) {
      console.error("Error fetching client:", clientError);
    }

    return {
      fullName: profile?.full_name || null,
      email: profile?.email || userContext.user.email || null,
      organizationName: client?.name || null,
      notificationPrefs: {
        receiveEmailUpdates: profile?.receive_email_updates ?? true,
        notifyOnDeliverables: profile?.notify_on_deliverables ?? true,
        notifyOnInvoiceDue: profile?.notify_on_invoice_due ?? true,
      },
    };
  } catch (error) {
    console.error("Error in getClientSettings:", error);
    return null;
  }
}

