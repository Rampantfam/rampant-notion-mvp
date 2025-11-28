"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export type Deliverable = {
  id: string;
  project_id: string;
  name: string;
  type: string;
  external_link: string | null;
  upload_date: string;
  status: "AWAITING_APPROVAL" | "APPROVED" | "CHANGES_REQUESTED";
  created_at: string;
  updated_at: string;
};

type DeliverablesSectionProps = {
  projectId: string;
  readOnly: boolean;
};

export default function DeliverablesSection({ projectId, readOnly }: DeliverablesSectionProps) {
  const router = useRouter();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({
    name: "",
    type: "Design",
    external_link: "",
    upload_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchDeliverables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function fetchDeliverables() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables`);
      if (res.ok) {
        const data = await res.json();
        setDeliverables(data || []);
      } else if (res.status === 404 || res.status === 500) {
        // Table might not exist yet - that's okay, just show empty state
        setDeliverables([]);
      } else {
        setError("Failed to load deliverables");
      }
    } catch (err) {
      // Table might not exist yet - that's okay
      setDeliverables([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(deliverableId: string, newStatus: "APPROVED" | "CHANGES_REQUESTED") {
    setUpdating(deliverableId);
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchDeliverables();
        router.refresh();
      } else {
        const text = await res.text();
        alert(`Failed to update: ${text}`);
      }
    } catch (err) {
      alert("Failed to update deliverable status");
    } finally {
      setUpdating(null);
    }
  }

  async function handleAddDeliverable() {
    if (!newDeliverable.name.trim()) {
      alert("Deliverable name is required");
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeliverable),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewDeliverable({
          name: "",
          type: "Design",
          external_link: "",
          upload_date: new Date().toISOString().split("T")[0],
        });
        await fetchDeliverables();
        router.refresh();
      } else {
        const text = await res.text();
        alert(`Failed to add deliverable: ${text}`);
      }
    } catch (err) {
      alert("Failed to add deliverable");
    }
  }

  async function handleDelete(deliverableId: string) {
    if (!confirm("Are you sure you want to delete this deliverable?")) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchDeliverables();
        router.refresh();
      } else {
        const text = await res.text();
        alert(`Failed to delete: ${text}`);
      }
    } catch (err) {
      alert("Failed to delete deliverable");
    }
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  function getStatusBadgeClass(status: Deliverable["status"]): string {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "CHANGES_REQUESTED":
        return "bg-yellow-100 text-yellow-700";
      case "AWAITING_APPROVAL":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  }

  function getStatusLabel(status: Deliverable["status"]): string {
    switch (status) {
      case "APPROVED":
        return "Approved";
      case "CHANGES_REQUESTED":
        return "Changes Requested";
      case "AWAITING_APPROVAL":
        return "Awaiting Approval";
      default:
        return status;
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="text-sm text-neutral-500">Loading deliverables...</div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Project Deliverables</h2>
            {deliverables.length > 0 && (
              <p className="text-sm text-neutral-500 mt-1">
                Started {formatDate(deliverables[deliverables.length - 1]?.created_at || "")}
              </p>
            )}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              + Add Deliverable
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {deliverables.length === 0 ? (
          <div className="text-sm text-neutral-500">No deliverables yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">Deliverable Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">External Link</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">Upload Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((deliverable) => (
                  <tr key={deliverable.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3 text-sm text-neutral-900">{deliverable.name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{deliverable.type}</td>
                    <td className="px-4 py-3 text-sm">
                      {deliverable.external_link ? (
                        <a
                          href={deliverable.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1"
                        >
                          {deliverable.external_link.includes("drive") ? "View in Drive" : deliverable.external_link.includes("folder") ? "Open Folder" : "Open Link"}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{formatDate(deliverable.upload_date)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("rounded-full px-2 py-1 text-xs font-medium", getStatusBadgeClass(deliverable.status))}>
                        {getStatusLabel(deliverable.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        deliverable.status === "APPROVED" ? (
                          <span className="text-sm text-neutral-400">Approved</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(deliverable.id, "APPROVED")}
                              disabled={updating === deliverable.id}
                              className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updating === deliverable.id ? "Updating..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(deliverable.id, "CHANGES_REQUESTED")}
                              disabled={updating === deliverable.id}
                              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Request Changes
                            </button>
                          </div>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(deliverable.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-semibold">Add Deliverable</div>
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
                onClick={() => setShowAddModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Deliverable Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newDeliverable.name}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, name: e.target.value })}
                  placeholder="e.g., Logo Concepts v1"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Type</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newDeliverable.type}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, type: e.target.value })}
                >
                  <option value="Design">Design</option>
                  <option value="Video">Video</option>
                  <option value="Photo">Photo</option>
                  <option value="Document">Document</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">External Link</label>
                <input
                  type="url"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newDeliverable.external_link}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, external_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Upload Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newDeliverable.upload_date}
                  onChange={(e) => setNewDeliverable({ ...newDeliverable, upload_date: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                onClick={handleAddDeliverable}
              >
                Add Deliverable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

