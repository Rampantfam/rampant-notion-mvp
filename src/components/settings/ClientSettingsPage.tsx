"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { ClientSettingsData } from "@/lib/clientSettings";
import clsx from "clsx";

type ClientSettingsPageProps = {
  initialData: ClientSettingsData;
};

export default function ClientSettingsPage({ initialData }: ClientSettingsPageProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  // Account Information state
  const [fullName, setFullName] = useState(initialData.fullName || "");
  const [email, setEmail] = useState(initialData.email || "");
  const [organizationName, setOrganizationName] = useState(initialData.organizationName || "");

  // Notification preferences state
  const [receiveEmailUpdates, setReceiveEmailUpdates] = useState(initialData.notificationPrefs.receiveEmailUpdates);
  const [notifyOnDeliverables, setNotifyOnDeliverables] = useState(initialData.notificationPrefs.notifyOnDeliverables);
  const [notifyOnInvoiceDue, setNotifyOnInvoiceDue] = useState(initialData.notificationPrefs.notifyOnInvoiceDue);

  // Support form state
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Store initial values for cancel
  const initialFullName = initialData.fullName || "";
  const initialEmail = initialData.email || "";
  const initialOrganizationName = initialData.organizationName || "";
  const initialReceiveEmailUpdates = initialData.notificationPrefs.receiveEmailUpdates;
  const initialNotifyOnDeliverables = initialData.notificationPrefs.notifyOnDeliverables;
  const initialNotifyOnInvoiceDue = initialData.notificationPrefs.notifyOnInvoiceDue;

  const handleCancel = () => {
    setFullName(initialFullName);
    setEmail(initialEmail);
    setOrganizationName(initialOrganizationName);
    setReceiveEmailUpdates(initialReceiveEmailUpdates);
    setNotifyOnDeliverables(initialNotifyOnDeliverables);
    setNotifyOnInvoiceDue(initialNotifyOnInvoiceDue);
    setError(null);
    setSuccess(null);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/client-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          organizationName,
          receiveEmailUpdates,
          notifyOnDeliverables,
          notifyOnInvoiceDue,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to save settings");
        setSaving(false);
        return;
      }

      setSuccess("Settings saved successfully");
      router.refresh();
      setSaving(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Network error");
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password");
        setChangingPassword(false);
        return;
      }

      setSuccess("Password updated successfully");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setChangingPassword(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update password");
      setChangingPassword(false);
    }
  };

  const handleSendSupportMessage = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      setError("Please fill in both subject and message");
      return;
    }

    setSendingSupport(true);
    setError(null);

    try {
      const res = await fetch("/api/client-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: supportSubject,
          message: supportMessage,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to send message");
        setSendingSupport(false);
        return;
      }

      setSuccess("Your message has been sent. A Rampant team member will reply within 24 hours.");
      setSupportSubject("");
      setSupportMessage("");
      setSendingSupport(false);
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || "Network error");
      setSendingSupport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Help & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Account Information Card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Organization Name</label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter organization name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter email address"
              />
              <button
                type="button"
                onClick={() => {}}
                className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
              >
                Edit
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value="••••••••"
                disabled
                className="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
              >
                Change Password
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-neutral-700">Receive Email Updates</label>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={receiveEmailUpdates}
                onChange={(e) => setReceiveEmailUpdates(e.target.checked)}
                className="peer sr-only"
              />
              <div
                className={clsx(
                  "peer h-6 w-11 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white",
                  receiveEmailUpdates ? "bg-orange-500" : "bg-neutral-200"
                )}
              ></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-neutral-700">Notify Me When Deliverables Are Uploaded</label>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={notifyOnDeliverables}
                onChange={(e) => setNotifyOnDeliverables(e.target.checked)}
                className="peer sr-only"
              />
              <div
                className={clsx(
                  "peer h-6 w-11 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white",
                  notifyOnDeliverables ? "bg-orange-500" : "bg-neutral-200"
                )}
              ></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-neutral-700">Notify Me When Invoice Is Due</label>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={notifyOnInvoiceDue}
                onChange={(e) => setNotifyOnInvoiceDue(e.target.checked)}
                className="peer sr-only"
              />
              <div
                className={clsx(
                  "peer h-6 w-11 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white",
                  notifyOnInvoiceDue ? "bg-orange-500" : "bg-neutral-200"
                )}
              ></div>
            </label>
          </div>
        </div>
      </div>

      {/* Help & Support Card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Help & Support</h2>
        <div className="space-y-6">
          {/* Quick Links */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-neutral-700">Quick Links</h3>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-orange-600 hover:text-orange-700 hover:underline">
                How do I access deliverables?
              </a>
              <a href="#" className="block text-sm text-orange-600 hover:text-orange-700 hover:underline">
                How do I pay an invoice?
              </a>
              <a href="#" className="block text-sm text-orange-600 hover:text-orange-700 hover:underline">
                How do I request a project?
              </a>
            </div>
          </div>

          {/* Contact Support Form */}
          <div>
            <h3 className="mb-4 text-sm font-medium text-neutral-700">Contact Support</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  placeholder="Enter subject"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Message</label>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Describe your issue or question"
                  rows={4}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                type="button"
                onClick={handleSendSupportMessage}
                disabled={sendingSupport}
                className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingSupport ? "Sending..." : "Send Message"}
              </button>
              <p className="text-xs text-neutral-500">
                A Rampant team member will reply to your request within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
                className="rounded p-1 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Confirm new password"
                />
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setError(null);
                  }}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

