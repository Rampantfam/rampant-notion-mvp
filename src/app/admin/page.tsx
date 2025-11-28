import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/authServer";
import { AppShell } from "@/components/shell/AppShell";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { formatCurrency, formatDate, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

async function fetchDashboardData() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch all projects
  const { data: allProjects, error: projectsError } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      status,
      created_at,
      event_date,
      client_id,
      clients:client_id (
        id,
        name
      )
    `);

  // Fetch all invoices
  const { data: allInvoices, error: invoicesError } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      amount,
      status,
      issue_date,
      created_at,
      updated_at,
      client_id,
      clients:client_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (projectsError) console.error("Error fetching projects:", projectsError);
  if (invoicesError) console.error("Error fetching invoices:", invoicesError);

  const projects = allProjects || [];
  const invoices = allInvoices || [];

  // Calculate stats
  const currentlyManaged = projects.length;
  
  // Count projects that are currently in progress (regardless of creation date)
  const inProgressThisMonth = projects.filter((p: any) => {
    return ["IN_PRODUCTION", "CONFIRMED", "POST_PRODUCTION", "FINAL_REVIEW"].includes(p.status);
  }).length;

  const pendingPayment = invoices.filter((inv: any) => inv.status === "UNPAID" || inv.status === "PAST_DUE").length;

  // Get recent projects (last 5, ordered by created_at)
  const recentProjectsData = projects
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((p: any) => ({
      project: p.title,
      client: p.clients?.name || "Unknown Client",
      status: p.status === "COMPLETED" 
        ? "Completed" 
        : ["IN_PRODUCTION", "CONFIRMED", "POST_PRODUCTION", "FINAL_REVIEW"].includes(p.status)
        ? "In Progress"
        : "Request Received",
      date: formatDate(p.event_date || p.created_at),
    }));

  // Get recent payments (last 5 invoices, ordered by created_at)
  const recentPaymentsData = invoices
    .slice(0, 5)
    .map((inv: any) => ({
      client: inv.clients?.name || "Unknown Client",
      amount: formatCurrency(Number(inv.amount) || 0),
      date: formatDate(inv.issue_date || inv.created_at),
      status: inv.status === "PAID" ? "Paid" : inv.status === "PAST_DUE" ? "Past Due" : "Unpaid",
    }));

  // Generate recent activity from projects and invoices
  const activities: Array<{ text: string; time: string; timestamp: Date }> = [];
  
  // Add recent project creations
  projects.forEach((p: any) => {
    activities.push({
      text: `New project created for ${p.clients?.name || "Unknown Client"}`,
      time: timeAgo(new Date(p.created_at)),
      timestamp: new Date(p.created_at),
    });
  });

  // Add recent invoice status changes (paid invoices)
  invoices
    .filter((inv: any) => inv.status === "PAID")
    .forEach((inv: any) => {
      activities.push({
        text: `Invoice ${inv.invoice_number || `#${inv.id.substring(0, 8)}`} marked paid`,
        time: timeAgo(new Date(inv.updated_at || inv.created_at)),
        timestamp: new Date(inv.updated_at || inv.created_at),
      });
    });

  // Sort activities by timestamp (most recent first) and take top 5
  const recentActivity = activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5)
    .map(({ text, time }) => ({ text, time }));

  return {
    stats: [
      { label: "Currently managed", value: currentlyManaged },
      { label: "Projects in progress", value: inProgressThisMonth },
      { label: "Pending payment", value: pendingPayment },
    ],
    recentProjects: recentProjectsData,
    recentPayments: recentPaymentsData,
    activity: recentActivity,
  };
}

export default async function AdminPage() {
  const { user, role } = await getUserContext();

  if (!user) {
    redirect("/");
  }
  if (role !== "ADMIN") {
    redirect("/");
  }

  const { stats, recentProjects, recentPayments, activity } = await fetchDashboardData();

  return (
    <AppShell role="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here’s what’s happening with your business.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-4">
              <div className="text-3xl font-semibold">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-white">
            <div className="border-b p-4 font-medium">Recent Projects</div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Project</th>
                    <th className="py-2">Client</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((r) => (
                    <tr key={r.project} className="border-t">
                      <td className="py-2">{r.project}</td>
                      <td className="py-2">{r.client}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            r.status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : r.status === "In Progress"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b p-4 font-medium">Recent Payments</div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Client</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p, i) => (
                    <tr key={`${p.client}-${i}`} className="border-t">
                      <td className="py-2">{p.client}</td>
                      <td className="py-2">{p.amount}</td>
                      <td className="py-2">{p.date}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            p.status === "Paid"
                              ? "bg-green-100 text-green-700"
                              : p.status === "Past Due"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="border-b p-4 font-medium">Recent Activity</div>
          <div className="p-4">
            <ul className="space-y-2 text-sm">
              {activity.map((a, i) => (
                <li key={`${a.text}-${i}`} className="flex items-center justify-between">
                  <span>{a.text}</span>
                  <span className="text-gray-400">{a.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
