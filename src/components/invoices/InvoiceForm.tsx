"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

type Client = { id: string; name: string; email?: string | null };
type Project = { id: string; title: string; client_id: string };

type LineItem = {
  id: string;
  item: string;
  description: string;
  qty: number;
  rate: number;
};

type InvoiceFormData = {
  invoiceNumber: string;
  clientId: string;
  projectId: string;
  billTo: string;
  status: "UNPAID" | "PAID" | "PAST_DUE";
  issueDate: string;
  dueDate: string;
  notes: string;
  lineItems: LineItem[];
};

type InvoiceFormProps = {
  mode: "create" | "edit";
  invoiceId?: string;
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function InvoiceForm({ mode, invoiceId, initialData, onSubmit, onCancel, submitting, error }: InvoiceFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [form, setForm] = useState<InvoiceFormData>({
    invoiceNumber: initialData?.invoiceNumber || "",
    clientId: initialData?.clientId || "",
    projectId: initialData?.projectId || "",
    billTo: initialData?.billTo || "",
    status: initialData?.status || "UNPAID",
    issueDate: initialData?.issueDate || new Date().toISOString().split("T")[0],
    dueDate: initialData?.dueDate || new Date().toISOString().split("T")[0],
    notes: initialData?.notes || "",
    lineItems: initialData?.lineItems || [{ id: generateId(), item: "", description: "", qty: 0, rate: 0 }],
  });

  // Fetch clients on mount
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    (async () => {
      setLoadingClients(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email")
        .order("name", { ascending: true });
      if (!error && data) setClients(data as Client[]);
      setLoadingClients(false);
    })();
  }, []);

  // Fetch projects when client is selected or when initial data changes
  useEffect(() => {
    if (!form.clientId) {
      setProjects([]);
      if (!initialData?.clientId) {
        setForm((f) => ({ ...f, projectId: "" }));
      }
      return;
    }

    const supabase = getSupabaseBrowser();
    setLoadingProjects(true);
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, client_id")
        .eq("client_id", form.clientId)
        .order("title", { ascending: true });
      if (!error && data) {
        setProjects(data as Project[]);
      }
      setLoadingProjects(false);
    })();
  }, [form.clientId, initialData?.clientId]);

  // Calculate total amount from line items
  const totalAmount = useMemo(() => {
    return form.lineItems.reduce((sum, item) => {
      const lineTotal = item.qty * item.rate;
      return sum + lineTotal;
    }, 0);
  }, [form.lineItems]);

  const canSubmit = useMemo(() => {
    return (
      form.clientId.trim() !== "" &&
      form.lineItems.length > 0 &&
      form.lineItems.every((item) => item.qty > 0 && item.rate > 0 && item.item.trim() && item.description.trim()) &&
      totalAmount > 0 &&
      !submitting
    );
  }, [form.clientId, form.lineItems, totalAmount, submitting]);

  function handleAddLineItem() {
    setForm((f) => ({
      ...f,
      lineItems: [...f.lineItems, { id: generateId(), item: "", description: "", qty: 0, rate: 0 }],
    }));
  }

  function handleRemoveLineItem(id: string) {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.filter((item) => item.id !== id),
    }));
  }

  function handleLineItemChange(id: string, field: keyof LineItem, value: string | number) {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-5xl">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        {/* General Invoice Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice ID</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2"
                value={form.invoiceNumber}
                onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                placeholder="#3048"
              />
              <p className="mt-1 text-xs text-gray-500">Optional — if left empty, the system can auto-generate an ID.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 bg-white"
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, projectId: "" }))}
                disabled={loadingClients}
                required
              >
                <option value="">{loadingClients ? "Loading..." : "Select client..."}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select
                className="w-full rounded-md border px-3 py-2 bg-white"
                value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                disabled={!form.clientId || loadingProjects}
              >
                <option value="">
                  {!form.clientId ? "Select client first..." : loadingProjects ? "Loading..." : "Select project..."}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Projects filtered by selected client.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bill To</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 min-h-[100px]"
                value={form.billTo}
                onChange={(e) => setForm((f) => ({ ...f, billTo: e.target.value }))}
                placeholder={`Company name
Street address
City, State ZIP
Country`}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input type="text" className="w-full rounded-md border px-3 py-2 bg-gray-50" value={formatCurrency(totalAmount)} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full rounded-md border px-3 py-2 bg-white"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "UNPAID" | "PAID" | "PAST_DUE" }))}
              >
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="PAST_DUE">Past Due</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Issue Date</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={form.issueDate}
                onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Invoice Details Section */}
        <div className="border-t border-neutral-200 pt-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-neutral-700">Item</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-neutral-700">Description</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-neutral-700">Qty</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-neutral-700">Rate</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-neutral-700">Line Total</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {form.lineItems.map((item) => {
                  const lineTotal = item.qty * item.rate;
                  return (
                    <tr key={item.id} className="border-b border-neutral-100">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                          value={item.item}
                          onChange={(e) => handleLineItemChange(item.id, "item", e.target.value)}
                          placeholder="Item name"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(item.id, "description", e.target.value)}
                          placeholder="Description"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                          value={item.qty || ""}
                          onChange={(e) => handleLineItemChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border px-2 py-1 text-sm"
                          value={item.rate || ""}
                          onChange={(e) => handleLineItemChange(item.id, "rate", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-2 px-3 text-sm font-medium">{formatCurrency(lineTotal)}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Remove line item"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddLineItem}
            className="mt-4 text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add line item
          </button>
        </div>

        {/* Notes Section */}
        <div className="border-t border-neutral-200 pt-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Notes (optional)</h2>
          <textarea
            className="w-full rounded-md border px-3 py-2 min-h-[100px]"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Add any additional notes or payment instructions..."
          />
        </div>

        {/* Error Message */}
        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        {/* Footer */}
        <div className="border-t border-neutral-200 pt-6 mt-6">
          <p className="text-sm text-gray-500 mb-4">This invoice will appear in the Invoices list and on the client view once saved.</p>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onCancel} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-orange-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-600"
            >
              {submitting ? (mode === "create" ? "Creating..." : "Updating...") : mode === "create" ? "Create Invoice" : "Update Invoice"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

