"use client";

import { timeAgo } from "@/lib/format";

export type ClientActivityItem = {
  id: string;
  message: string;
  icon?: string;
  created_at?: string | Date | null;
};

const DEFAULT_ICONS = ["🟢", "🟠", "🧾", "📁", "✅"];

export default function ClientActivityCard({ activities = [] }: { activities?: ClientActivityItem[] }) {
  const items = activities.length
    ? activities
    : [
        { id: "1", message: "Invoice #204 marked paid", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { id: "2", message: "New deliverables uploaded", created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        { id: "3", message: "Project status updated to In Progress", created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      ];

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-black">Recent Activity</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((item, index) => (
          <li key={item.id ?? index} className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <span className="text-lg">{item.icon ?? DEFAULT_ICONS[index % DEFAULT_ICONS.length]}</span>
            <span className="flex-1 text-gray-700">{item.message}</span>
            <span className="text-xs text-gray-400">{timeAgo(item.created_at ?? null)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
