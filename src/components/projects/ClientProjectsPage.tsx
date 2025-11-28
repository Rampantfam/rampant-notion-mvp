"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClientProjectCard from "./ClientProjectCard";
import { formatDate } from "@/lib/format";

type ClientProject = {
  id: string;
  title: string;
  event_date: string | null;
  creative_name: string | null;
  service_type: string | null;
  status: string;
  notes?: string | null;
};

type ClientProjectsPageProps = {
  projects: ClientProject[];
};

function getStatusDisplay(status: string, notes?: string | null): { label: string; color: string } {
  // Check if project is cancelled (either by status or notes marker)
  const isCancelled = status === "CANCELLED" || (notes && notes.includes("[CANCELLED"));
  
  if (isCancelled) {
    return { label: "Cancelled", color: "bg-red-100 text-red-700" };
  }

  switch (status) {
    case "REQUEST_RECEIVED":
      return { label: "Requested", color: "bg-gray-100 text-gray-700" };
    case "CONFIRMED":
    case "IN_PRODUCTION":
    case "POST_PRODUCTION":
    case "FINAL_REVIEW":
      return { label: "In Progress", color: "bg-orange-100 text-orange-700" };
    case "COMPLETED":
      return { label: "Delivered", color: "bg-green-100 text-green-700" };
    default:
      return { label: "Requested", color: "bg-gray-100 text-gray-700" };
  }
}

export default function ClientProjectsPage({ projects }: ClientProjectsPageProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleRequestProject = () => {
    router.push("/app/projects/new");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projects.length} {projects.length === 1 ? "Project" : "Projects"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-md border border-gray-300 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition ${
                viewMode === "grid"
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-label="Grid view"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition ${
                viewMode === "list"
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-label="List view"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {/* Request New Project Button */}
          <button
            type="button"
            onClick={handleRequestProject}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition"
          >
            Request New Project
          </button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-gray-500 mb-4">No projects yet.</p>
          <p className="text-sm text-gray-400 mb-4">Click &quot;Request New Project&quot; to get started.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusDisplay = getStatusDisplay(project.status, project.notes);
            return (
              <ClientProjectCard
                key={project.id}
                id={project.id}
                title={project.title}
                eventDate={project.event_date}
                creativeName={project.creative_name}
                serviceType={project.service_type}
                status={statusDisplay}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const statusDisplay = getStatusDisplay(project.status, project.notes);
            return (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-black">{project.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusDisplay.color}`}>
                        {statusDisplay.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {project.event_date && (
                        <span>{formatDate(project.event_date)}</span>
                      )}
                      {project.creative_name && (
                        <>
                          {project.event_date && <span className="mx-2">•</span>}
                          <span>Assigned to {project.creative_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

