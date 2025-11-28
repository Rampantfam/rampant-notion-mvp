"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";

type ClientProjectCardProps = {
  id: string;
  title: string;
  eventDate: string | null;
  creativeName: string | null;
  serviceType: string | null;
  status: { label: string; color: string };
};

export default function ClientProjectCard({
  id,
  title,
  eventDate,
  creativeName,
  serviceType,
  status,
}: ClientProjectCardProps) {
  return (
    <Link
      href={`/app/projects/${id}`}
      className="block rounded-lg border border-gray-200 bg-white p-5 hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-black text-base flex-1 pr-2">{title}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="space-y-1.5 text-sm text-gray-500">
        {eventDate && (
          <div>{formatDate(eventDate)}</div>
        )}
        {creativeName && (
          <div>Assigned to: {creativeName}</div>
        )}
        {serviceType && (
          <div className="text-xs text-gray-400 mt-2">{serviceType}</div>
        )}
      </div>
    </Link>
  );
}


