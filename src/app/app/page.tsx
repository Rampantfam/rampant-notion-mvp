import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserContext } from "@/lib/authServer";
import { AppShell } from "@/components/shell/AppShell";
import { getClientDashboardSummary } from "@/lib/dashboard";
import { formatCurrency, formatDate, timeAgo } from "@/lib/format";
import clsx from "clsx";

export const dynamic = "force-dynamic";

function getStatusDisplay(status: string): { label: string; color: string } {
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
    case "CANCELLED":
      return { label: "Cancelled", color: "bg-red-100 text-red-700" };
    default:
      return { label: "Requested", color: "bg-gray-100 text-gray-700" };
  }
}

function getInvoiceStatusDisplay(status: string): { label: string; color: string } {
  switch (status) {
    case "PAID":
      return { label: "Paid", color: "bg-green-100 text-green-700" };
    case "UNPAID":
      return { label: "Unpaid", color: "bg-orange-100 text-orange-700" };
    case "OVERDUE":
      return { label: "Past Due", color: "bg-red-100 text-red-700" };
    default:
      return { label: status, color: "bg-gray-100 text-gray-700" };
  }
}

export default async function ClientPage() {
  const { user, role, clientId } = await getUserContext();

  if (!user) {
    redirect("/");
  }
  if (role !== "CLIENT") {
    redirect("/");
  }

  if (!clientId) {
    return (
      <AppShell role="CLIENT">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Client Overview</h1>
            <p className="text-sm text-gray-500">Track your projects, invoices, and content budget at a glance.</p>
          </div>
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Your account is not linked to a client organization. Please contact support.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const summary = await getClientDashboardSummary(clientId);

  return (
    <AppShell role="CLIENT">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">Client Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Track your projects, invoices, and content budget at a glance.</p>
        </div>

        {/* Summary Cards - Row 1 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <div className="text-3xl font-semibold text-neutral-900">{summary.activeProjectsCount}</div>
            <div className="mt-1 text-sm text-neutral-500">Active Projects</div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <div className="text-3xl font-semibold text-neutral-900">{summary.projectRequestsCount}</div>
            <div className="mt-1 text-sm text-neutral-500">Project Requests</div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <div className="text-3xl font-semibold text-neutral-900">{summary.completedProjectsCount}</div>
            <div className="mt-1 text-sm text-neutral-500">Completed Projects</div>
          </div>
        </div>

        {/* Summary Cards - Row 2 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
            <div className="text-3xl font-semibold text-neutral-900">{summary.pendingDeliverablesCount}</div>
            <div className="mt-1 text-sm text-neutral-500">Pending Deliverables</div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-center">
              <div className="text-3xl font-semibold text-neutral-900">{summary.invoicesDueCount}</div>
              <div className="mt-1 text-sm text-neutral-500">Invoices Due</div>
            </div>
            {summary.invoicesDueTotal > 0 && (
              <div className="mt-2 text-center text-sm font-medium text-neutral-700">
                {formatCurrency(summary.invoicesDueTotal)} total due
              </div>
            )}
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-center">
              <div className="text-3xl font-semibold text-neutral-900">
                {summary.remainingBudget !== null ? formatCurrency(summary.remainingBudget) : "Not set"}
              </div>
              <div className="mt-1 text-sm text-neutral-500">Remaining Budget</div>
            </div>
            {summary.annualBudget !== null && (
              <div className="mt-2 text-center text-xs text-neutral-500">
                Annual Budget: {formatCurrency(summary.annualBudget)} • Spent: {formatCurrency(summary.spentSoFar)}
              </div>
            )}
          </div>
        </div>

        {/* Projects Snapshot and Billing Snapshot */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Projects Snapshot */}
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-neutral-900">Projects Snapshot</h2>
                <Link
                  href="/app/projects"
                  className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {summary.recentProjects.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">No projects yet.</p>
              ) : (
                summary.recentProjects.map((project) => {
                  const statusDisplay = getStatusDisplay(project.status);
                  return (
                    <div key={project.id} className="rounded-lg border border-neutral-200 px-4 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900 truncate">{project.title}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {project.eventDate ? formatDate(project.eventDate) : "No date set"}
                          </div>
                        </div>
                        <span className={clsx("ml-3 rounded-full px-2 py-0.5 text-xs font-medium", statusDisplay.color)}>
                          {statusDisplay.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Billing Snapshot */}
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-neutral-900">Billing Snapshot</h2>
                <Link
                  href="/app/invoices"
                  className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {summary.recentInvoices.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">No invoices yet.</p>
              ) : (
                summary.recentInvoices.map((invoice) => {
                  const statusDisplay = getInvoiceStatusDisplay(invoice.status);
                  return (
                    <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-900">{invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`}</div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : "No due date"}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="font-medium text-neutral-900">{formatCurrency(invoice.amount)}</div>
                        <span className={clsx("text-xs font-medium", statusDisplay.color)}>
                          {statusDisplay.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-4">
            <h2 className="font-medium text-neutral-900">Recent Activity</h2>
          </div>
          <div className="p-4">
            {summary.recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">
                No recent updates yet. New project activity will show up here.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {summary.recentActivity.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3"
                  >
                    <span className="text-neutral-700">{activity.message}</span>
                    <span className="text-xs text-neutral-400 ml-4 whitespace-nowrap">{timeAgo(activity.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
