"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { getSupabaseBrowser } from "@/lib/supabase";
import ClientAvatar from "@/components/admin/clients/ClientAvatar";
import DeliverablesSection from "./DeliverablesSection";
import SlackChannelSection from "./SlackChannelSection";

export type ContentLink = { label: string; url: string };
export type Manager = { name: string; email?: string; phone?: string };

export type ProjectLike = {
  id: string;
  title: string;
  client_name: string;
  client_id?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  location?: string | null;
  service_type?: string | null;
  deliverables?: string[] | null;
  status:
    | "REQUEST_RECEIVED"
    | "CONFIRMED"
    | "IN_PRODUCTION"
    | "POST_PRODUCTION"
    | "FINAL_REVIEW"
    | "COMPLETED"
    | "CANCELLED";
  creative_name?: string | null;
  creative_phone?: string | null;
  content_links?: ContentLink[] | null;
  notes?: string | null;
  account_managers?: Manager[] | null;
  slack_channel?: string | null;
  requested_budget?: number | null;
  budget_status?: "PENDING" | "APPROVED" | "COUNTER_PROPOSED" | "REJECTED" | null;
  proposed_budget?: number | null;
};

type Client = { id: string; name: string };

const STATUS_LABELS: { value: ProjectLike["status"]; label: string }[] = [
  { value: "REQUEST_RECEIVED", label: "Request Received" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "POST_PRODUCTION", label: "Post-Production" },
  { value: "FINAL_REVIEW", label: "Final Review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

type ClientData = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  website?: string | null;
  address?: string | null;
  contact_person?: string | null;
} | null;

export default function ProjectDetails({
  initialProject,
  persistent,
  client,
  readOnly = false,
}: {
  initialProject: ProjectLike;
  persistent: boolean;
  client?: ClientData;
  readOnly?: boolean;
}) {
  const router = useRouter();
  // Generate stable IDs for content links (use index-based IDs that persist)
  const [linkIds, setLinkIds] = useState<string[]>(() => 
    (initialProject.content_links ?? []).map((_, idx) => `link-${idx}-${Date.now()}-${Math.random()}`)
  );

  const [project, setProject] = useState<ProjectLike>({
    ...initialProject,
    deliverables: initialProject.deliverables ?? [],
    content_links: initialProject.content_links ?? [],
    account_managers: initialProject.account_managers ?? [],
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksMessage, setLinksMessage] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingCreative, setSavingCreative] = useState(false);
  const [creativeMessage, setCreativeMessage] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<ProjectLike["status"] | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<ProjectLike["status"]>(project.status);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deliverablesText, setDeliverablesText] = useState(
    (initialProject.deliverables ?? []).join(", ")
  );
  const [showClientConfirm, setShowClientConfirm] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [originalClientId, setOriginalClientId] = useState<string | null | undefined>(
    initialProject.client_id
  );

  const statusLabel = useMemo(() => {
    // Check if project is cancelled (either by status or notes marker)
    const isCancelled = project.status === "CANCELLED" || (project.notes && project.notes.includes("[CANCELLED"));
    
    if (isCancelled) {
      return "Cancelled";
    }
    
    const entry = STATUS_LABELS.find((s) => s.value === project.status);
    return entry ? entry.label : "Unknown";
  }, [project.status, project.notes]);

  // Update original status when project changes (e.g., after refresh)
  useEffect(() => {
    setOriginalStatus(project.status);
  }, [project.status]);

  useEffect(() => {
    if (editing && !readOnly) {
      setLoadingClients(true);
      const supabase = getSupabaseBrowser();
      supabase
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true })
        .then(({ data, error }: { data: Client[] | null; error: any }) => {
          if (!error && data) {
            setClients(data);
          }
          setLoadingClients(false);
        });
    }
  }, [editing, readOnly]);

  useEffect(() => {
    if (editing) {
      setDeliverablesText((project.deliverables ?? []).join(", "));
      setOriginalClientId(project.client_id);
    }
  }, [editing, project.deliverables, project.client_id]);

  // Sync linkIds when content_links change from server
  useEffect(() => {
    const currentLinks = project.content_links ?? [];
    if (currentLinks.length !== linkIds.length) {
      // Regenerate IDs if count changed (e.g., after server refresh)
      setLinkIds(currentLinks.map((_, idx) => `link-${idx}-${Date.now()}-${Math.random()}`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.content_links?.length, linkIds.length]); // Only depend on length to avoid unnecessary updates

  const parseDeliverables = (text: string): string[] => {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  // Format date for date input (YYYY-MM-DD)
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      // Try to parse the date - handle various formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      // Return in YYYY-MM-DD format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  const updateField = <K extends keyof ProjectLike>(key: K, value: ProjectLike[K]) => {
    setProject((prev) => ({ ...prev, [key]: value }));
  };

  const handleClientChange = (newClientId: string) => {
    const selectedClient = clients.find((c) => c.id === newClientId);
    if (selectedClient && newClientId !== originalClientId) {
      setPendingClientId(newClientId);
      setShowClientConfirm(true);
    } else if (selectedClient) {
      updateField("client_id", newClientId);
      updateField("client_name", selectedClient.name);
    }
  };

  const confirmClientChange = () => {
    if (pendingClientId) {
      const selectedClient = clients.find((c) => c.id === pendingClientId);
      if (selectedClient) {
        updateField("client_id", pendingClientId);
        updateField("client_name", selectedClient.name);
      }
      setPendingClientId(null);
    }
    setShowClientConfirm(false);
  };

  const cancelClientChange = () => {
    setPendingClientId(null);
    setShowClientConfirm(false);
  };

  // Save only content links
  async function saveContentLinks() {
    setSavingLinks(true);
    setLinksMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_links: project.content_links || [],
        }),
      });

      if (res.ok) {
        setLinksMessage("Links saved.");
        setTimeout(() => setLinksMessage(null), 3000);
        router.refresh();
      } else {
        const text = await res.text();
        setLinksMessage(`Failed to save links${text ? `: ${text}` : ""}`);
      }
    } catch (error) {
      setLinksMessage("Failed to save links. Please try again.");
    } finally {
      setSavingLinks(false);
    }
  }

  // Save only creative info
  async function saveCreative() {
    setSavingCreative(true);
    setCreativeMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creative_name: project.creative_name || null,
          creative_phone: project.creative_phone || null,
        }),
      });

      if (res.ok) {
        setCreativeMessage("Creative info saved.");
        setTimeout(() => setCreativeMessage(null), 3000);
        router.refresh();
      } else {
        const text = await res.text();
        setCreativeMessage(`Failed to save creative info${text ? `: ${text}` : ""}`);
      }
    } catch (error) {
      setCreativeMessage("Failed to save creative info. Please try again.");
    } finally {
      setSavingCreative(false);
    }
  }

  // Save only status
  async function saveStatus() {
    if (!project.status) {
      setStatusMessage("Status is required.");
      return;
    }

    setSavingStatus(true);
    setStatusMessage(null);
    try {
      console.log("[saveStatus] Saving status:", project.status);
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: project.status,
        }),
      });

      const responseText = await res.text();
      console.log("[saveStatus] Response status:", res.status, "body:", responseText);

      if (res.ok) {
        const updated = responseText ? JSON.parse(responseText) : null;
        console.log("[saveStatus] Updated project:", updated);
        setOriginalStatus(project.status);
        setStatusMessage("Status saved.");
        setTimeout(() => setStatusMessage(null), 3000);
        // Force a hard refresh to ensure the board updates
        router.refresh();
        // Also navigate to projects board to see the change
        setTimeout(() => {
          window.location.href = "/admin/projects";
        }, 1000);
      } else {
        setStatusMessage(`Failed to save status${responseText ? `: ${responseText}` : ""}`);
        // Revert to original status on error
        updateField("status", originalStatus);
      }
    } catch (error: any) {
      console.error("[saveStatus] Error:", error);
      setStatusMessage(`Failed to save status: ${error?.message || "Please try again."}`);
      // Revert to original status on error
      updateField("status", originalStatus);
    } finally {
      setSavingStatus(false);
    }
  }

  // Handle status change with confirmation
  function handleStatusChange(newStatus: ProjectLike["status"]) {
    if (newStatus === project.status) {
      return; // No change
    }
    setPendingStatusChange(newStatus);
    setShowStatusConfirm(true);
  }

  function confirmStatusChange() {
    if (pendingStatusChange) {
      updateField("status", pendingStatusChange);
      setShowStatusConfirm(false);
      setPendingStatusChange(null);
      // Note: User must click "Save Status" button to persist
      // The button will be enabled because project.status !== originalStatus now
    }
  }

  function cancelStatusChange() {
    setShowStatusConfirm(false);
    setPendingStatusChange(null);
  }

  async function saveChanges() {
    setSaving(true);
    setMessage(null);
    try {
      const deliverablesArray = parseDeliverables(deliverablesText);
      const accountManagers = (project.account_managers ?? []).filter((m) => m.name?.trim());
      const account_manager_names = accountManagers.map((m) => m.name ?? "");
      const account_manager_emails = accountManagers.map((m) => m.email ?? "");
      const account_manager_phones = accountManagers.map((m) => m.phone ?? "");

      const payload: Record<string, any> = {
        title: project.title,
        event_date: project.event_date || null,
        event_time: project.event_time || null,
        location: project.location || null,
        service_type: project.service_type || null,
        creative_name: project.creative_name || null,
        creative_phone: project.creative_phone || null,
        content_links: project.content_links || null,
        notes: project.notes || null,
        deliverables: deliverablesArray,
      };

      // Only include these fields for admins (when not readOnly)
      if (!readOnly) {
        payload.client_id = project.client_id || null;
        payload.status = project.status;
        payload.account_manager_names = account_manager_names;
        payload.account_manager_emails = account_manager_emails;
        payload.account_manager_phones = account_manager_phones;
      }

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        // Update project state with all saved fields
        setProject((prev) => ({
          ...prev,
          title: updated.title || prev.title,
          event_date: updated.event_date || prev.event_date,
          event_time: updated.event_time || prev.event_time,
          location: updated.location || prev.location,
          service_type: updated.service_type || prev.service_type,
          notes: updated.notes || prev.notes,
          deliverables: deliverablesArray,
          account_managers: accountManagers,
        }));
        setMessage("Changes saved successfully!");
        setTimeout(() => {
          setEditing(false);
          setMessage(null);
          router.refresh();
        }, 1500);
      } else {
        const text = await res.text();
        setMessage(`Save failed${text ? `: ${text}` : ""}`);
      }
    } catch (error) {
      setMessage("Save failed due to a network or server error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">Projects &gt; {project.title}</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Project Details</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-sm font-medium",
              (project.status === "CANCELLED" || (project.notes && project.notes.includes("[CANCELLED")))
                ? "bg-red-100 text-red-700"
                : "bg-neutral-100 text-neutral-700"
            )}
          >
            {statusLabel}
          </span>
          <button
            type="button"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          {readOnly && (
            <button
              type="button"
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Delete Project</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Are you sure you want to delete this project? This project will not be fulfilled by Rampant and will no longer be attended to. 
              The project will appear as cancelled on the admin side.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const res = await fetch(`/api/projects/${project.id}`, {
                      method: "DELETE",
                    });

                    if (res.ok) {
                      // Redirect to projects list
                      router.push("/app/projects");
                    } else {
                      const text = await res.text();
                      alert(`Failed to delete project: ${text}`);
                      setDeleting(false);
                    }
                  } catch (error) {
                    alert("Failed to delete project. Please try again.");
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Status Section (for clients) */}
      {readOnly && project.requested_budget && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 font-semibold text-neutral-900">Budget Status</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Requested Budget:</span>
              <span className="font-medium text-neutral-900">
                ${project.requested_budget.toLocaleString()}
              </span>
            </div>
            {project.budget_status === "PENDING" && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-yellow-800 font-medium mb-1">Budget Pending Approval</p>
                <p className="text-yellow-700 text-xs">
                  Your budget request is being reviewed. You will be notified once it&apos;s approved or if we have a counter proposal.
                </p>
              </div>
            )}
            {project.budget_status === "APPROVED" && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-green-800 font-medium">Budget Approved</p>
                <p className="text-green-700 text-xs mt-1">
                  Your budget has been approved. The project is confirmed.
                </p>
              </div>
            )}
            {project.budget_status === "COUNTER_PROPOSED" && project.proposed_budget && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-blue-800 font-medium mb-2">Counter Proposal Received</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-700">Proposed Budget:</span>
                    <span className="font-medium text-blue-900">
                      ${project.proposed_budget.toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={async () => {
                      if (confirm(`Accept the counter proposal of $${project.proposed_budget?.toLocaleString()}?`)) {
                        try {
                          const res = await fetch(`/api/projects/${project.id}/budget`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "ACCEPT_COUNTER" }),
                          });

                          if (res.ok) {
                            alert("Counter proposal accepted! The project is now confirmed.");
                            router.refresh();
                          } else {
                            const text = await res.text();
                            alert(`Failed to accept counter proposal: ${text}`);
                          }
                        } catch (error) {
                          alert("Failed to accept counter proposal. Please try again.");
                        }
                      }
                    }}
                  >
                    Accept Counter Proposal
                  </button>
                </div>
              </div>
            )}
            {project.budget_status === "REJECTED" && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-red-800 font-medium">Budget Rejected</p>
                <p className="text-red-700 text-xs mt-1">
                  Your budget request has been rejected. Please contact us to discuss.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 font-semibold text-neutral-900">Key Project Information</div>
            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <InfoRow label="Project Title" value={project.title} />
              <InfoRow label="Client" value={project.client_name} />
              <InfoRow label="Event Date" value={project.event_date} />
              <InfoRow label="Event Time" value={project.event_time} />
              <InfoRow label="Location" value={project.location} className="md:col-span-2" />
              <InfoRow label="Service Type" value={project.service_type} />
              <div className="md:col-span-2">
                <div className="text-neutral-500">Deliverables</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(project.deliverables ?? []).length ? (
                    (project.deliverables ?? []).map((d) => (
                      <span key={d} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-700">—</span>
                  )}
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold text-neutral-900">Assigned Creative</div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={saveCreative}
                  disabled={savingCreative}
                  className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCreative ? "Saving…" : "Save"}
                </button>
              )}
            </div>
            {creativeMessage && !readOnly && (
              <div className={`mb-3 rounded-md px-3 py-2 text-sm ${creativeMessage.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {creativeMessage}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {readOnly ? (
                <>
                  <InfoRow label="Creative Name" value={project.creative_name} />
                  <InfoRow label="Contact Number" value={project.creative_phone} />
                </>
              ) : (
                <>
                  <LabeledInput
                    label="Creative Name"
                    value={project.creative_name ?? ""}
                    onChange={(value) => updateField("creative_name", value)}
                  />
                  <LabeledInput
                    label="Contact Number"
                    value={project.creative_phone ?? ""}
                    onChange={(value) => updateField("creative_phone", value)}
                  />
                </>
              )}
            </div>
          </section>

          {readOnly && <SlackChannelSection projectId={project.id} slackChannel={project.slack_channel} readOnly={readOnly} />}

          {/* Deliverable Links section - persisted to public.projects.content_links (JSONB) */}
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold text-neutral-900">Deliverable Links</div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={saveContentLinks}
                  disabled={savingLinks}
                  className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingLinks ? "Saving…" : "Save Links"}
                </button>
              )}
            </div>
            {linksMessage && !readOnly && (
              <div className={`mb-3 rounded-md px-3 py-2 text-sm ${linksMessage.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {linksMessage}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {(project.content_links ?? []).length > 0 ? (
                (project.content_links ?? []).map((link, index) => (
                  readOnly ? (
                    <div key={index} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-neutral-900">{link.label || "Untitled"}</div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          {link.url}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div key={linkIds[index] || index} className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_auto]">
                      <input
                        className="rounded-md border px-3 py-2 text-sm"
                        placeholder="Label"
                        value={link.label}
                        onChange={(e) => {
                          const next = [...(project.content_links ?? [])];
                          next[index] = { ...next[index], label: e.target.value } as ContentLink;
                          updateField("content_links", next);
                        }}
                      />
                      <input
                        className="rounded-md border px-3 py-2 text-sm"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => {
                          const next = [...(project.content_links ?? [])];
                          next[index] = { ...next[index], url: e.target.value } as ContentLink;
                          updateField("content_links", next);
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-md border px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                        onClick={() => {
                          const next = [...(project.content_links ?? [])];
                          const nextIds = [...linkIds];
                          next.splice(index, 1);
                          nextIds.splice(index, 1);
                          setLinkIds(nextIds);
                          updateField("content_links", next);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )
                ))
              ) : (
                <div className="text-sm text-neutral-500">No content links available.</div>
              )}
              {!readOnly && (
                <button
                  type="button"
                  className="w-max rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
                  onClick={() => {
                    const newId = `link-${Date.now()}-${Math.random()}`;
                    setLinkIds([...linkIds, newId]);
                    updateField("content_links", [...(project.content_links ?? []), { label: "", url: "" }]);
                  }}
                >
                  + Add Link
                </button>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 font-semibold text-neutral-900">Project Notes</div>
            {readOnly ? (
              <div className="text-sm text-neutral-700 whitespace-pre-line min-h-[8rem]">
                {project.notes || "No notes available."}
              </div>
            ) : (
              <>
                <textarea
                  className="h-32 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Internal notes…"
                  value={project.notes ?? ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
                <div className="mt-2 text-xs text-neutral-400">Notes update when you save changes.</div>
              </>
            )}
          </section>

          {!readOnly && <DeliverablesSection projectId={project.id} readOnly={readOnly} />}

          <Link
            href={readOnly ? "/app/projects" : "/admin/projects"}
            className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
          >
            &larr; Back to Projects
          </Link>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold text-neutral-900">Project Status</div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={saveStatus}
                  disabled={savingStatus}
                  className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={project.status === originalStatus ? "No changes to save" : "Save status changes"}
                >
                  {savingStatus ? "Saving…" : "Save Status"}
                </button>
              )}
            </div>
            {statusMessage && !readOnly && (
              <div className={`mb-3 rounded-md px-3 py-2 text-sm ${statusMessage.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {statusMessage}
              </div>
            )}
            <div className="flex flex-col gap-2">
              {STATUS_LABELS.map((status) => {
                const active = project.status === status.value;
                return readOnly ? (
                  <div
                    key={status.value}
                    className={clsx(
                      "w-full rounded-md border px-3 py-2 text-left text-sm",
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-neutral-200 bg-white text-neutral-700"
                    )}
                  >
                    {status.label}
                  </div>
                ) : (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => handleStatusChange(status.value)}
                    className={clsx(
                      "w-full rounded-md border px-3 py-2 text-left text-sm",
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    )}
                  >
                    {status.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 font-semibold text-neutral-900">Account Managers</div>
            <div className="flex flex-col gap-3 text-sm">
              {(project.account_managers ?? []).length ? (
                (project.account_managers ?? []).map((manager, index) => (
                  <div key={`${manager.email ?? manager.name}-${index}`} className="rounded-lg border px-3 py-2">
                    <div className="font-medium text-neutral-900">{manager.name}</div>
                    {manager.email && <div className="text-neutral-600">{manager.email}</div>}
                    {manager.phone && <div className="text-neutral-600">{manager.phone}</div>}
                  </div>
                ))
              ) : (
                <div className="text-neutral-500">No managers listed.</div>
              )}
            </div>
          </section>

          {!readOnly && <DeliverablesSection projectId={project.id} readOnly={readOnly} />}

          {!readOnly && <SlackChannelSection projectId={project.id} slackChannel={project.slack_channel} readOnly={readOnly} />}

          {/* Client Information Card - data from public.clients via project.client_id */}
          {/* Hide client info card for CLIENT users (they already know who they are) */}
          {client && !readOnly && (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mb-3 font-semibold text-neutral-900">Client Information</div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ClientAvatar name={client.name} logoUrl={client.logo_url} size={48} />
                  <span className="font-semibold text-neutral-900">{client.name}</span>
                </div>
                {client.email && (
                  <div>
                    <div className="text-xs text-neutral-500">Email</div>
                    <p className="text-sm text-neutral-900">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <div className="text-xs text-neutral-500">Phone</div>
                    <p className="text-sm text-neutral-900">{client.phone}</p>
                  </div>
                )}
                {client.website && (
                  <div>
                    <div className="text-xs text-neutral-500">Website</div>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      {client.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {client.address && (
                  <div>
                    <div className="text-xs text-neutral-500">Address</div>
                    <p className="text-sm text-neutral-700 whitespace-pre-line">{client.address}</p>
                  </div>
                )}
                {project.client_id && (
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-sm text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                  >
                    View client profile →
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {editing && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditing(false);
              setMessage(null);
            }
          }}
        >
          <div 
            className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-semibold">Edit Project</div>
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
                onClick={() => {
                  setEditing(false);
                  setMessage(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <LabeledInput label="Project Title" value={project.title} onChange={(value) => updateField("title", value)} />
                {!readOnly && (
                  <ClientSelect
                    label="Client"
                    clients={clients}
                    loading={loadingClients}
                    value={project.client_id ?? ""}
                    onChange={handleClientChange}
                  />
                )}
                <LabeledInput 
                  label="Event Date" 
                  type="date"
                  value={formatDateForInput(project.event_date)} 
                  onChange={(value) => updateField("event_date", value)} 
                />
                <LabeledInput label="Event Time" value={project.event_time ?? ""} onChange={(value) => updateField("event_time", value)} />
                <LabeledInput label="Location" value={project.location ?? ""} onChange={(value) => updateField("location", value)} className="md:col-span-2" />
                <LabeledInput label="Service Type" value={project.service_type ?? ""} onChange={(value) => updateField("service_type", value)} className="md:col-span-2" />
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-500 mb-1">Deliverables (comma separated)</div>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Photography, Video Highlights, Photo Album Design"
                    value={deliverablesText}
                    onChange={(e) => setDeliverablesText(e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-neutral-500 mb-1">Project Notes</div>
                <textarea
                  className="h-32 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Internal notes…"
                  value={project.notes ?? ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </div>
              {!readOnly && (
                <AccountManagersEditor
                  managers={project.account_managers ?? []}
                  onChange={(managers) => updateField("account_managers", managers)}
                />
              )}
            </div>
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-neutral-500">
                Changes will be saved to the database.
              </span>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
                disabled={saving}
                onClick={saveChanges}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
            {message && (
              <div className={`mt-3 rounded-md px-3 py-2 text-sm ${
                message.includes("Failed") || message.includes("failed")
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}

      {showClientConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="mb-4 text-lg font-semibold">Update Client?</div>
            <div className="mb-4 text-sm text-neutral-600">
              Changing the client will move this project to the selected client&apos;s dashboard. Continue?
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                onClick={cancelClientChange}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                onClick={confirmClientChange}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusConfirm && pendingStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
            <div className="mb-4 text-lg font-semibold">Change Project Status?</div>
            <div className="mb-4 text-sm text-neutral-600">
              Are you sure you want to change this project&apos;s status from <strong>{statusLabel}</strong> to <strong>{STATUS_LABELS.find((s) => s.value === pendingStatusChange)?.label}</strong>? This will move it to a different column on your Projects board.
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                onClick={cancelStatusChange}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                onClick={confirmStatusChange}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <div className="text-neutral-500">{label}</div>
      <div className="mt-1 text-neutral-900">{value && value.length ? value : "—"}</div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  className,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-neutral-500">{label}</div>
      <input
        type={type}
        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ClientSelect({
  label,
  clients,
  loading,
  value,
  onChange,
}: {
  label: string;
  clients: Client[];
  loading: boolean;
  value: string;
  onChange: (clientId: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <select
        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">{loading ? "Loading..." : "Select a client"}</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </div>
  );
}

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

function AccountManagersEditor({
  managers,
  onChange,
}: {
  managers: Manager[];
  onChange: (managers: Manager[]) => void;
}) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    // Fetch team/admin members for dropdown
    async function fetchTeamMembers() {
      setLoadingMembers(true);
      try {
        const res = await fetch("/api/team-members");
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.members || []);
        }
      } catch (err) {
        console.error("Error fetching team members:", err);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchTeamMembers();
  }, []);

  const updateManager = (index: number, field: keyof Manager, value: string) => {
    const next = [...managers];
    if (!next[index]) {
      next[index] = { name: "" };
    }
    next[index] = { ...next[index], [field]: value || undefined };
    onChange(next);
  };

  const selectTeamMember = (index: number, memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (member) {
      const next = [...managers];
      if (!next[index]) {
        next[index] = { name: "" };
      }
      next[index] = {
        name: member.name,
        email: member.email,
        phone: undefined, // Phone not available in profiles, keep empty
      };
      onChange(next);
    }
  };

  const removeManager = (index: number) => {
    const next = [...managers];
    next.splice(index, 1);
    onChange(next);
  };

  const addManager = () => {
    onChange([...managers, { name: "" }]);
  };

  const isValidEmail = (email: string) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className="md:col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-neutral-500">Account Managers</div>
        <button
          type="button"
          className="rounded-md border px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
          onClick={addManager}
        >
          + Add Manager
        </button>
      </div>
      <div className="space-y-2">
        {managers.map((manager, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    selectTeamMember(index, e.target.value);
                  }
                }}
                disabled={loadingMembers}
              >
                <option value="">Select from Team/Admin...</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role === "ADMIN" ? "Admin" : "Team"})
                  </option>
                ))}
              </select>
              <input
                className="mt-2 w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="Or enter name manually"
                value={manager.name ?? ""}
                onChange={(e) => updateManager(index, "name", e.target.value)}
              />
            </div>
            <div>
              <input
                className={`w-full rounded-md border px-2 py-1.5 text-sm ${
                  manager.email && !isValidEmail(manager.email) ? "border-red-300" : ""
                }`}
                placeholder="Email"
                type="email"
                value={manager.email ?? ""}
                onChange={(e) => updateManager(index, "email", e.target.value)}
              />
              {manager.email && !isValidEmail(manager.email) && (
                <div className="mt-0.5 text-xs text-red-600">Invalid email format</div>
              )}
            </div>
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Phone"
              value={manager.phone ?? ""}
              onChange={(e) => updateManager(index, "phone", e.target.value)}
            />
            <button
              type="button"
              className="rounded-md border px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
              onClick={() => removeManager(index)}
            >
              Remove
            </button>
          </div>
        ))}
        {managers.length === 0 && (
          <div className="rounded-lg border border-dashed p-3 text-center text-sm text-neutral-400">
            No account managers. Click &quot;+ Add Manager&quot; to add one.
          </div>
        )}
      </div>
    </div>
  );
}
