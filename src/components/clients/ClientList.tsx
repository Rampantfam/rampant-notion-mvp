"use client";

import { useMemo, useState } from "react";
import ClientRow, { ClientListItem } from "@/components/admin/clients/ClientRow";

export default function ClientList({ clients }: { clients: ClientListItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return clients;
    const term = search.toLowerCase();
    return clients.filter((client) =>
      [client.name, client.email].some((value) => value?.toLowerCase().includes(term))
    );
  }, [clients, search]);

  return (
    <>
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-[auto,1.5fr,1.5fr,1fr,1fr,1fr] gap-3 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        <div>Logo</div>
        <div>Client Name</div>
        <div>Contact Email</div>
        <div>Active Projects</div>
        <div>Unpaid Invoices</div>
        <div>Last Activity</div>
      </div>
      <div>
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
            No clients match your search.
          </div>
        ) : (
          filtered.map((client) => <ClientRow key={client.id} client={client} />)
        )}
      </div>
    </>
  );
}
