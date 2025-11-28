import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/authServer";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createNotification(
  supabase: any,
  projectId: string,
  notificationType: string,
  message: string
) {
  await supabase.from("project_notifications").insert({
    project_id: projectId,
    notification_type: notificationType,
    message,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const projectId = resolvedParams.id;

  try {
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const userContext = await getUserContext();
    if (!userContext.user || userContext.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json();

    const { action, proposed_budget } = body;

    if (!action || !["APPROVE", "REJECT", "COUNTER_PROPOSE", "ACCEPT_COUNTER"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get current project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, requested_budget, budget_status, proposed_budget, status")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let updatePayload: Record<string, any> = {};
    let notificationType = "";
    let notificationMessage = "";

    if (action === "APPROVE") {
      updatePayload.budget_status = "APPROVED";
      updatePayload.status = "CONFIRMED"; // Move project to confirmed status
      notificationType = "BUDGET_APPROVED";
      notificationMessage = `Your budget request of $${project.requested_budget?.toLocaleString()} has been approved. The project is now confirmed.`;
    } else if (action === "REJECT") {
      updatePayload.budget_status = "REJECTED";
      notificationType = "BUDGET_REJECTED";
      notificationMessage = `Your budget request of $${project.requested_budget?.toLocaleString()} has been rejected. Please contact us to discuss.`;
    } else if (action === "COUNTER_PROPOSE") {
      if (!proposed_budget || parseFloat(proposed_budget) <= 0) {
        return NextResponse.json({ error: "Valid proposed budget required" }, { status: 400 });
      }
      updatePayload.budget_status = "COUNTER_PROPOSED";
      updatePayload.proposed_budget = parseFloat(proposed_budget);
      notificationType = "BUDGET_COUNTER_PROPOSED";
      notificationMessage = `We've sent you a counter proposal of $${parseFloat(proposed_budget).toLocaleString()} for this project. Please review and accept or contact us to discuss.`;
    } else if (action === "ACCEPT_COUNTER") {
      // Client accepting counter proposal
      if (project.budget_status !== "COUNTER_PROPOSED" || !project.proposed_budget) {
        return NextResponse.json({ error: "No counter proposal to accept" }, { status: 400 });
      }
      updatePayload.budget_status = "APPROVED";
      updatePayload.requested_budget = project.proposed_budget; // Update to accepted budget
      updatePayload.status = "CONFIRMED";
      notificationType = "BUDGET_COUNTER_ACCEPTED";
      notificationMessage = `The counter proposal has been accepted. The project is now confirmed with a budget of $${project.proposed_budget.toLocaleString()}.`;
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId)
      .select()
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Create notification
    if (notificationType) {
      await createNotification(supabaseAdmin, projectId, notificationType, notificationMessage);
    }

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}

