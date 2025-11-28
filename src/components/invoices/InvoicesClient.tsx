"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import clsx from "clsx";

type Invoice = {
  id: string;
  invoice_id: string;
  project_name: string;
  amount: number;
  status: "PAID" | "UNPAID" | "OVERDUE";
  due_date: string;
  invoice_url: string | null;
  created_at: string;
};

export default function InvoicesClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (monthFilter !== "all") {
        params.append("month", monthFilter);
      }

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data || []);
      } else {
        const text = await res.text();
        setError(`Failed to load invoices: ${text}`);
      }
    } catch (err) {
      setError("Failed to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  function getStatusBadgeClass(status: Invoice["status"]): string {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-700";
      case "UNPAID":
        return "bg-orange-100 text-orange-700";
      case "OVERDUE":
        return "bg-red-100 text-red-700";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  }

  function getStatusIcon(status: Invoice["status"]) {
    switch (status) {
      case "PAID":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case "UNPAID":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case "OVERDUE":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  }

  function getStatusLabel(status: Invoice["status"]): string {
    switch (status) {
      case "PAID":
        return "Paid";
      case "UNPAID":
        return "Unpaid";
      case "OVERDUE":
        return "Overdue";
      default:
        return status;
    }
  }

  function isOverdue(dueDate: string, status: Invoice["status"]): boolean {
    if (status === "PAID") return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Months" }];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  // Update invoice status to OVERDUE if past due date
  const processedInvoices = useMemo(() => {
    return invoices.map((invoice) => {
      if (isOverdue(invoice.due_date, invoice.status) && invoice.status !== "PAID") {
        return { ...invoice, status: "OVERDUE" as const };
      }
      return invoice;
    });
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Invoices</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage and view all your invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <div className="text-sm text-neutral-500">Loading invoices...</div>
        </div>
      ) : processedInvoices.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <div className="text-sm text-neutral-500">No invoices found.</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Invoice ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {processedInvoices.map((invoice) => {
                const isOverdueDate = isOverdue(invoice.due_date, invoice.status);
                return (
                  <tr key={invoice.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                      {invoice.invoice_id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-700">
                      {invoice.project_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          getStatusBadgeClass(invoice.status)
                        )}
                      >
                        {getStatusIcon(invoice.status)}
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td
                      className={clsx(
                        "whitespace-nowrap px-6 py-4 text-sm",
                        isOverdueDate && invoice.status !== "PAID" ? "text-red-600 font-medium" : "text-neutral-700"
                      )}
                    >
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {invoice.invoice_url ? (
                        <a
                          href={invoice.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          View Invoice
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-neutral-400">No link available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

