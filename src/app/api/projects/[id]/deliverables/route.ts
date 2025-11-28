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

// GET - Fetch all deliverables for a project
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const projectId = resolvedParams.id;

  try {
    if (!haveEnv()) {
      return new NextResponse("Supabase not configured", { status: 501 });
    }

    const userContext = await getUserContext();
    if (!userContext.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabaseAdmin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

    // If user is a CLIENT, verify they own this project
    if (userContext.role === "CLIENT" && userContext.clientId) {
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("client_id")
        .eq("id", projectId)
        .maybeSingle();

      if (!project || project.client_id !== userContext.clientId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("project_deliverables")
      .select("*")
      .eq("project_id", projectId)
      .order("upload_date", { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json([]);
      }
      console.error("[GET /api/projects/[id]/deliverables] Error:", error);
      return new NextResponse(error.message, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}

// POST - Create a new deliverable (Admin only)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const projectId = resolvedParams.id;

  try {
    const body = await req.json();

    if (!haveEnv()) {
      return new NextResponse("Supabase not configured", { status: 501 });
    }

    const userContext = await getUserContext();
    if (!userContext.user || userContext.role !== "ADMIN") {
      return new NextResponse("Forbidden: Only admins can create deliverables", { status: 403 });
    }

    const supabaseAdmin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

    const { data, error } = await supabaseAdmin
      .from("project_deliverables")
      .insert({
        project_id: projectId,
        name: body.name,
        type: body.type || "Design",
        external_link: body.external_link || null,
        upload_date: body.upload_date || new Date().toISOString().split("T")[0],
        status: "AWAITING_APPROVAL",
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/projects/[id]/deliverables] Error:", error);
      return new NextResponse(error.message, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return new NextResponse(error?.message || "Server error", { status: 500 });
  }
}

