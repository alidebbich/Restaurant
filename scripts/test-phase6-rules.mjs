import { DatabaseSync } from "node:sqlite";

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

async function runPhase6Tests() {
  console.log("\n=======================================================");
  console.log("   PHASE 6 — RESERVATION SETTINGS & LIVE PREVIEW QA    ");
  console.log("=======================================================\n");

  const db = new DatabaseSync("data/restaurant.sqlite");

  // 1. Authenticate as Admin
  console.log("--- 1. Admin Authentication ---");
  let sessionCookie = "";
  {
    const csrfRes = await fetch(`${BASE_URL}/api/auth/login`);
    const csrfCookies = csrfRes.headers.get("set-cookie") || "";
    const csrfMatch = csrfCookies.match(/csrf_token=([^;]+)/);
    const csrfCookie = csrfMatch ? csrfMatch[0] : "";
    const { csrfToken } = await csrfRes.json();

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
        Cookie: csrfCookie,
      },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    const rawCookies = loginRes.headers.get("set-cookie") || "";
    const match = rawCookies.match(/restaurant_admin_token=([^;]+)/);
    assert(Boolean(match), "Authenticated and obtained restaurant_admin_token cookie");
    sessionCookie = match ? match[0] : "";
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: sessionCookie,
  };

  // 2. GET Reservation Rules
  console.log("\n--- 2. GET /api/admin/reservation-rules ---");
  {
    // Unauth
    const unauthRes = await fetch(`${BASE_URL}/api/admin/reservation-rules`);
    assert(unauthRes.status === 401, "Unauthenticated GET rejected with HTTP 401");

    // Auth
    const res = await fetch(`${BASE_URL}/api/admin/reservation-rules`, { headers: authHeaders });
    const data = await res.json();
    assert(res.status === 200, "Authenticated GET returns HTTP 200");
    assert(data.success === true, "Response has success: true");
    assert(typeof data.rules?.defaultMaxCoversConcurrent === "number", "Rules contains defaultMaxCoversConcurrent");
    assert(Array.isArray(data.rules?.durationsByPartySize), "Rules contains durationsByPartySize array");
  }

  // 3. PUT /api/admin/reservation-rules Validation & Invariant Enforcement
  console.log("\n--- 3. PUT /api/admin/reservation-rules Validation & Invariants ---");
  {
    // 3.1 Unauth
    const unauthPut = await fetch(`${BASE_URL}/api/admin/reservation-rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultMaxCoversConcurrent: 50 }),
    });
    assert(unauthPut.status === 401, "Unauthenticated PUT rejected with HTTP 401");

    // 3.2 Invariant Violation: Pacing > Concurrent Capacity
    const badPacingRes = await fetch(`${BASE_URL}/api/admin/reservation-rules`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        defaultMaxCoversConcurrent: 30,
        defaultMaxCoversPerSlot: 40, // 40 > 30 impossible!
        slotIntervalMinutes: 15,
      }),
    });
    const badPacingData = await badPacingRes.json();
    assert(badPacingRes.status === 400, "Pacing exceeding concurrent capacity rejected with HTTP 400");
    assert(badPacingData.code === "PACING_EXCEEDS_CONCURRENT", "Returns code PACING_EXCEEDS_CONCURRENT");

    // 3.3 Invalid Slot Interval (e.g. 25 minutes)
    const badIntervalRes = await fetch(`${BASE_URL}/api/admin/reservation-rules`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        slotIntervalMinutes: 25,
      }),
    });
    const badIntervalData = await badIntervalRes.json();
    assert(badIntervalRes.status === 400, "Invalid slot interval rejected with HTTP 400");
    assert(badIntervalData.code === "INVALID_RULES", "Returns code INVALID_RULES");

    // 3.4 Valid Update
    const validUpdateRes = await fetch(`${BASE_URL}/api/admin/reservation-rules`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        defaultMaxCoversConcurrent: 42,
        defaultMaxCoversPerSlot: 14,
        slotIntervalMinutes: 15,
        minLeadTimeMinutes: 90,
        cancelCutoffMinutes: 120,
        largePartyThreshold: 8,
        durationsByPartySize: [
          { minParty: 1, maxParty: 2, durationMinutes: 75 },
          { minParty: 3, maxParty: 4, durationMinutes: 90 },
          { minParty: 5, maxParty: 8, durationMinutes: 120 },
          { minParty: 9, maxParty: 99, durationMinutes: 150 },
        ],
        blackoutDates: ["2026-12-31"],
      }),
    });
    const validData = await validUpdateRes.json();
    assert(validUpdateRes.status === 200, "Valid rules update returns HTTP 200");
    assert(validData.rules?.defaultMaxCoversConcurrent === 42, "Rules updated to 42 concurrent covers");
    assert(validData.rules?.blackoutDates?.includes("2026-12-31"), "Blackout date 2026-12-31 recorded");

    // Check DB persistence in SQLite
    const dbRow = db.prepare("SELECT rules_json FROM reservation_rules WHERE id = 1").get();
    const parsedDbRules = JSON.parse(dbRow.rules_json);
    assert(parsedDbRules.defaultMaxCoversConcurrent === 42, "Database table reservation_rules persisted update");

    // Check audit log
    const logRow = db.prepare("SELECT * FROM activity_logs WHERE entity_type = 'settings' AND action = 'update_reservation_rules' ORDER BY id DESC LIMIT 1").get();
    assert(Boolean(logRow), "Audit activity log recorded for settings change");
  }

  // 4. Admin Settings Page Render
  console.log("\n--- 4. Settings Page Availability (/admin/settings) ---");
  {
    const pageRes = await fetch(`${BASE_URL}/admin/settings`, {
      headers: { Cookie: sessionCookie },
    });
    assert(pageRes.status === 200, "/admin/settings renders HTTP 200 for authenticated admin");
    const html = await pageRes.text();
    assert(html.includes("Paramètres du Restaurant"), "Settings page contains title");
    assert(html.includes("Réservations"), "Settings page contains Réservations tab");
  }

  console.log("\n=======================================================");
  console.log(`PHASE 6 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((e) => {
  console.error("Phase 6 QA test fatal error:", e);
  process.exit(1);
});

