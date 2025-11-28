/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

export default function ClientAvatar({
  name,
  logoUrl,
  size = 40,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "--";

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="h-full w-full rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-orange-100 text-orange-700 text-sm font-semibold"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
