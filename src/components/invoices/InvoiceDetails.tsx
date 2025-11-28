"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import ClientAvatar from "@/components/admin/clients/ClientAvatar";
import clsx from "clsx";

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
} | null;

type ProjectData = {
  id: string;
  title: string;
  status: string | null;
  event_date: string | null;
  notes: string | null;
} | null;

type InvoiceDetailsProps = {
  invoice: InvoiceData;
  client: ClientData;
  project: ProjectData;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusBadge(status: "UNPAID" | "PAID" | "PAST_DUE") {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
        Paid
      </span>
    );
  }
  if (status === "PAST_DUE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
        Past Due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
      Unpaid
    </span>
  );
}

function getProjectStatusBadge(status: string | null) {
  if (!status) return null;
  const normalized = status.toUpperCase();
  if (normalized.includes("PROGRESS") || normalized === "IN_PRODUCTION") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
        In Progress
      </span>
    );
  }
  if (normalized.includes("COMPLETE")) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {status}
    </span>
  );
}

export default function InvoiceDetails({ invoice, client, project, lineItems, subtotal, tax, total }: InvoiceDetailsProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const invoiceDisplayId = invoice.invoice_number || invoice.id.substring(0, 8);
  const clientName = client?.name || "Unknown Client";
  const projectTitle = project?.title || "No Project";

  async function handleDownloadPDF() {
    setDownloading(true);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "Failed to download PDF" }));
        throw new Error(json?.error || "Failed to download PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceDisplayId.replace("#", "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setDownloadError(err?.message ?? "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold">Invoice {invoiceDisplayId}</h1>
            {getStatusBadge(invoice.status)}
          </div>
          <p className="text-sm text-gray-500">
            Invoice for {clientName} {project && `· ${projectTitle}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? "Downloading..." : "Download PDF"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/admin/invoices/${invoice.id}/edit`)}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Invoice
            </span>
          </button>
        </div>
        {downloadError && (
          <div className="mt-2 text-sm text-red-600">{downloadError}</div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Summary Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Invoice Summary</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Invoice ID</label>
                  <p className="text-sm font-medium text-gray-900">{invoiceDisplayId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Issue Date</label>
                  <p className="text-sm font-medium text-gray-900">{formatDate(invoice.issue_date)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Due Date</label>
                  <p className="text-sm font-medium text-gray-900">{formatDate(invoice.due_date)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Amount</label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Payment Terms</label>
                  <p className="text-sm font-medium text-gray-900">Net 14</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Line Items</h2>
            {lineItems.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-neutral-700">Item</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-neutral-700">Description</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-neutral-700">Qty</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-neutral-700">Rate</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-neutral-700">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-neutral-100">
                          <td className="py-3 px-3 text-sm text-gray-900">{item.item}</td>
                          <td className="py-3 px-3 text-sm text-gray-600">{item.description}</td>
                          <td className="py-3 px-3 text-sm text-gray-900 text-right">{item.qty}</td>
                          <td className="py-3 px-3 text-sm text-gray-900 text-right">{formatCurrency(item.rate)}</td>
                          <td className="py-3 px-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.lineTotal || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (0%)</span>
                      <span className="text-gray-900">{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-neutral-200">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">No line items found.</p>
            )}
          </div>

          {/* Notes & Payment Instructions Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Notes & Payment Instructions</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {invoice.notes || "No additional notes or payment instructions."}
            </p>
          </div>
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          {/* Client Information Card */}
          {client && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Client Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ClientAvatar name={client.name} logoUrl={client.logo_url} size={48} />
                  <span className="font-semibold text-gray-900">{client.name}</span>
                </div>
                {client.email && (
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{client.phone}</p>
                  </div>
                )}
                {invoice.bill_to && (
                  <div>
                    <label className="text-xs text-gray-500">Billing Address</label>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.bill_to}</p>
                  </div>
                )}
                {invoice.client_id ? (
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-sm text-orange-500 hover:text-orange-600 inline-flex items-center gap-1"
                  >
                    View client profile →
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">No client linked</span>
                )}
              </div>
            </div>
          )}

          {/* Project Information Card */}
          {project && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Project Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Project Name</label>
                  <p className="text-sm font-medium text-gray-900">{project.title}</p>
                </div>
                {project.status && (
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <div className="mt-1">{getProjectStatusBadge(project.status)}</div>
                  </div>
                )}
                {project.event_date && (
                  <div>
                    <label className="text-xs text-gray-500">Start Date</label>
                    <p className="text-sm text-gray-900">{formatDate(project.event_date)}</p>
                  </div>
                )}
                {project.notes && (
                  <div>
                    <label className="text-xs text-gray-500">Description</label>
                    <p className="text-sm text-gray-700">{project.notes}</p>
                  </div>
                )}
                {invoice.project_id ? (
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="text-sm text-orange-500 hover:text-orange-600 inline-flex items-center gap-1"
                  >
                    View project details →
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">No project linked</span>
                )}
              </div>
            </div>
          )}

          {/* Payment Activity Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Payment Activity</h2>
            {invoice.status === "PAID" ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 space-y-1">
                    <p className="text-lg font-semibold text-green-900">{formatCurrency(total)}</p>
                    <p className="text-sm text-green-700">Paid via ACH</p>
                    {invoice.updated_at && (
                      <p className="text-xs text-green-600">{formatDate(invoice.updated_at)}</p>
                    )}
                    <p className="text-xs text-green-600 mt-2">Recorded by Admin User</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm text-gray-600">No payment recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back to Invoices link */}
      <div className="pt-4">
        <Link href="/admin/invoices" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Invoices
        </Link>
      </div>
    </div>
  );
}

