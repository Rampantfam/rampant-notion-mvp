"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";

export type ClientInvoice = {
  id: string;
  invoice_number?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  amount?: number | null;
  date?: string | null;
  status?: string | null;
};

export default function ClientInvoicesCard({ invoices = [], clientId }: { invoices?: ClientInvoice[]; clientId: string }) {
  const router = useRouter();
  const unpaidTotal = invoices
    .filter((inv) => (inv.status ?? "").toLowerCase() === "unpaid")
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-black">Invoices</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            {formatCurrency(unpaidTotal)} Unpaid
          </span>
          <Link
            href={`/admin/invoices/new?clientId=${encodeURIComponent(clientId)}`}
            className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            + Create Invoice
          </Link>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Invoice ID</th>
              <th className="py-2 pr-4">Project</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const status = (invoice.status ?? "").toLowerCase();
                const statusClass = status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700";
                return (
                  <tr key={invoice.id} className="border-t">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="font-medium text-black hover:text-orange-600 hover:underline"
                      >
                        #{invoice.invoice_number || invoice.id.substring(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{invoice.project_name ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-600">{formatCurrency(invoice.amount ?? 0)}</td>
                    <td className="py-3 pr-4 text-gray-600">{formatDate(invoice.date)}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass}`}>
                        {invoice.status ?? "Unpaid"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
