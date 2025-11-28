"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClientAvatar from "@/components/admin/clients/ClientAvatar";
import clsx from "clsx";

type OrgSettings = {
  organization_name: string | null;
  contact_email: string | null;
  phone: string | null;
  logo_url: string | null;
  email_notifications: boolean;
  budget_alerts: boolean;
};

type AdminProfile = {
  full_name: string | null;
  email: string | null;
};

type AdminMember = {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  status: string | null;
};

type SettingsPageProps = {
  initialOrgSettings: OrgSettings;
  initialAdminProfile: AdminProfile;
  initialAdminMembers: AdminMember[];
};

export default function SettingsPage({
  initialOrgSettings,
  initialAdminProfile,
  initialAdminMembers,
}: SettingsPageProps) {
  const router = useRouter();
  const [orgSettings, setOrgSettings] = useState(initialOrgSettings);
  const [adminProfile, setAdminProfile] = useState(initialAdminProfile);
  const [adminMembers, setAdminMembers] = useState(initialAdminMembers);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSaveOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingOrg(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      organization_name: formData.get("organization_name") as string,
      contact_email: formData.get("contact_email") as string,
      phone: formData.get("phone") as string,
      logo_url: formData.get("logo_url") as string,
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to save organization settings");
        setSavingOrg(false);
        return;
      }

      setOrgSettings(json.settings);
      router.refresh();
      setSavingOrg(false);
    } catch (err: any) {
      setError(err?.message || "Network error");
      setSavingOrg(false);
    }
  };

  const handleSavePrefs = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingPrefs(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      email_notifications: formData.get("email_notifications") === "on",
      budget_alerts: formData.get("budget_alerts") === "on",
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to save preferences");
        setSavingPrefs(false);
        return;
      }

      setOrgSettings(json.settings);
      router.refresh();
      setSavingPrefs(false);
    } catch (err: any) {
      setError(err?.message || "Network error");
      setSavingPrefs(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const email = formData.get("email") as string;

    try {
      // Create admin profile (no auth user yet - directory only)
      // user_id is NULL until the admin member is invited and creates an auth account
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: null, // NULL until auth user is created via invite flow
          full_name,
          email,
          role: "ADMIN",
          status: "INVITED",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to add admin member");
        return;
      }

      // Capture invite URL if present
      if (json.inviteUrl) {
        setLastInviteUrl(json.inviteUrl);
      }

      setShowAddAdmin(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Network error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">Manage your organization settings and preferences.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Invite URL Banner */}
      {lastInviteUrl && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm">
          <div className="mb-2 font-medium text-blue-900">
            Invite link created – copy and send to your admin member.
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
              onClick={async () => {
                if (!lastInviteUrl) return;
                try {
                  await navigator.clipboard.writeText(lastInviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (err) {
                  console.error("Failed to copy:", err);
                  alert("Unable to copy link. Please copy manually.");
                }
              }}
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

      {/* Organization Info */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Organization Info</h2>
        <form onSubmit={handleSaveOrg} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization Name</label>
            <input
              name="organization_name"
              defaultValue={orgSettings.organization_name || ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Rampant Digital Agency"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Email</label>
            <input
              name="contact_email"
              type="email"
              defaultValue={orgSettings.contact_email || ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="admin@rampant.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              name="phone"
              defaultValue={orgSettings.phone || ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization Logo</label>
            <div className="mt-2 flex items-center gap-4">
              <ClientAvatar name={orgSettings.organization_name || "Org"} logoUrl={orgSettings.logo_url} size={64} />
              <div>
                <input
                  name="logo_url"
                  type="url"
                  defaultValue={orgSettings.logo_url || ""}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="https://..."
                />
                <p className="mt-1 text-xs text-gray-500">Enter logo URL or upload via button below</p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                Upload Logo
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingOrg}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {savingOrg ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Account Preferences */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Account Preferences</h2>
        <form onSubmit={handleSavePrefs} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Admin Name</label>
            <input
              defaultValue={adminProfile.full_name || ""}
              disabled
              className="mt-1 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Admin Email</label>
            <input
              defaultValue={adminProfile.email || ""}
              disabled
              className="mt-1 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="password"
                defaultValue="••••••••"
                disabled
                className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="text-sm text-orange-600 hover:text-orange-700"
                onClick={() => alert("Password change functionality coming soon")}
              >
                Change
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-xs text-gray-500">Receive email updates about project progress</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  name="email_notifications"
                  type="checkbox"
                  defaultChecked={orgSettings.email_notifications}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Budget Alerts</label>
                <p className="text-xs text-gray-500">Get notified when projects exceed budget thresholds</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  name="budget_alerts"
                  type="checkbox"
                  defaultChecked={orgSettings.budget_alerts}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPrefs}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {savingPrefs ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>

      {/* Team Members (Admins) */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Team Members</h2>
          <button
            type="button"
            onClick={() => setShowAddAdmin(true)}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Add Team Member
          </button>
        </div>
        <div className="space-y-3">
          {adminMembers.map((member) => (
            <div key={member.user_id || member.email || `admin-${member.email}`} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <ClientAvatar name={member.full_name || "Unknown"} size={40} />
                <div>
                  <div className="font-medium text-gray-900">{member.full_name || "Unknown"}</div>
                  <div className="text-sm text-gray-500">{member.email || "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  Admin
                </span>
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    member.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
                  )}
                >
                  {member.status === "ACTIVE" ? "Active" : "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Admin Member</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddAdmin(false);
                  setError(null);
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
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  name="full_name"
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="John Anderson"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="john@rampant.com"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAdmin(false);
                    setError(null);
                  }}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

