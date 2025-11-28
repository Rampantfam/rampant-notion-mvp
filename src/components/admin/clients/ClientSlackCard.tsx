"use client";

export default function ClientSlackCard({ slackUrl }: { slackUrl?: string | null }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-black mb-2">Slack Communication</h2>
      <p className="text-sm text-gray-600 mb-4">
        This Slack link will be used for client communication regarding revisions, updates, and project coordination.
      </p>
      {slackUrl ? (
        <div className="flex items-center gap-2">
          <a
            href={slackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 hover:underline text-sm font-medium"
          >
            {slackUrl.replace(/^https?:\/\//, "")}
          </a>
          <span className="text-xs text-gray-400">(opens in new tab)</span>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">No Slack link configured. Edit the client to add one.</p>
      )}
    </div>
  );
}


