import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import RoleGate from "@/components/auth/RoleGate";
import { AppShell } from "@/components/shell/AppShell";
import InvoiceDetails from "@/components/invoices/InvoiceDetails";

export const dynamic = "force-dynamic";

type InvoiceLineItem = {
  item: string;
  description: string;
  qty: number;
  rate: number;
  lineTotal?: number;
};

type InvoiceData = {
  id: string;
  invoice_number: string | null;
  client_id: string | null;
  project_id: string | null;
  amount: number;
  status: "UNPAID" | "PAID" | "PAST_DUE";
  issue_date: string | null;
  due_date: string | null;
  bill_to: string | null;
  line_items: InvoiceLineItem[] | null;
  notes: string | null;
  updated_at: string | null;
};

type ClientData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
};

type ProjectData = {
  id: string;
  title: string;
  status: string | null;
  event_date: string | null;
  notes: string | null;
};

async function fetchInvoiceData(id: string) {
  const supabase = getSupabaseAdmin();

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (invoiceError) {
    console.error("Error fetching invoice:", invoiceError);
    return null;
  }

  if (!invoice) {
    return null;
  }

  const invoiceData = invoice as InvoiceData;

  // Fetch client if client_id exists
  let client: ClientData | null = null;
  if (invoiceData.client_id) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("id, name, email, phone, logo_url")
      .eq("id", invoiceData.client_id)
      .maybeSingle();
    if (clientData) {
      client = clientData as ClientData;
    }
  }

  // Fetch project if project_id exists
  let project: ProjectData | null = null;
  if (invoiceData.project_id) {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, title, status, event_date, notes")
      .eq("id", invoiceData.project_id)
      .maybeSingle();
    if (projectData) {
      project = projectData as ProjectData;
    }
  }

  // Process line items
  let lineItems: InvoiceLineItem[] = [];
  if (invoiceData.line_items && Array.isArray(invoiceData.line_items)) {
    lineItems = invoiceData.line_items.map((item: any) => {
      const lineTotal = item.lineTotal ?? item.qty * item.rate;
      return {
        item: item.item || "",
        description: item.description || "",
        qty: item.qty || 0,
        rate: item.rate || 0,
        lineTotal,
      };
    });
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const tax = 0; // Static for now
  const total = invoiceData.amount || subtotal;

  return {
    invoice: invoiceData,
    client,
    project,
    lineItems,
    subtotal,
    tax,
    total,
  };
}

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const data = await fetchInvoiceData(resolvedParams.id);

  if (!data) {
    return (
      <RoleGate allow="ADMIN">
        <AppShell role="ADMIN">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-500">Invoice not found.</p>
          </div>
        </AppShell>
      </RoleGate>
    );
  }

  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <InvoiceDetails {...data} />
      </AppShell>
    </RoleGate>
  );
}

