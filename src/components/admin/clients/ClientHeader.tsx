"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClientAvatar from "@/components/admin/clients/ClientAvatar";
import ConfirmModal from "@/components/common/ConfirmModal";

export default function ClientHeader({
  client,
  clientId,
}: {
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    logo_url?: string | null;
    contact_person?: string | null;
    address?: string | null;
    slack_url?: string | null;
  };
  clientId: string;
}) {
  const router = useRouter();
  const [isEditOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email || "",
    phone: client.phone || "",
    website: client.website || "",
    contact_person: client.contact_person || "",
    address: client.address || "",
    logo_url: client.logo_url || "",
    slack_url: (client as any).slack_url || "",
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <ClientAvatar name={client.name} logoUrl={client.logo_url} size={56} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-black">{client.name}</h1>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {client.email ? (
              <button
                onClick={() => navigator.clipboard.writeText(client.email ?? "")}
                className="underline-offset-2 hover:underline"
                type="button"
              >
                {client.email}
              </button>
            ) : (
              <span>—</span>
            )}
            <span className="text-gray-300">•</span>
            <span>{client.phone ?? "—"}</span>
            <span className="text-gray-300">•</span>
            {client.website ? (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                {client.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Edit Client
      </button>
      <ConfirmModal
        open={isEditOpen}
        onClose={() => {
          setEditOpen(false);
          setError(null);
          setFormData({
            name: client.name,
            email: client.email || "",
            phone: client.phone || "",
            website: client.website || "",
            contact_person: client.contact_person || "",
            address: client.address || "",
            logo_url: client.logo_url || "",
            slack_url: (client as any).slack_url || "",
          });
        }}
        title="Edit Client"
        description="Update client information below."
        primaryText={saving ? "Saving..." : "Save"}
        onPrimary={async () => {
          setSaving(true);
          setError(null);
          try {
            const res = await fetch(`/api/clients/${clientId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (!res.ok) {
              setError(json?.error ?? "Failed to update client.");
              setSaving(false);
              return;
            }

            setEditOpen(false);
            router.refresh();
          } catch (err: any) {
            setError(err?.message ?? "Network error.");
            setSaving(false);
          }
        }}
      >
        <div className="space-y-3 text-sm">
          {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</div>}
          <label className="block">
            <span className="text-gray-600">Client Name</span>
            <input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Client name"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Contact Email</span>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Email address"
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Phone</span>
            <input
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Phone number"
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Website</span>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="https://example.com"
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Contact Person</span>
            <input
              value={formData.contact_person}
              onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Contact person name"
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Address</span>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Company address"
              rows={3}
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Logo URL</span>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Slack Link</span>
            <input
              type="url"
              value={formData.slack_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, slack_url: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </label>
        </div>
      </ConfirmModal>
    </div>
  );
}
