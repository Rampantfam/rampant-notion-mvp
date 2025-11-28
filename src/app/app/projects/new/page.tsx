"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getUserRoleAndClientId } from "@/lib/supabase";

function RequestProjectForm() {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    event_date: string;
    event_time: string;
    location: string;
    service_type: string;
    deliverables: string;
    notes: string;
    requested_budget: string;
  }>({
    name: "",
    event_date: "",
    event_time: "",
    location: "",
    service_type: "",
    deliverables: "",
    notes: "",
    requested_budget: "",
  });

  // Get client_id from user profile
  useEffect(() => {
    (async () => {
      const { client_id, role } = await getUserRoleAndClientId();
      if (role !== "CLIENT" || !client_id) {
        router.replace("/app/projects");
        return;
      }
      setClientId(client_id);
      setLoading(false);
    })();
  }, [router]);

  const canSubmit = useMemo(() => {
    return form.name.trim() !== "" && form.requested_budget.trim() !== "" && clientId !== null && !submitting;
  }, [form, clientId, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !clientId) return;

    setSubmitting(true);
    setErrMsg(null);
    try {
      // Submit as a request - status will be automatically set to REQUEST_RECEIVED
      const requestedBudget = parseFloat(form.requested_budget.replace(/,/g, "")) || 0;
      if (requestedBudget <= 0) {
        setErrMsg("Please enter a valid budget amount.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          client_id: clientId, // Automatically use the logged-in client's ID
          assigned_creative: "", // Empty - admin will assign
          event_date: form.event_date || null,
          event_time: form.event_time || null,
          location: form.location || null,
          service_type: form.service_type || null,
          status: "Request Received", // Always REQUEST_RECEIVED for client requests
          deliverables: form.deliverables || null,
          notes: form.notes || null,
          requested_budget: requestedBudget,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrMsg(json?.error ?? "Failed to submit project request.");
      } else {
        // Show success message and redirect
        alert("Project request submitted successfully! Your budget is pending approval. You will be notified once it's reviewed.");
        router.replace("/app/projects");
      }
    } catch (err: any) {
      setErrMsg(err?.message ?? "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell role="CLIENT">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!clientId) {
    return (
      <AppShell role="CLIENT">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Request New Project</h1>
          </div>
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Your account is not linked to a client organization. Please contact support.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/app/projects")}
          className="text-neutral-600 hover:text-neutral-900"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold">Request New Project</h1>
      </div>
      <p className="text-sm text-gray-500">
        Fill out the details below to request a new project. Your request will be sent to the admin team for review.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        <div className="md:col-span-2">
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
            placeholder="e.g., Photography, Video Production"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Deliverables Needed</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 min-h-[96px]"
            value={form.deliverables}
            onChange={(e) => setForm((f) => ({ ...f, deliverables: e.target.value }))}
            placeholder="Describe deliverables (you can use commas, e.g., Photography, Video Highlights, Photo Album Design)"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Requested Budget <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full rounded-md border px-3 py-2"
            value={form.requested_budget}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9,]/g, "");
              setForm((f) => ({ ...f, requested_budget: value }));
            }}
            placeholder="e.g., 10,000"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the budget you want to stay within for this project. This will be reviewed by the admin team.
          </p>
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
            onClick={() => router.push("/app/projects")}
            className="rounded-md border px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-orange-500 text-white px-4 py-2 disabled:opacity-60"
          >
            {submitting ? "Submitting Request..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RequestProjectPage() {
  return (
    <AppShell role="CLIENT">
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <RequestProjectForm />
      </Suspense>
    </AppShell>
  );
}

