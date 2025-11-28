"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SlackChannelSectionProps = {
  projectId: string;
  slackChannel: string | null | undefined;
  readOnly: boolean;
};

export default function SlackChannelSection({ projectId, slackChannel, readOnly }: SlackChannelSectionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slackChannel || "");

  // Always show for clients, even if no channel exists

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slack_channel: value || null }),
      });

      if (res.ok) {
        setMessage("Slack channel saved.");
        setEditing(false);
        setTimeout(() => {
          setMessage(null);
          router.refresh();
        }, 2000);
      } else {
        const text = await res.text();
        setMessage(`Failed to save: ${text}`);
      }
    } catch (error) {
      setMessage("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (readOnly) {
    // Client view - show link or "No links available"
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 font-semibold text-neutral-900">Communication Channel</div>
        {slackChannel ? (
          <>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM13.043 15.165a2.528 2.528 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.522 2.52v2.522h-2.522a2.528 2.528 0 0 1-2.521-2.522v-2.52zM21.043 15.165a2.528 2.528 0 0 1 2.521-2.52A2.528 2.528 0 0 1 26.085 15.165a2.528 2.528 0 0 1-2.521 2.523h-2.521a2.528 2.528 0 0 1-.521-4.962V8.834a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.522 2.521v6.331z" />
              </svg>
              <a
                href={slackChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 hover:underline font-medium"
              >
                Join Slack Channel
              </a>
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              All project communication and updates will take place in this Slack channel.
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-500">No links available.</p>
        )}
      </section>
    );
  }

  // Admin view - can edit
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold text-neutral-900">Slack Channel</div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            {slackChannel ? "Edit" : "Add Channel"}
          </button>
        )}
      </div>
      {message && (
        <div className={`mb-3 rounded-md px-3 py-2 text-sm ${message.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {message}
        </div>
      )}
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Slack Channel URL</label>
            <input
              type="url"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://yourworkspace.slack.com/archives/C1234567890"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(slackChannel || "");
                setMessage(null);
              }}
              className="rounded-md border px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {slackChannel ? (
            <a
              href={slackChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 hover:underline"
            >
              {slackChannel}
            </a>
          ) : (
            <p className="text-sm text-neutral-500">No Slack channel added yet.</p>
          )}
        </div>
      )}
    </section>
  );
}

