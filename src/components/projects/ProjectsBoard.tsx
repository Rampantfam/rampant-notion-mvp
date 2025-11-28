"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

type Project = {
  id: string;
  name: string;
  client: string;
  status: "REQUEST_RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "CONFIRMED" | "POST_PRODUCTION" | "FINAL_REVIEW" | "CANCELLED";
  dateLabel?: string;
  badge?: string;
};

type ProjectsBoardProps = {
  projects: Project[];
};

type ColumnPrefs = {
  [status: string]: {
    collapsed: boolean;
    sortedByName: boolean;
  };
};

// Map column titles to form status values for query params
const COLUMN_STATUS_MAP: Record<string, string> = {
  "Request Received": "Request Received",
  "In Progress": "In Production",
  "Completed": "Completed",
};

type ColumnProps = {
  title: string;
  status: string;
  items: Project[];
  addLabel: string;
  onSelect: (project: Project) => void;
  collapsed: boolean;
  sortedByName: boolean;
  onToggleCollapse: () => void;
  onToggleSort: () => void;
};

function Column({ title, status, items, addLabel, onSelect, collapsed, sortedByName, onToggleCollapse, onToggleSort }: ColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Get status value for query param
  const statusParam = COLUMN_STATUS_MAP[title] || "Request Received";

  // Sort items if needed
  const displayItems = useMemo(() => {
    if (sortedByName) {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }
    return items;
  }, [items, sortedByName]);

  return (
    <div className="flex w-full flex-col rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-neutral-900">{title}</span>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Column menu"
          >
            •••
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-48 rounded-md border border-neutral-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => {
                  onToggleSort();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Sort projects by name (A–Z)
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleCollapse();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {collapsed ? "Expand column" : "Collapse column"}
              </button>
            </div>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {displayItems.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full cursor-pointer rounded-xl border border-neutral-200 bg-white p-3 text-left transition hover:shadow"
              onClick={() => onSelect(p)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium text-neutral-900">{p.name}</div>
                {p.badge && (
                  <span
                    className={clsx(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      p.badge === "New" && "bg-amber-50 text-amber-700",
                      p.badge === "Active" && "bg-blue-50 text-blue-700",
                      p.badge === "Paid" && "bg-green-50 text-green-700",
                      p.badge === "Review" && "bg-purple-50 text-purple-700",
                      p.badge === "Cancelled" && "bg-red-50 text-red-700"
                    )}
                  >
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-neutral-500">{p.client}</div>
              {p.dateLabel && <div className="mt-1 text-xs text-neutral-400">{p.dateLabel}</div>}
            </button>
          ))}
          <Link
            href={`/admin/projects/new?status=${encodeURIComponent(statusParam)}`}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100"
          >
            + {addLabel}
          </Link>
        </div>
      )}
      {collapsed && <p className="text-xs text-neutral-400 italic">(collapsed)</p>}
    </div>
  );
}

export default function ProjectsBoard({ projects }: ProjectsBoardProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"BOARD" | "LIST">("BOARD");
  const [columnPrefs, setColumnPrefs] = useState<ColumnPrefs>({});

  const byStatus = useMemo(
    () => ({
      REQUEST_RECEIVED: projects.filter((p) => p.status === "REQUEST_RECEIVED"),
      IN_PROGRESS: projects.filter((p) => p.status === "IN_PROGRESS"),
      COMPLETED: projects.filter((p) => p.status === "COMPLETED"),
      CANCELLED: projects.filter((p) => p.status === "CANCELLED"),
    }),
    [projects]
  );

  const handleSelect = (project: Project) => {
    router.push(`/admin/projects/${project.id}`);
  };

  const getColumnPrefs = (status: string) => {
    return columnPrefs[status] || { collapsed: false, sortedByName: false };
  };

  const toggleCollapse = (status: string) => {
    setColumnPrefs((prev) => ({
      ...prev,
      [status]: {
        ...getColumnPrefs(status),
        collapsed: !getColumnPrefs(status).collapsed,
      },
    }));
  };

  const toggleSort = (status: string) => {
    setColumnPrefs((prev) => ({
      ...prev,
      [status]: {
        ...getColumnPrefs(status),
        sortedByName: !getColumnPrefs(status).sortedByName,
      },
    }));
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={viewMode === "BOARD"}
            onClick={() => setViewMode("BOARD")}
            className={clsx(
              "rounded-md border px-3 py-1 text-sm",
              viewMode === "BOARD" ? "border-neutral-900 text-neutral-900" : "border-neutral-300 text-neutral-500"
            )}
          >
            Board
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "LIST"}
            onClick={() => setViewMode("LIST")}
            className={clsx(
              "rounded-md border px-3 py-1 text-sm",
              viewMode === "LIST" ? "border-neutral-900 text-neutral-900" : "border-neutral-300 text-neutral-500"
            )}
          >
            List
          </button>
        </div>
        <Link
          href="/admin/projects/new"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
        >
          + New Project
        </Link>
      </div>

      {viewMode === "BOARD" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Column
            title="Request Received"
            status="REQUEST_RECEIVED"
            items={byStatus.REQUEST_RECEIVED}
            addLabel="Add Project"
            onSelect={handleSelect}
            collapsed={getColumnPrefs("REQUEST_RECEIVED").collapsed}
            sortedByName={getColumnPrefs("REQUEST_RECEIVED").sortedByName}
            onToggleCollapse={() => toggleCollapse("REQUEST_RECEIVED")}
            onToggleSort={() => toggleSort("REQUEST_RECEIVED")}
          />
          <Column
            title="In Progress"
            status="IN_PROGRESS"
            items={byStatus.IN_PROGRESS}
            addLabel="Add Project"
            onSelect={handleSelect}
            collapsed={getColumnPrefs("IN_PROGRESS").collapsed}
            sortedByName={getColumnPrefs("IN_PROGRESS").sortedByName}
            onToggleCollapse={() => toggleCollapse("IN_PROGRESS")}
            onToggleSort={() => toggleSort("IN_PROGRESS")}
          />
          <Column
            title="Completed"
            status="COMPLETED"
            items={byStatus.COMPLETED}
            addLabel="Add Project"
            onSelect={handleSelect}
            collapsed={getColumnPrefs("COMPLETED").collapsed}
            sortedByName={getColumnPrefs("COMPLETED").sortedByName}
            onToggleCollapse={() => toggleCollapse("COMPLETED")}
            onToggleSort={() => toggleSort("COMPLETED")}
          />
          <Column
            title="Cancelled"
            status="CANCELLED"
            items={byStatus.CANCELLED}
            addLabel="Add Project"
            onSelect={handleSelect}
            collapsed={getColumnPrefs("CANCELLED").collapsed}
            sortedByName={getColumnPrefs("CANCELLED").sortedByName}
            onToggleCollapse={() => toggleCollapse("CANCELLED")}
            onToggleSort={() => toggleSort("CANCELLED")}
          />
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="grid grid-cols-4 gap-4 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700">
            <div>Project</div>
            <div>Client</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="grid grid-cols-4 gap-4 border-t border-neutral-200 px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <div className="font-medium text-neutral-900">{p.name}</div>
              <div className="text-neutral-600">{p.client}</div>
              <div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  p.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                  p.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                  p.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {p.status === "REQUEST_RECEIVED" && "Request Received"}
                  {p.status === "IN_PROGRESS" && "In Progress"}
                  {p.status === "COMPLETED" && "Completed"}
                  {p.status === "CANCELLED" && "Cancelled"}
                </span>
              </div>
              <div className="text-neutral-500">{p.dateLabel ?? "—"}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
