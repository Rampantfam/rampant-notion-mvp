"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import ClientAvatar from "@/components/admin/clients/ClientAvatar";
import clsx from "clsx";

type InvoiceStatus = "PAID" | "UNPAID" | "PAST_DUE";

interface Invoice {
  id: string; // UUID from database
  invoiceNumber: string; // "#3045"
  clientName: string; // "TechCorp Inc."
  clientAvatarUrl?: string | null;
  projectName: string;
  amount: number; // 12500 (we'll format)
  status: InvoiceStatus;
  issueDate: string; // ISO e.g. "2024-11-01"
  dueDate: string; // ISO
}

type InvoicesPageProps = {
  invoices: Invoice[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function InvoicesPage({ invoices }: InvoicesPageProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-gray-500">Manage all client invoices and payments</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/invoices/new")}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
        >
          + New Invoice
        </button>
      </div>

      {/* Invoice Table Card */}
      <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No invoices yet. Click &apos;New Invoice&apos; to create one.
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[1fr,1.5fr,1.5fr,1fr,1fr,1fr,1fr] gap-4 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700">
              <div>Invoice ID</div>
              <div>Client</div>
              <div>Project</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Issue Date</div>
              <div>Due Date</div>
            </div>

            {/* Table Rows */}
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/admin/invoices/${invoice.id}`}
                className="grid grid-cols-[1fr,1.5fr,1.5fr,1fr,1fr,1fr,1fr] items-center gap-4 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                <div className="font-medium text-neutral-900">{invoice.invoiceNumber}</div>
                <div className="flex items-center gap-2">
                  <ClientAvatar name={invoice.clientName} logoUrl={invoice.clientAvatarUrl || undefined} size={32} />
                  <span className="text-neutral-700">{invoice.clientName}</span>
                </div>
                <div className="text-neutral-600">{invoice.projectName}</div>
                <div className="font-semibold text-neutral-900">{formatCurrency(invoice.amount)}</div>
                <div>
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                      invoice.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : invoice.status === "PAST_DUE"
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    )}
                  >
                    {invoice.status === "PAID" ? (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Paid
                      </>
                    ) : invoice.status === "PAST_DUE" ? (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Past Due
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Unpaid
                      </>
                    )}
                  </span>
                </div>
                <div className="text-neutral-600">{formatDate(invoice.issueDate)}</div>
                <div className="text-neutral-600">{formatDate(invoice.dueDate)}</div>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

