import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

(async () => {
  try {
    const { seedAdmin } = await import("../src/lib/seedAdmin");
    await seedAdmin();
    console.log("Seed script completed.");
    process.exit(0);
  } catch (e) {
    console.error("Seed failed:", e);
    process.exit(1);
  }
})();
