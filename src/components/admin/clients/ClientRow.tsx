"use client";

import { useRouter } from "next/navigation";
import { formatCurrency, timeAgo } from "@/lib/format";
import ClientAvatar from "@/components/admin/clients/ClientAvatar";

export type ClientListItem = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  logo_url?: string | null;
  activeProjects?: number;
  unpaidTotal?: number;
  lastActivity?: string | null;
};

export default function ClientRow({ client }: { client: ClientListItem }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/admin/clients/${client.id}`)}
      className="w-full text-left transition hover:bg-orange-50/40"
    >
      <div className="grid grid-cols-[auto,1.5fr,1.5fr,1fr,1fr,1fr] items-center gap-3 px-4 py-4 text-sm">
        <ClientAvatar name={client.name} logoUrl={client.logo_url} />
        <div className="font-medium text-black">{client.name}</div>
        <div className="text-gray-600 break-words">{client.email ?? "—"}</div>
        <div>
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            {client.activeProjects ?? 0} Projects
          </span>
        </div>
        <div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            (client.unpaidTotal ?? 0) > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
          }`}>
            {formatCurrency(client.unpaidTotal ?? 0)}
          </span>
        </div>
        <div className="text-gray-500 text-xs">{timeAgo(client.lastActivity)}</div>
      </div>
    </button>
  );
}
