"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import RoleGate from "@/components/auth/RoleGate";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { getSupabaseBrowser } from "@/lib/supabase";

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
};

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [invoiceId, setInvoiceId] = useState<string>("");

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params;
      setInvoiceId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!invoiceId) return;

    const supabase = getSupabaseBrowser();
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Invoice not found.");
        setLoading(false);
        return;
      }

      setInvoice(data as InvoiceData);
      setLoading(false);
    })();
  }, [invoiceId]);

  async function handleSubmit(formData: any) {
    setSubmitting(true);
    setError(null);

    try {
      const lineItemsWithTotals = formData.lineItems.map((item: any) => ({
        item: item.item.trim(),
        description: item.description.trim(),
        qty: item.qty,
        rate: item.rate,
        lineTotal: item.qty * item.rate,
      }));

      const payload = {
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        clientId: formData.clientId,
        projectId: formData.projectId.trim() || null,
        amount: lineItemsWithTotals.reduce((sum: number, item: any) => sum + item.lineTotal, 0),
        status: formData.status,
        issueDate: formData.issueDate || null,
        dueDate: formData.dueDate || null,
        billTo: formData.billTo.trim() || null,
        lineItems: lineItemsWithTotals,
        notes: formData.notes.trim() || null,
      };

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to update invoice.");
        setSubmitting(false);
      } else {
        // Redirect to invoice details page - use replace to ensure fresh data is fetched
        router.replace(`/admin/invoices/${invoiceId}?t=${Date.now()}`);
      }
    } catch (err: any) {
      setError(err?.message ?? "Network error.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (invoiceId) {
      router.push(`/admin/invoices/${invoiceId}`);
    } else {
      router.push("/admin/invoices");
    }
  }

  if (loading) {
    return (
      <RoleGate allow="ADMIN">
        <AppShell role="ADMIN">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-500">Loading invoice...</p>
          </div>
        </AppShell>
      </RoleGate>
    );
  }

  if (error && !invoice) {
    return (
      <RoleGate allow="ADMIN">
        <AppShell role="ADMIN">
          <div className="space-y-6">
            <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
              <p className="text-gray-500">{error}</p>
              <button
                onClick={() => router.push("/admin/invoices")}
                className="text-sm text-orange-500 hover:text-orange-600"
              >
                ← Back to Invoices
              </button>
            </div>
          </div>
        </AppShell>
      </RoleGate>
    );
  }

  if (!invoice) {
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

  // Convert invoice data to form format
  const lineItems = invoice.line_items && Array.isArray(invoice.line_items)
    ? invoice.line_items.map((item: any) => ({
        id: generateId(),
        item: item.item || "",
        description: item.description || "",
        qty: item.qty || 0,
        rate: item.rate || 0,
      }))
    : [{ id: generateId(), item: "", description: "", qty: 0, rate: 0 }];

  const initialData = {
    invoiceNumber: invoice.invoice_number || "",
    clientId: invoice.client_id || "",
    projectId: invoice.project_id || "",
    billTo: invoice.bill_to || "",
    status: invoice.status,
    issueDate: invoice.issue_date || new Date().toISOString().split("T")[0],
    dueDate: invoice.due_date || new Date().toISOString().split("T")[0],
    notes: invoice.notes || "",
    lineItems,
  };

  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Edit Invoice</h1>
            <p className="text-sm text-gray-500">Update invoice details below.</p>
          </div>
          <InvoiceForm
            mode="edit"
            invoiceId={invoiceId}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitting={submitting}
            error={error}
          />
        </div>
      </AppShell>
    </RoleGate>
  );
}
