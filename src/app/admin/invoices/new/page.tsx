"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import RoleGate from "@/components/auth/RoleGate";
import InvoiceForm from "@/components/invoices/InvoiceForm";

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get clientId from query params
  const clientIdFromQuery = searchParams.get("clientId") || undefined;

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

      if (lineItemsWithTotals.some((item: any) => !item.item || !item.description)) {
        setError("All line items must have an item name and description.");
        setSubmitting(false);
        return;
      }

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

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to create invoice.");
        setSubmitting(false);
      } else {
        router.push("/admin/invoices");
      }
    } catch (err: any) {
      setError(err?.message ?? "Network error.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/admin/invoices");
  }

  return (
    <InvoiceForm
      mode="create"
      initialData={clientIdFromQuery ? { clientId: clientIdFromQuery } : undefined}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitting={submitting}
      error={error}
    />
  );
}

export default function NewInvoicePage() {
  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Create New Invoice</h1>
            <p className="text-sm text-gray-500">Generate an invoice for an existing client and project.</p>
          </div>
          <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
            <NewInvoiceForm />
          </Suspense>
        </div>
      </AppShell>
    </RoleGate>
  );
}
