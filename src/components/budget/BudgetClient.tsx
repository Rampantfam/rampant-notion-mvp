"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type Invoice = {
  id: string;
  invoice_id: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
};

type Project = {
  id: string;
  title: string;
  status: string;
  event_date: string | null;
  service_type: string | null;
  notes?: string | null;
};

type PlannedProject = {
  id: string;
  name: string;
  targetDate: string;
  serviceType: string;
  estimatedCost: number;
  impactLabel: string;
};

type BudgetClientProps = {
  invoices: Invoice[];
  projects: Project[];
  initialBudget?: number | null;
  clientId: string;
};

export default function BudgetClient({ invoices, projects, initialBudget, clientId }: BudgetClientProps) {
  const router = useRouter();
  const [annualBudget, setAnnualBudget] = useState(initialBudget || 100000);
  const [savingBudget, setSavingBudget] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(annualBudget.toString());
  const [plannedProjects, setPlannedProjects] = useState<PlannedProject[]>([]);
  const [activeTab, setActiveTab] = useState<"planned" | "completed">("planned");
  const [calculatorCost, setCalculatorCost] = useState("");
  const [calculatorProjectName, setCalculatorProjectName] = useState("");
  const [calculatorServiceType, setCalculatorServiceType] = useState("Video");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectCost, setEditProjectCost] = useState("");
  const [editProjectServiceType, setEditProjectServiceType] = useState("Video");
  const [editProjectTargetDate, setEditProjectTargetDate] = useState("");
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Update budget input when annualBudget changes
  useEffect(() => {
    setBudgetInput(annualBudget.toString());
  }, [annualBudget]);

  // Calculate spent so far (sum of PAID invoices)
  const spentSoFar = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices]);

  const remainingBudget = annualBudget - spentSoFar;
  const plannedProjectTotal = plannedProjects.reduce((sum, p) => sum + p.estimatedCost, 0);
  const projectedRemaining = remainingBudget - plannedProjectTotal;

  // Calculate new remaining if calculator cost is applied
  const calculatorNewRemaining = useMemo(() => {
    const cost = parseFloat(calculatorCost.replace(/,/g, "")) || 0;
    return remainingBudget - cost;
  }, [calculatorCost, remainingBudget]);

  const calculatorImpactLabel = useMemo(() => {
    if (!calculatorCost) return "";
    if (calculatorNewRemaining >= 0) {
      return "Within Budget";
    } else {
      return `Over Budget by ${formatCurrency(Math.abs(calculatorNewRemaining))}`;
    }
  }, [calculatorNewRemaining, calculatorCost]);

  // Filter projects - exclude CANCELLED projects from budget calculations
  const plannedProjectsFromDB = useMemo(() => {
    return projects.filter((p) => {
      // Exclude completed projects
      if (p.status === "COMPLETED") return false;
      // Exclude cancelled projects (check status or notes)
      if (p.status === "CANCELLED") return false;
      if (p.notes && p.notes.includes("[CANCELLED")) return false;
      return true;
    });
  }, [projects]);

  const completedProjects = useMemo(() => {
    return projects.filter((p) => {
      // Only include completed projects
      if (p.status !== "COMPLETED") return false;
      // Exclude cancelled projects (check notes as fallback)
      if (p.notes && p.notes.includes("[CANCELLED")) return false;
      return true;
    });
  }, [projects]);

  // Combine local planned projects with DB projects
  const allPlannedProjects = useMemo(() => {
    const dbProjects: PlannedProject[] = plannedProjectsFromDB.map((p) => ({
      id: p.id,
      name: p.title,
      targetDate: p.event_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      serviceType: p.service_type || "General",
      estimatedCost: 0, // Projects don't have estimated cost in DB
      impactLabel: "—",
    }));
    return [...plannedProjects, ...dbProjects];
  }, [plannedProjects, plannedProjectsFromDB]);

  // Calculate spend breakdown by month
  const spendByMonth = useMemo(() => {
    const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
    const monthMap = new Map<string, { monthName: string; total: number; sortKey: string }>();

    paidInvoices.forEach((inv) => {
      // Use created_at for grouping (when invoice was paid/created)
      const date = new Date(inv.created_at || inv.due_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const sortKey = `${year}-${String(month).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      
      if (!monthMap.has(sortKey)) {
        monthMap.set(sortKey, { monthName, total: 0, sortKey });
      }
      const entry = monthMap.get(sortKey)!;
      entry.total += inv.amount;
    });

    // Sort by date (most recent first)
    return Array.from(monthMap.values())
      .sort((a, b) => {
        // Compare sort keys (YYYY-MM format)
        return b.sortKey.localeCompare(a.sortKey);
      })
      .map(({ monthName, total }) => ({ month: monthName, total }));
  }, [invoices]);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  async function handleSaveBudget() {
    const value = parseFloat(budgetInput.replace(/,/g, ""));
    if (isNaN(value) || value < 0) {
      return;
    }

    setSavingBudget(true);
    try {
      const res = await fetch("/api/clients/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          annual_budget: value,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setAnnualBudget(value);
        setIsEditingBudget(false);
        // Refresh the page to ensure we have the latest data
        router.refresh();
      } else {
        let result: any;
        try {
          result = await res.json();
        } catch {
          const text = await res.text();
          result = { error: text };
        }
        
        const errorMessage = result.error || result.message || "Failed to save budget";
        console.error("Budget save error:", result);
        
        if (result.needsMigration) {
          alert(`Cannot save budget: ${errorMessage}\n\nPlease run the migration file in your Supabase dashboard:\nsupabase/migrations/20241205000000_add_annual_budget_to_clients.sql`);
        } else {
          alert(`Failed to save budget: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("Error saving budget:", error);
      alert("Failed to save budget. Please try again.");
    } finally {
      setSavingBudget(false);
    }
  }

  function handleAddPlannedProject() {
    const cost = parseFloat(calculatorCost.replace(/,/g, "")) || 0;
    const name = calculatorProjectName.trim();
    
    if (cost <= 0 || !name) return;

    const newProject: PlannedProject = {
      id: `planned-${Date.now()}`,
      name: name,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      serviceType: calculatorServiceType,
      estimatedCost: cost,
      impactLabel: calculatorNewRemaining >= 0 ? "Within Budget" : `Over by ${formatCurrency(Math.abs(calculatorNewRemaining))}`,
    };

    setPlannedProjects([...plannedProjects, newProject]);
    setCalculatorCost("");
    setCalculatorProjectName("");
    setCalculatorServiceType("Video");
  }

  function handleDeletePlannedProject(id: string) {
    setPlannedProjects(plannedProjects.filter((p) => p.id !== id));
  }

  function handleEditPlannedProject(project: PlannedProject) {
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setEditProjectCost(project.estimatedCost.toLocaleString());
    setEditProjectServiceType(project.serviceType);
    setEditProjectTargetDate(project.targetDate);
  }

  function handleSaveEdit() {
    if (!editingProjectId) return;

    const cost = parseFloat(editProjectCost.replace(/,/g, "")) || 0;
    const name = editProjectName.trim();

    if (cost <= 0 || !name) {
      alert("Please enter a valid project name and cost.");
      return;
    }

    const updatedProjects = plannedProjects.map((p) => {
      if (p.id === editingProjectId) {
        const newRemaining = remainingBudget - cost;
        return {
          ...p,
          name: name,
          estimatedCost: cost,
          serviceType: editProjectServiceType,
          targetDate: editProjectTargetDate,
          impactLabel: newRemaining >= 0 ? "Within Budget" : `Over by ${formatCurrency(Math.abs(newRemaining))}`,
        };
      }
      return p;
    });

    setPlannedProjects(updatedProjects);
    setEditingProjectId(null);
    setEditProjectName("");
    setEditProjectCost("");
    setEditProjectServiceType("Video");
    setEditProjectTargetDate("");
  }

  function handleCancelEdit() {
    setEditingProjectId(null);
    setEditProjectName("");
    setEditProjectCost("");
    setEditProjectServiceType("Video");
    setEditProjectTargetDate("");
  }

  function handleRequestProject() {
    router.push("/app/projects/new");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Budget Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">Track how your annual content budget is being used.</p>
        </div>
        <button
          type="button"
          onClick={handleRequestProject}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition"
        >
          + Request New Project
        </button>
      </div>

      {/* Annual Budget Summary */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Annual Budget Summary</h2>
          {!isEditingBudget ? (
            <button
              type="button"
              onClick={() => setIsEditingBudget(true)}
              className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
            >
              Edit Budget
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-32 rounded-md border px-2 py-1 text-sm"
                placeholder="100000"
              />
              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={savingBudget}
                className="rounded-md bg-orange-500 px-3 py-1 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {savingBudget ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingBudget(false);
                  setBudgetInput(annualBudget.toString());
                }}
                className="rounded-md border px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-neutral-600">Annual Budget</dt>
            <dd className="text-sm font-medium text-neutral-900">{formatCurrency(annualBudget)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-neutral-600">Spent So Far (Paid Invoices)</dt>
            <dd className="text-sm font-medium text-neutral-900">{formatCurrency(spentSoFar)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-neutral-600">Remaining Budget</dt>
            <dd className="text-sm font-medium text-neutral-900">{formatCurrency(remainingBudget)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-neutral-600">Planned Project Total</dt>
            <dd className="text-sm font-medium text-neutral-900">{formatCurrency(plannedProjectTotal)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3">
            <dt className="text-sm font-medium text-neutral-900">Projected Remaining (after planned projects)</dt>
            <dd className={clsx("text-sm font-medium", projectedRemaining >= 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(projectedRemaining)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Quick Budget Calculator */}
      <section ref={calculatorRef} className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Quick Budget Calculator</h2>
          <p className="text-sm text-neutral-500 mt-1">Roughly estimate how a potential project would impact your remaining budget.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Project Name</label>
            <input
              type="text"
              value={calculatorProjectName}
              onChange={(e) => setCalculatorProjectName(e.target.value)}
              placeholder="Enter project name"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Service Type</label>
            <select
              value={calculatorServiceType}
              onChange={(e) => setCalculatorServiceType(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Photography">Photography</option>
              <option value="Videography">Videography</option>
              <option value="Photography & Videography">Photography & Videography</option>
              <option value="Design">Design</option>
              <option value="Video">Video</option>
              <option value="Photo">Photo</option>
              <option value="Document">Document</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Estimated Project Cost</label>
            <input
              type="text"
              value={calculatorCost}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9,]/g, "");
                setCalculatorCost(value);
              }}
              placeholder="7,500"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {calculatorCost && (
            <div className="space-y-2 rounded-md bg-neutral-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Current Remaining Budget:</span>
                <span className="font-medium text-neutral-900">{formatCurrency(remainingBudget)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">If Approved, New Remaining:</span>
                <span className={clsx("font-medium", calculatorNewRemaining >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(calculatorNewRemaining)}
                </span>
              </div>
              {calculatorImpactLabel && (
                <div className="mt-2">
                  <span
                    className={clsx(
                      "inline-block rounded-full px-3 py-1 text-xs font-medium",
                      calculatorNewRemaining >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}
                  >
                    {calculatorImpactLabel}
                  </span>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleAddPlannedProject}
            disabled={!calculatorCost || !calculatorProjectName.trim() || parseFloat(calculatorCost.replace(/,/g, "")) <= 0}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Add as Planned Project
          </button>
        </div>
      </section>

      {/* Projects Section */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Projects</h2>
          <p className="text-sm text-neutral-500 mt-1">View and manage your planned and completed projects.</p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab("planned")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition",
              activeTab === "planned"
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            Planned Projects
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition",
              activeTab === "completed"
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            Completed Projects
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">Project Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">Target Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">Service Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">Estimated Cost</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">Impact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {activeTab === "planned" ? (
                allPlannedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                      No planned projects yet.
                    </td>
                  </tr>
                ) : (
                  allPlannedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-neutral-50">
                      {editingProjectId === project.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editProjectName}
                              onChange={(e) => setEditProjectName(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="Project name"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={editProjectTargetDate}
                              onChange={(e) => setEditProjectTargetDate(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editProjectServiceType}
                              onChange={(e) => setEditProjectServiceType(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="Photography">Photography</option>
                              <option value="Videography">Videography</option>
                              <option value="Photography & Videography">Photography & Videography</option>
                              <option value="Design">Design</option>
                              <option value="Video">Video</option>
                              <option value="Photo">Photo</option>
                              <option value="Document">Document</option>
                              <option value="Other">Other</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editProjectCost}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9,]/g, "");
                                setEditProjectCost(value);
                              }}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                "inline-block rounded-full px-2.5 py-1 text-xs font-medium",
                                (remainingBudget - (parseFloat(editProjectCost.replace(/,/g, "")) || 0)) < 0
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              )}
                            >
                              {(remainingBudget - (parseFloat(editProjectCost.replace(/,/g, "")) || 0)) >= 0
                                ? "Within Budget"
                                : `Over by ${formatCurrency(Math.abs(remainingBudget - (parseFloat(editProjectCost.replace(/,/g, "")) || 0)))}`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-700"
                                title="Save"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="text-neutral-400 hover:text-neutral-600"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900">{project.name}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">{formatDate(project.targetDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">{project.serviceType}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900">
                            {project.estimatedCost > 0 ? formatCurrency(project.estimatedCost) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={clsx(
                                "inline-block rounded-full px-2.5 py-1 text-xs font-medium",
                                project.impactLabel.includes("Over")
                                  ? "bg-red-100 text-red-700"
                                  : project.impactLabel === "Within Budget"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {project.impactLabel}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditPlannedProject(project)}
                                className="text-neutral-400 hover:text-neutral-600"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePlannedProject(project.id)}
                                className="text-neutral-400 hover:text-red-600"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )
              ) : completedProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                    No completed projects yet.
                  </td>
                </tr>
              ) : (
                completedProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900">{project.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                      {project.event_date ? formatDate(project.event_date) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">{project.service_type || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-900">—</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-block rounded-full px-2.5 py-1 text-xs font-medium bg-neutral-100 text-neutral-600">
                        —
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement edit functionality
                          }}
                          className="text-neutral-400 hover:text-neutral-600"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement delete functionality
                          }}
                          className="text-neutral-400 hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {activeTab === "planned" && allPlannedProjects.length > 0 && (
          <div className="mt-4 flex justify-end border-t pt-4">
            <div className="text-sm font-medium text-neutral-900">
              Total Planned: {formatCurrency(plannedProjectTotal)}
            </div>
          </div>
        )}
      </section>

      {/* Spend Breakdown by Month */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Spend Breakdown by Month</h2>
          <p className="text-sm text-neutral-500 mt-1">Based on invoices that have been paid.</p>
        </div>
        {spendByMonth.length === 0 ? (
          <p className="text-sm text-neutral-500">Once invoices are paid, we&apos;ll show your spend by month here.</p>
        ) : (
          <div className="space-y-3">
            {spendByMonth.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-0">
                <span className="text-sm text-neutral-700">{item.month}</span>
                <span className="text-sm font-medium text-neutral-900">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

