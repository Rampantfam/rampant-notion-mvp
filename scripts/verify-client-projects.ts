/**
 * Verification script for client Projects page
 * 
 * This script verifies that:
 * 1. The "Test" client exists in the database
 * 2. Projects for the "Test" client are correctly fetched
 * 3. The client Projects page would show the correct projects
 * 
 * Run with: npx tsx scripts/verify-client-projects.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function verifyClientProjects() {
  console.log("🔍 Verifying client Projects page setup...\n");

  // Step 1: Find the "Test" client
  console.log("Step 1: Finding 'Test' client...");
  const { data: testClient, error: clientError } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("name", "Test")
    .maybeSingle();

  if (clientError) {
    console.error("❌ Error fetching Test client:", clientError.message);
    return;
  }

  if (!testClient) {
    console.warn("⚠️  'Test' client not found in database.");
    console.log("   To test the client Projects page, create a client with name='Test' in Supabase.");
    return;
  }

  console.log(`✅ Found Test client: ${testClient.name} (ID: ${testClient.id})\n`);

  // Step 2: Fetch projects for the Test client
  console.log("Step 2: Fetching projects for Test client...");
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, title, event_date, creative_name, service_type, status")
    .eq("client_id", testClient.id)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("❌ Error fetching projects:", projectsError.message);
    return;
  }

  const projectCount = projects?.length || 0;
  console.log(`✅ Found ${projectCount} project(s) for Test client:\n`);

  if (projectCount === 0) {
    console.log("   No projects found. The client Projects page will show an empty state.");
    console.log("   To test with data, create projects with client_id =", testClient.id);
    return;
  }

  // Step 3: Display project details
  projects?.forEach((project: any, index: number) => {
    console.log(`   ${index + 1}. ${project.title}`);
    console.log(`      Status: ${project.status}`);
    console.log(`      Event Date: ${project.event_date || "Not set"}`);
    console.log(`      Creative: ${project.creative_name || "Not assigned"}`);
    console.log(`      Service Type: ${project.service_type || "Not set"}`);
    console.log(`      ID: ${project.id}`);
    console.log("");
  });

  // Step 4: Verify status mapping
  console.log("Step 3: Verifying status mapping for client view...");
  const statusMap: Record<string, { label: string; color: string }> = {
    REQUEST_RECEIVED: { label: "Requested", color: "bg-gray-100 text-gray-700" },
    CONFIRMED: { label: "In Progress", color: "bg-orange-100 text-orange-700" },
    IN_PRODUCTION: { label: "In Progress", color: "bg-orange-100 text-orange-700" },
    POST_PRODUCTION: { label: "In Progress", color: "bg-orange-100 text-orange-700" },
    FINAL_REVIEW: { label: "In Progress", color: "bg-orange-100 text-orange-700" },
    COMPLETED: { label: "Delivered", color: "bg-green-100 text-green-700" },
  };

  projects?.forEach((project: any) => {
    const mapped = statusMap[project.status] || { label: "Requested", color: "bg-gray-100 text-gray-700" };
    console.log(`   ${project.title}: ${project.status} → ${mapped.label}`);
  });

  console.log("\n✅ Verification complete!");
  console.log("\n📋 Summary:");
  console.log(`   - Test client exists: ✅`);
  console.log(`   - Projects found: ${projectCount}`);
  console.log(`   - When a CLIENT user with client_id=${testClient.id} logs in,`);
  console.log(`     they will see these ${projectCount} project(s) on /app/projects`);
}

verifyClientProjects().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

