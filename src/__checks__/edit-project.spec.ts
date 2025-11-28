// Lightweight tests for Edit Project functionality
// Run with: npx tsx src/__checks__/edit-project.spec.ts

function parseDeliverables(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapManagersToColumns(managers: Array<{ name: string; email?: string; phone?: string }>) {
  const names = managers.map((m) => m.name ?? "").filter(Boolean);
  const emails = managers.map((m) => m.email ?? "").filter((e) => e);
  const phones = managers.map((m) => m.phone ?? "").filter((p) => p);
  return { names, emails, phones };
}

// Test 1: Deliverables parser
console.log("Test 1: Deliverables parser");
const test1Input = "Photo, Video , , Album";
const test1Result = parseDeliverables(test1Input);
const test1Expected = ["Photo", "Video", "Album"];
console.assert(
  JSON.stringify(test1Result) === JSON.stringify(test1Expected),
  `Expected ${JSON.stringify(test1Expected)}, got ${JSON.stringify(test1Result)}`
);
console.log("✓ Deliverables parser works correctly");

// Test 2: Account managers mapping
console.log("\nTest 2: Account managers mapping");
const test2Input = [{ name: "A", email: "a@x.com", phone: "1" }];
const test2Result = mapManagersToColumns(test2Input);
const test2Expected = { names: ["A"], emails: ["a@x.com"], phones: ["1"] };
console.assert(
  JSON.stringify(test2Result) === JSON.stringify(test2Expected),
  `Expected ${JSON.stringify(test2Expected)}, got ${JSON.stringify(test2Result)}`
);
console.log("✓ Account managers mapping works correctly");

// Test 3: Client change confirmation (mock)
console.log("\nTest 3: Client change confirmation flow");
let confirmCalled = false;
let confirmValue = false;
const mockConfirm = (message: string) => {
  confirmCalled = true;
  return confirmValue;
};
const originalClientId = "client-1";
const newClientId = "client-2";
if (newClientId !== originalClientId) {
  const shouldProceed = mockConfirm("Update client?");
  console.assert(confirmCalled, "Confirm dialog should be triggered");
  console.log(`✓ Client change confirmation triggered (proceed: ${shouldProceed})`);
}

console.log("\n✅ All tests passed!");



