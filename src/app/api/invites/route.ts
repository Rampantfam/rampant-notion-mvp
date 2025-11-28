import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/invites
 * Sends an email invitation to a team/admin member
 * Body: { email: string, full_name: string, role: 'TEAM' | 'ADMIN' }
 */
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { email, full_name, role } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: "Email, full_name, and role are required" }, { status: 400 });
    }

    if (!["TEAM", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Role must be TEAM or ADMIN" }, { status: 400 });
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id, email, status")
      .eq("email", email)
      .eq("role", role)
      .maybeSingle();

    if (existingProfile?.user_id) {
      return NextResponse.json(
        { error: "User already has an account. They can log in directly." },
        { status: 400 }
      );
    }

    // Generate invite link
    // In production, you'd want to use Supabase's built-in invite system
    // For now, we'll create a magic link that allows them to claim their account
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // Expires in 7 days

    // Store invite token in a temporary table or in the profile
    // For simplicity, we'll add an invite_token column to profiles
    // First, ensure the profile exists (it should from the team/admin creation)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, email")
      .eq("email", email)
      .eq("role", role)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // Update profile with invite token (if profile exists)
    if (profile) {
      await supabase
        .from("profiles")
        .update({
          // We'll store invite_token in a JSONB metadata field or add a column
          // For now, we'll use Supabase's built-in invite system
        })
        .eq("email", email)
        .eq("role", role);
    }

    // Generate invite URL - use passed origin header (from internal API calls) or request origin
    const origin = req.headers.get('origin') || // Check for passed origin from internal calls first
                   req.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                   process.env.NEXT_PUBLIC_APP_URL || 
                   'http://localhost:3000';
    const baseUrl = origin.replace(/\/$/, ''); // Remove trailing slash if present
    const inviteUrl = `${baseUrl}/invite/accept?token=${inviteToken}&email=${encodeURIComponent(email)}`;

    // TODO: In production, integrate with an email service (SendGrid, Resend, etc.)
    // For now, we'll return the invite URL which can be sent manually
    // You can integrate email sending here using your preferred service
    
    // Log the invite URL for now (in production, send via email service)
    console.log(`Invite URL for ${email} (${role}): ${inviteUrl}`);

    return NextResponse.json({
      success: true,
      inviteUrl,
      message: "Invite URL generated. Please send this link to the user via email.",
      email,
      note: "To enable automatic email sending, configure an email service in your API route.",
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

