import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function haveEnv() {
  return Boolean(url && serviceKey);
}

async function getUserContext() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { user: null, role: null, clientId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const normalizedRole = profile?.role?.toString().toUpperCase();
  const role =
    normalizedRole === "ADMIN" || normalizedRole === "CLIENT" || normalizedRole === "TEAM"
      ? normalizedRole
      : null;

  return {
    user: session.user,
    role,
    clientId: (profile?.client_id as string) ?? null,
  };
}

// PUT - Update deliverable (Admin can update, Client can approve/request changes)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; deliverableId: string }> | { id: string; deliverableId: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id: projectId, deliverableId } = resolvedParams;

  try {
    const body = await req.json();

    if (!haveEnv()) {
      return new NextResponse("Supabase not configured", { status: 501 });
    }

    const userContext = await getUserContext();
    if (!userContext.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabaseAdmin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

    // Get the deliverable
    const { data: deliverable, error: deliverableError } = await supabaseAdmin
      .from("project_deliverables")
      .select("*")
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .single();

    if (deliverableError || !deliverable) {
      return new NextResponse("Deliverable not found", { status: 404 });
    }

    // Get the project to verify ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("client_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    // If user is a CLIENT, verify they own this project and can only change status
    if (userContext.role === "CLIENT") {
      if (!userContext.clientId || project.client_id !== userContext.clientId) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      // Clients can only update status to APPROVED or CHANGES_REQUESTED
      if (body.status && !["APPROVED", "CHANGES_REQUESTED"].includes(body.status)) {
        return new NextResponse("Forbidden: Invalid status change", { status: 403 });
      }

      // Only allow status updates for clients
      const updatePayload: any = {};
      if (body.status) {
        updatePayload.status = body.status;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("project_deliverables")
        .update(updatePayload)
        .eq("id", deliverableId)
        .select()
        .single();

      if (updateError) {
        return new NextResponse(updateError.message, { status: 400 });
      }

      // Create notification for admin and account managers
      if (body.status) {
        const notificationType = body.status === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED";
        const message =
          body.status === "APPROVED"
            ? `Deliverable "${deliverable.name}" has been approved by the client.`
            : `Client has requested changes for deliverable "${deliverable.name}".`;

        await supabaseAdmin.from("deliverable_notifications").insert({
          deliverable_id: deliverableId,
          project_id: projectId,
          notification_type: notificationType,
          message,
        });
      }

      return NextResponse.json(updated);
    }

    // Admin can update all fields
    if (userContext.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const updatePayload: any = {};
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.type !== undefined) updatePayload.type = body.type;
    if (body.external_link !== undefined) updatePayload.external_link = body.external_link;
    if (body.upload_date !== undefined) updatePayload.upload_date = body.upload_date;
    if (body.status !== undefined) updatePayload.status = body.status;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("project_deliverables")
      .update(updatePayload)
      .eq("id", deliverableId)
      .select()
      .single();

    if (updateError) {
      return new NextResponse(updateError.message, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}

// DELETE - Delete deliverable (Admin only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; deliverableId: string }> | { id: string; deliverableId: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { deliverableId } = resolvedParams;

  try {
    if (!haveEnv()) {
      return new NextResponse("Supabase not configured", { status: 501 });
    }

    const userContext = await getUserContext();
    if (!userContext.user || userContext.role !== "ADMIN") {
      return new NextResponse("Forbidden: Only admins can delete deliverables", { status: 403 });
    }

    const supabaseAdmin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

    const { error } = await supabaseAdmin.from("project_deliverables").delete().eq("id", deliverableId);

    if (error) {
      return new NextResponse(error.message, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}

