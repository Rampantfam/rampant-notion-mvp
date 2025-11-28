"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export type ClientProject = {
  id: string;
  name: string;
  status?: string | null;
  due_date?: string | null;
  assigned_creative?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  "in progress": "bg-orange-100 text-orange-700",
  review: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

export default function ClientProjectsCard({ projects = [], clientId }: { projects?: ClientProject[]; clientId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "completed">("active");

  const { activeProjects, completedProjects } = useMemo(() => {
    const byStatus = { active: [] as ClientProject[], completed: [] as ClientProject[] };
    projects.forEach((project) => {
      const status = (project.status ?? "").toLowerCase();
      if (status === "completed") byStatus.completed.push(project);
      else byStatus.active.push(project);
    });
    return { activeProjects: byStatus.active, completedProjects: byStatus.completed };
  }, [projects]);

  const displayed = tab === "active" ? activeProjects : completedProjects;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-black">Projects</h2>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <button
              className={`border-b-2 px-1 pb-1 font-medium ${
                tab === "active" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"
              }`}
              onClick={() => setTab("active")}
            >
              Active Projects ({activeProjects.length})
            </button>
            <button
              className={`border-b-2 px-1 pb-1 font-medium ${
                tab === "completed" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"
              }`}
              onClick={() => setTab("completed")}
            >
              Completed Projects ({completedProjects.length})
            </button>
          </div>
        </div>
        <Link
          href={`/admin/projects/new?clientId=${encodeURIComponent(clientId)}`}
          className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          + New Project
        </Link>
      </div>
      <div className="mt-4">
        {displayed.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
            No {tab === "active" ? "active" : "completed"} projects yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {displayed.map((project) => {
              const statusKey = (project.status ?? "").toLowerCase();
              const badgeClass = STATUS_COLORS[statusKey] ?? "bg-gray-100 text-gray-600";
              return (
                <li key={project.id}>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 transition hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-black">{project.name}</div>
                      <div className="text-xs text-gray-500">
                        {project.assigned_creative ? `Assigned to ${project.assigned_creative}` : "No assignee"}
                        {project.due_date ? ` • Due ${formatDate(project.due_date)}` : ""}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badgeClass}`}>
                      {project.status ?? "Scheduled"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
