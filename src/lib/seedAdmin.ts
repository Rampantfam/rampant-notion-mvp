import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");

const admin = createClient(supabaseUrl, serviceKey);

export async function seedAdmin() {
  const email = "rampantfam@gmail.com";
  const password = "test123";

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    console.log("Admin already exists.");
    return;
  }

  const { data: userResp, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) throw authErr;

  const userId = userResp.user?.id;
  if (!userId) throw new Error("No user id returned from admin.createUser");

  const { error: profileErr } = await admin.from("profiles").insert({
    user_id: userId,
    role: "ADMIN",
    full_name: "Rampant Admin",
    email,
  });
  if (profileErr) throw profileErr;

  console.log("✅ Seeded ADMIN user:", email);
}
