// scripts/run-all-reservations-qa.mjs
// Master Reservations QA Suite Runner
// Executes all 10 reservation test suites in sequence and prints comprehensive metrics.

import { execSync } from "node:child_process";

const SUITES = [
  { name: "Phase 1: Pure Availability Engine", file: "scripts/test-reservations-engine.mjs" },
  { name: "Phase 2: Booking API & Migrations", file: "scripts/test-reservations-api.mjs" },
  { name: "Phase 3: Public Guest Experience & Calendar", file: "scripts/test-phase3-guest.mjs" },
  { name: "Phase 4: Admin Floor Operations & Waitlist", file: "scripts/test-phase4-admin.mjs" },
  { name: "Phase 5: Notifications & Automated Reminders", file: "scripts/test-phase5-notifications.mjs" },
  { name: "Phase 6: Reservation Settings & Rules", file: "scripts/test-phase6-rules.mjs" },
  { name: "Phase 7: Guest CRM & Privacy Retention", file: "scripts/test-phase7-crm.mjs" },
  { name: "Phase 8.1: Invariant Concurrency Stress (50 reqs)", file: "scripts/test-reservations-concurrency.mjs" },
  { name: "Phase 8.2: Randomized Invariant Simulation (200 ops)", file: "scripts/test-reservations-randomized.mjs" },
  { name: "Phase 8.3: Playwright Browser E2E (Desktop & Mobile)", file: "scripts/test-reservations-browser-e2e.mjs" },
];

console.log("\n================================================================================");
console.log("            EXECUTING FULL COMPREHENSIVE RESERVATIONS REGRESSION SUITE          ");
console.log("================================================================================\n");

let allPassed = true;
const results = [];

for (const suite of SUITES) {
  process.stdout.write(`Running ${suite.name}... `);
  const start = Date.now();
  try {
    const output = execSync(`node ${suite.file}`, { encoding: "utf8", stdio: "pipe" });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[PASS] (${duration}s)`);
    results.push({ name: suite.name, status: "PASS", duration, output });
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[FAIL] (${duration}s)`);
    console.error(err.stdout || err.message);
    results.push({ name: suite.name, status: "FAIL", duration, output: err.stdout });
    allPassed = false;
  }
}

console.log("\n================================================================================");
console.log("                        REGRESSION SUITE EXECUTION SUMMARY                      ");
console.log("================================================================================\n");

for (const r of results) {
  console.log(`  ${r.status === "PASS" ? "✓ PASS" : "✗ FAIL"} | ${r.name.padEnd(55)} (${r.duration}s)`);
}

console.log("\n--------------------------------------------------------------------------------");
if (allPassed) {
  console.log("  >>> STATUS: ALL GREEN — 10 / 10 TEST SUITES PASSED (100%) <<<");
} else {
  console.log("  >>> STATUS: NOT GREEN — ONE OR MORE SUITES FAILED <<<");
}
console.log("--------------------------------------------------------------------------------\n");

if (!allPassed) {
  process.exit(1);
}

