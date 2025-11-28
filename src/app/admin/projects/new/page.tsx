"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import RoleGate from "@/components/auth/RoleGate";
import { getSupabaseBrowser } from "@/lib/supabase";

type Client = { id: string; name: string; email?: string | null };

const STATUS_OPTIONS = [
  "Request Received",
  "Confirmed",
  "In Production",
  "Post-Production",
  "Final Review",
  "Completed",
] as const;

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    client_id: string;
    assigned_creative: string;
    event_date: string;
    event_time: string;
    location: string;
    service_type: string;
    status: string;
    deliverables: string;
    notes: string;
  }>({
    name: "",
    client_id: "",
    assigned_creative: "",
    event_date: "",
    event_time: "",
    location: "",
    service_type: "",
    status: STATUS_OPTIONS[0],
    deliverables: "",
    notes: "",
  });

  // Initialize status and clientId from URL search params if present
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam && STATUS_OPTIONS.includes(statusParam as any)) {
      setForm((prev) => ({ ...prev, status: statusParam }));
    }
    const clientIdParam = searchParams.get("clientId");
    if (clientIdParam) {
      setForm((prev) => ({ ...prev, client_id: clientIdParam }));
    }
  }, [searchParams]);

  // Supabase browser client for reading clients (RLS-safe)
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

  const canSubmit = useMemo(() => {
    return form.name.trim() !== "" && form.client_id.trim() !== "" && form.status.trim() !== "" && !submitting;
  }, [form, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrMsg(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrMsg(json?.error ?? "Failed to create project.");
      } else if (json?.id) {
        router.replace(`/admin/projects/${json.id}`);
      }
    } catch (err: any) {
      setErrMsg(err?.message ?? "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
          className="text-neutral-600 hover:text-neutral-900"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold">Create New Project</h1>
      </div>
      <p className="text-sm text-gray-500">Fill out the details below to add a new project.</p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Enter project name"
            required
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border px-3 py-2 bg-white"
            value={form.client_id}
            onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
            disabled={loadingClients}
            required
          >
            <option value="">{loadingClients ? "Loading clients..." : clients.length === 0 ? "No clients found" : "Select Client"}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Assigned Creative</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.assigned_creative}
            onChange={(e) => setForm((f) => ({ ...f, assigned_creative: e.target.value }))}
            placeholder="Name or handle"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Project Date</label>
          <input
            type="date"
            className="w-full rounded-md border px-3 py-2"
            value={form.event_date}
            onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Project Time</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.event_time}
            onChange={(e) => setForm((f) => ({ ...f, event_time: e.target.value }))}
            placeholder="e.g., 9AM – 1PM"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Location / Address</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Enter event location"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">Category / Service Type</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={form.service_type}
            onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
            placeholder="e.g., Photography"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium mb-1">
            Initial Status <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border px-3 py-2 bg-white"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            required
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Deliverables Needed</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 min-h-[96px]"
            value={form.deliverables}
            onChange={(e) => setForm((f) => ({ ...f, deliverables: e.target.value }))}
            placeholder="Describe deliverables (you can use commas, e.g., Photography, Video Highlights)"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 min-h-[96px]"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional notes or special requirements..."
          />
        </div>

        {errMsg && <div className="md:col-span-2 text-sm text-red-600">{errMsg}</div>}

        <div className="md:col-span-2 flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="rounded-md border px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-orange-500 text-white px-4 py-2 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <RoleGate allow="ADMIN">
      <AppShell role="ADMIN">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <NewProjectForm />
        </Suspense>
      </AppShell>
    </RoleGate>
  );
}
