import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/authServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const projectId = resolvedParams.id;
  try {
    const body = await req.json();

    // Get user context for authorization
    const userContext = await getUserContext();
    if (!userContext.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // If user is a CLIENT, verify they own this project
    if (userContext.role === "CLIENT") {
      if (!userContext.clientId) {
        return new NextResponse("Forbidden: Client account not properly configured", { status: 403 });
      }

      const { data: project, error: projectError } = await supabaseAdmin
        .from("projects")
        .select("client_id")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError || !project) {
        return new NextResponse("Project not found", { status: 404 });
      }

      if (project.client_id !== userContext.clientId) {
        return new NextResponse("Forbidden: You can only edit your own projects", { status: 403 });
      }

      // Clients cannot change certain fields
      if (body.client_id !== undefined && body.client_id !== project.client_id) {
        return new NextResponse("Forbidden: Clients cannot change project client", { status: 403 });
      }
      if (body.status !== undefined) {
        return new NextResponse("Forbidden: Clients cannot change project status", { status: 403 });
      }
      if (body.account_manager_names !== undefined || body.account_manager_emails !== undefined || body.account_manager_phones !== undefined) {
        return new NextResponse("Forbidden: Clients cannot change account managers", { status: 403 });
      }
    }

    // Handle deliverables: accept array or string, normalize to array
    let deliverablesValue: string[] | null = null;
    if (body.deliverables !== undefined && body.deliverables !== null) {
      if (Array.isArray(body.deliverables)) {
        deliverablesValue = body.deliverables.filter((item: any) => item && typeof item === "string" && item.trim());
      } else if (typeof body.deliverables === "string") {
        deliverablesValue = body.deliverables
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean);
      }
    }

    // Only include fields that are explicitly provided (not undefined)
    // This allows partial updates without violating not-null constraints
    const payload: Record<string, any> = {};
    
    if (body.title !== undefined) payload.title = body.title;
    if (body.event_date !== undefined) payload.event_date = body.event_date || null;
    if (body.event_time !== undefined) payload.event_time = body.event_time || null;
    if (body.location !== undefined) payload.location = body.location || null;
    if (body.service_type !== undefined) payload.service_type = body.service_type || null;
    if (body.status !== undefined) {
      payload.status = body.status;
      console.log("[PUT /api/projects/[id]] Updating status to:", body.status);
    }
    if (body.creative_name !== undefined) payload.creative_name = body.creative_name || null;
    if (body.creative_phone !== undefined) payload.creative_phone = body.creative_phone || null;
    if (body.content_links !== undefined) payload.content_links = body.content_links;
    if (body.notes !== undefined) payload.notes = body.notes || null;
    if (body.slack_channel !== undefined) payload.slack_channel = body.slack_channel || null;

    // Handle client_id if provided
    if (body.client_id !== undefined) {
      payload.client_id = body.client_id ?? null;
    } else if (body.client_name !== undefined) {
      // Fallback: if only client_name provided, try to find client_id
      payload.client_name = body.client_name ?? null;
    }

    // Handle deliverables (try text[] first, fallback to text)
    if (deliverablesValue !== null) {
      payload.deliverables = deliverablesValue;
    }

    // Handle account managers as aligned arrays
    if (body.account_manager_names !== undefined) {
      payload.account_manager_names = Array.isArray(body.account_manager_names)
        ? body.account_manager_names.filter(Boolean)
        : null;
    }
    if (body.account_manager_emails !== undefined) {
      payload.account_manager_emails = Array.isArray(body.account_manager_emails)
        ? body.account_manager_emails.filter(Boolean)
        : null;
    }
    if (body.account_manager_phones !== undefined) {
      payload.account_manager_phones = Array.isArray(body.account_manager_phones)
        ? body.account_manager_phones.filter(Boolean)
        : null;
    }

    console.log("[PUT /api/projects/[id]] Payload:", payload);
    
    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(payload)
      .eq("id", projectId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[PUT /api/projects/[id]] Supabase error:", error);
      return new NextResponse(error.message, { status: 400 });
    }

    if (!data) {
      console.error("[PUT /api/projects/[id]] Project not found:", projectId);
      return new NextResponse("Project not found", { status: 404 });
    }

    console.log("[PUT /api/projects/[id]] Updated project:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const projectId = resolvedParams.id;
  try {
    // Get user context for authorization
    const userContext = await getUserContext();
    if (!userContext.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // If user is a CLIENT, verify they own this project
    if (userContext.role === "CLIENT") {
      if (!userContext.clientId) {
        return new NextResponse("Forbidden: Client account not properly configured", { status: 403 });
      }

      const { data: project, error: projectError } = await supabaseAdmin
        .from("projects")
        .select("client_id, status")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError || !project) {
        return new NextResponse("Project not found", { status: 404 });
      }

      if (project.client_id !== userContext.clientId) {
        return new NextResponse("Forbidden: You can only delete your own projects", { status: 403 });
      }

      // Mark project as cancelled instead of deleting
      // First, get current project to preserve notes
      const { data: currentProject } = await supabaseAdmin
        .from("projects")
        .select("notes")
        .eq("id", projectId)
        .maybeSingle();

      const cancellationNote = `\n\n[CANCELLED by client on ${new Date().toISOString()}]`;
      const updatedNotes = currentProject?.notes 
        ? `${currentProject.notes}${cancellationNote}`
        : cancellationNote.trim();

      // Try different approaches based on what's available
      let updatedProject: any = null;
      let updateSuccess = false;

      // Approach 1: Try with CANCELLED status and cancelled_at/cancelled_by columns
      const { data: updatedProjectWithFields, error: updateError1 } = await supabaseAdmin
        .from("projects")
        .update({
          status: "CANCELLED",
          cancelled_at: new Date().toISOString(),
          cancelled_by: userContext.user.id,
          notes: updatedNotes,
        })
        .eq("id", projectId)
        .select()
        .maybeSingle();

      if (!updateError1 && updatedProjectWithFields) {
        updatedProject = updatedProjectWithFields;
        updateSuccess = true;
      } else if (updateError1) {
        // Approach 2: Try with CANCELLED status but without cancelled_at/cancelled_by
        if (updateError1.message?.includes("cancelled_at") || updateError1.message?.includes("cancelled_by") || updateError1.message?.includes("schema cache")) {
          console.log("[DELETE /api/projects/[id]] cancelled_at/cancelled_by columns don't exist, trying without them");
          const { data: updatedProjectSimple, error: updateError2 } = await supabaseAdmin
            .from("projects")
            .update({
              status: "CANCELLED",
              notes: updatedNotes,
            })
            .eq("id", projectId)
            .select()
            .maybeSingle();

          if (!updateError2 && updatedProjectSimple) {
            updatedProject = updatedProjectSimple;
            updateSuccess = true;
          } else if (updateError2) {
            // Approach 3: Constraint violation - CANCELLED status not allowed, use notes only
            if (updateError2.message?.includes("projects_status_check") || updateError2.message?.includes("check constraint")) {
              console.log("[DELETE /api/projects/[id]] CANCELLED status not allowed in constraint, marking in notes only");
              const { data: updatedProjectNotes, error: updateError3 } = await supabaseAdmin
                .from("projects")
                .update({
                  notes: updatedNotes,
                })
                .eq("id", projectId)
                .select()
                .maybeSingle();

              if (!updateError3 && updatedProjectNotes) {
                updatedProject = updatedProjectNotes;
                updateSuccess = true;
              } else {
                console.error("[DELETE /api/projects/[id]] Failed to update notes:", updateError3);
                return new NextResponse(updateError3?.message || "Failed to cancel project", { status: 400 });
              }
            } else {
              console.error("[DELETE /api/projects/[id]] Supabase error:", updateError2);
              return new NextResponse(updateError2.message, { status: 400 });
            }
          }
        } else if (updateError1.message?.includes("projects_status_check") || updateError1.message?.includes("check constraint")) {
          // Constraint violation on first attempt
          console.log("[DELETE /api/projects/[id]] CANCELLED status not allowed in constraint, marking in notes only");
          const { data: updatedProjectNotes, error: updateError3 } = await supabaseAdmin
            .from("projects")
            .update({
              notes: updatedNotes,
            })
            .eq("id", projectId)
            .select()
            .maybeSingle();

          if (!updateError3 && updatedProjectNotes) {
            updatedProject = updatedProjectNotes;
            updateSuccess = true;
          } else {
            console.error("[DELETE /api/projects/[id]] Failed to update notes:", updateError3);
            return new NextResponse(updateError3?.message || "Failed to cancel project", { status: 400 });
          }
        } else {
          console.error("[DELETE /api/projects/[id]] Supabase error:", updateError1);
          return new NextResponse(updateError1.message, { status: 400 });
        }
      }

      if (!updateSuccess || !updatedProject) {
        return new NextResponse("Failed to cancel project", { status: 400 });
      }

      // Try to create notification (may fail if table doesn't exist)
      try {
        await supabaseAdmin.from("project_notifications").insert({
          project_id: projectId,
          notification_type: "PROJECT_CANCELLED",
          message: "This project has been cancelled by the client.",
        });
      } catch (notifError) {
        // Notification table might not exist, that's okay
        console.log("[DELETE /api/projects/[id]] Could not create notification:", notifError);
      }

      return NextResponse.json({ success: true, project: updatedProject });
    }

    // Admins can actually delete projects
    if (userContext.role === "ADMIN") {
      const { error: deleteError } = await supabaseAdmin.from("projects").delete().eq("id", projectId);

      if (deleteError) {
        console.error("[DELETE /api/projects/[id]] Supabase error:", deleteError);
        return new NextResponse(deleteError.message, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return new NextResponse("Forbidden", { status: 403 });
  } catch (error: any) {
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}
