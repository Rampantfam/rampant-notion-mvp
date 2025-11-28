"use client";

import { Sidebar } from "./Sidebar";
import type { ReactNode } from "react";

export function AppShell({ children, role }: { children: ReactNode; role: "ADMIN" | "CLIENT" | "TEAM" }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
