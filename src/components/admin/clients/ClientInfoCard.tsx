"use client";

import { formatDate } from "@/lib/format";

export default function ClientInfoCard({
  client,
}: {
  client: {
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    created_at?: string | null;
    website?: string | null;
  };
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-black">Company Information</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm text-gray-600">
          <InfoRow label="Contact Person" value={client.contact_person ?? "—"} />
          <InfoRow label="Email Address" value={client.email ?? "—"} />
          <InfoRow label="Phone Number" value={client.phone ?? "—"} />
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <InfoRow label="Company Address" value={client.address ?? "—"} />
          <InfoRow label="Date Joined" value={formatDate(client.created_at)} />
          <InfoRow
            label="Website"
            value={client.website ? (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                {client.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "—"
            )}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm text-black/80">{value}</div>
    </div>
  );
}
