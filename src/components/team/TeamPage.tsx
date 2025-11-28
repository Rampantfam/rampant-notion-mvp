"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ClientAvatar from "@/components/admin/clients/ClientAvatar";
import clsx from "clsx";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INVITED" | null;
  projects: number;
};

type TeamPageProps = {
  initialMembers: TeamMember[];
};

export default function TeamPage({ initialMembers }: TeamPageProps) {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshMembers = useCallback(async () => {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
    router.refresh();
  }, [router]);

  const handleAdd = () => {
    setSelectedMember(null);
    setError(null);
    setSubmitting(false); // Reset submitting state when opening modal
    setShowAddModal(true);
  };

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setError(null);
    setShowEditModal(true);
  };

  const handleDelete = (member: TeamMember) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to add team member");
        setSubmitting(false);
        return;
      }

      // Capture invite URL if present
      if (json.inviteUrl) {
        setLastInviteUrl(json.inviteUrl);
      }

      setShowAddModal(false);
      setSubmitting(false); // Reset submitting state
      await refreshMembers();
    } catch (err: any) {
      setError(err?.message || "Network error");
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMember) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const email = formData.get("email") as string;
    const status = formData.get("status") as string;

    try {
      const res = await fetch(`/api/team/${selectedMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, status }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to update team member");
        setSubmitting(false);
        return;
      }

      setShowEditModal(false);
      setSelectedMember(null);
      setSubmitting(false); // Reset submitting state
      await refreshMembers();
    } catch (err: any) {
      setError(err?.message || "Network error");
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedMember) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/team/${selectedMember.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json?.error || "Failed to delete team member");
        setSubmitting(false);
        return;
      }

      setShowDeleteModal(false);
      setSelectedMember(null);
      setSubmitting(false); // Reset submitting state
      await refreshMembers();
    } catch (err: any) {
      setError(err?.message || "Network error");
      setSubmitting(false);
    }
  };

  const getRoleBadge = () => {
    // For now, all team members have the same role - we can extend this later
    // In the future, we might add role distinctions like "Editor", "Contributor", etc.
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        Team Member
      </span>
    );
  };

  const getStatusBadge = (status: string | null) => {
    const isActive = status === "ACTIVE";
    return (
      <span
        className={clsx(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
        )}
      >
        {isActive ? "Active" : "Pending"}
      </span>
    );
  };

  const handleCopyInviteUrl = async () => {
    if (!lastInviteUrl) return;
    try {
      await navigator.clipboard.writeText(lastInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Unable to copy link. Please copy manually.");
    }
  };

  return (
    <>
      {/* Invite URL Banner */}
      {lastInviteUrl && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm">
          <div className="mb-2 font-medium text-blue-900">
            Invite link created – copy and send to your team member.
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={lastInviteUrl}
              readOnly
              className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={handleCopyInviteUrl}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => setLastInviteUrl(null)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-medium">Team Members</div>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            + Add Team Member
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Member</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Projects</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No team members yet. Click &quot;+ Add Team Member&quot; to get started.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClientAvatar name={member.name} size={40} />
                        <span className="font-medium text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getRoleBadge()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                    <td className="px-4 py-3">{getStatusBadge(member.status)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                        {member.projects} {member.projects === 1 ? "Project" : "Projects"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(member)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Team Member</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setError(null);
                  setSubmitting(false); // Reset submitting state when closing modal
                  setLastInviteUrl(null); // Clear invite URL when closing modal
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  name="full_name"
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError(null);
                    setSubmitting(false); // Reset submitting state when canceling
                  }}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Team Member</h2>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                  setError(null);
                  setSubmitting(false); // Reset submitting state when closing modal
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  name="full_name"
                  required
                  defaultValue={selectedMember.name}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={selectedMember.email}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  defaultValue={selectedMember.status || "INVITED"}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INVITED">Invited</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                    setError(null);
                    setSubmitting(false); // Reset submitting state when canceling
                  }}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Remove Team Member?</h2>
              <p className="mt-2 text-sm text-gray-600">
                Remove {selectedMember.name}? This won&apos;t delete existing projects but they will no longer appear in the Team list.
              </p>
            </div>
            {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedMember(null);
                  setError(null);
                  setSubmitting(false); // Reset submitting state when canceling
                }}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

