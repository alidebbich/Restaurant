import { DatabaseSync } from "node:sqlite";
import { DEFAULT_RESERVATION_RULES } from "../src/lib/reservations/rules.ts";

const BASE_URL = "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    failedCount++;
  }
}

async function runConcurrencyTest() {
  console.log("\n=======================================================");
  console.log("   PHASE 8.1 — INVARIANT CONCURRENCY STRESS TEST       ");
  console.log("=======================================================\n");

  const db = new DatabaseSync("data/restaurant.sqlite");
  const testDate = "2026-12-29";
  const testSlot = 750; // 12:30

  // 1. Configure strict capacity limits: max 4 covers on slot, max 10 concurrent
  const stressRules = {
    ...DEFAULT_RESERVATION_RULES,
    defaultMaxCoversConcurrent: 10,
    defaultMaxCoversPerSlot: 4,
    slotIntervalMinutes: 15,
  };
  db.prepare("UPDATE reservation_rules SET rules_json = ? WHERE id = 1").run(JSON.stringify(stressRules));

  // Clean up any test rows on this date
  db.prepare("DELETE FROM reservations WHERE service_date = ?").run(testDate);

  console.log("Setup invariant limits:");
  console.log("  Slot pacing limit: 4 covers");
  console.log("  Concurrent capacity limit: 10 covers");
  console.log("  Request size: 2 covers per request");
  console.log("  Firing 50 concurrent requests via Promise.all()...\n");

  // 2. Fire 50 concurrent booking requests simultaneously
  const requests = Array.from({ length: 50 }, (_, i) => {
    return fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": `concur_req_${Date.now()}_${i}_${Math.random()}`,
      },
      body: JSON.stringify({
        guestName: `Stress Guest ${i + 1}`,
        guestPhone: `+2165${String(1000000 + i)}`,
        serviceDate: testDate,
        startMinute: testSlot,
        partySize: 2,
        locale: "fr",
      }),
    });
  });

  const responses = await Promise.all(requests);
  const results = await Promise.all(
    responses.map(async (r) => ({
      status: r.status,
      body: await r.json().catch(() => ({})),
    }))
  );

  const success200 = results.filter((r) => r.status === 200);
  const conflict409 = results.filter((r) => r.status === 409);
  const otherErrors = results.filter((r) => r.status !== 200 && r.status !== 409);

  console.log(`Results: ${success200.length} succeeded (200 OK), ${conflict409.length} rejected (409 Conflict), ${otherErrors.length} unexpected errors`);

  // Invariant Assertions
  assert(success200.length === 2, "Exactly 2 requests succeeded (2 x 2 = 4 covers = slot limit)");
  assert(conflict409.length === 48, "Exactly 48 requests received HTTP 409 Conflict");
  assert(otherErrors.length === 0, "Zero unhandled 500 or database lock crashes");

  // 3. Database Invariant Check
  const dbRows = db.prepare(`
    SELECT id, reference, party_size, status FROM reservations
    WHERE service_date = ? AND start_minute = ? AND status IN ('pending', 'confirmed', 'seated')
  `).all(testDate, testSlot);

  const totalBookedCovers = dbRows.reduce((acc, r) => acc + (r.party_size || 0), 0);
  assert(dbRows.length === 2, "Database contains exactly 2 active reservation rows for this slot");
  assert(totalBookedCovers === 4, `Total booked covers strictly equals 4 (slot ceiling) [got ${totalBookedCovers}]`);
  assert(totalBookedCovers <= stressRules.defaultMaxCoversPerSlot, "CORE INVARIANT PRESERVED: booked covers <= slot capacity");

  // Clean up and restore rules
  db.prepare("DELETE FROM reservations WHERE service_date = ?").run(testDate);
  db.prepare("UPDATE reservation_rules SET rules_json = ? WHERE id = 1").run(JSON.stringify(DEFAULT_RESERVATION_RULES));
  console.log("\nRestored default reservation rules.");

  console.log("\n=======================================================");
  console.log(`CONCURRENCY TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runConcurrencyTest().catch((e) => {
  console.error("Concurrency test fatal error:", e);
  process.exit(1);
});

