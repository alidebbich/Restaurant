// scripts/test-reservations-randomized.mjs
// Phase 8.2 — Randomized Invariant Simulation Test
// Simulates 200 operations via HTTP endpoints and asserts after every operation
// that the concurrent capacity invariant is strictly preserved.

import { DatabaseSync } from "node:sqlite";

const BASE_URL = "http://localhost:3000";
const TEST_DATE = "2027-04-15";
const MAX_CONCURRENT = 20; // 20 covers
const MAX_PACING = 8;      // 8 covers per 15-min slot

const db = new DatabaseSync("data/restaurant.sqlite");

console.log("\n=======================================================");
console.log("   PHASE 8.2 — RANDOMIZED INVARIANT SIMULATION TEST    ");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRandomizedTest() {
  // 1. Authenticate as Admin
  console.log("Logging in as admin...");
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
  if (loginRes.status !== 200) {
    throw new Error(`Admin login failed: ${loginRes.status}`);
  }
  const rawCookies = loginRes.headers.get("set-cookie") || "";
  const match = rawCookies.match(/restaurant_admin_token=([^;]+)/);
  if (!match) throw new Error("No session cookie received");
  const adminCookie = match[0];

  // 2. Set test rules
  const rulesRes = await fetch(`${BASE_URL}/api/admin/reservation-rules`, {
    headers: { Cookie: adminCookie },
  });
  const originalRules = (await rulesRes.json()).rules;

  await fetch(`${BASE_URL}/api/admin/reservation-rules`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      ...originalRules,
      defaultMaxCoversConcurrent: MAX_CONCURRENT,
      defaultMaxCoversPerSlot: MAX_PACING,
      slotIntervalMinutes: 15,
      minPartySizeOnline: 1,
      maxPartySizeOnline: 8,
      minLeadTimeMinutes: 0,
      cancelCutoffMinutes: 0,
    }),
  });

  // 3. Clear existing test reservations
  db.prepare("DELETE FROM reservations WHERE service_date = ?").run(TEST_DATE);

  // Helper to check the invariant across all minutes
  function checkInvariant(step) {
    const activeBookings = db
      .prepare(
        `SELECT id, party_size, start_minute, duration_minutes, source, status, internal_notes
         FROM reservations
         WHERE service_date = ? AND status IN ('pending', 'confirmed', 'seated')`
      )
      .all(TEST_DATE);

    for (let m = 690; m <= 1410; m++) {
      let standardCovers = 0;
      for (const b of activeBookings) {
        const end = b.start_minute + b.duration_minutes;
        if (m >= b.start_minute && m < end) {
          if (!b.internal_notes || !b.internal_notes.includes("MANAGER OVERRIDE")) {
            standardCovers += b.party_size;
          }
        }
      }

      if (standardCovers > MAX_CONCURRENT) {
        throw new Error(
          `Capacity invariant breached at minute ${m} during step ${step}! ` +
          `Active covers: ${standardCovers} > Max limit: ${MAX_CONCURRENT}`
        );
      }
    }
  }

  const SLOTS = [720, 750, 780, 810, 840, 1170, 1200, 1230, 1260, 1290, 1320];
  const activeBookings = []; // { id, manageToken, partySize, startMinute, phone }

  const stats = {
    bookingsAttempted: 0,
    bookingsAccepted: 0,
    bookingsRejected: 0,
    modifiesAttempted: 0,
    modifiesAccepted: 0,
    modifiesRejected: 0,
    cancellations: 0,
    statusUpdates: 0,
  };

  console.log(`Starting 200 randomized operations against ${TEST_DATE}...`);
  console.log(`Limits: ${MAX_CONCURRENT} max concurrent covers, ${MAX_PACING} covers/slot.\n`);

  for (let step = 1; step <= 200; step++) {
    const rand = Math.random();

    if (rand < 0.55 || activeBookings.length === 0) {
      // 55% Bookings
      stats.bookingsAttempted++;
      const partySize = Math.floor(Math.random() * 5) + 1; // 1 to 5 covers
      const startMinute = SLOTS[Math.floor(Math.random() * SLOTS.length)];
      const phone = `+21698${String(100000 + step).padStart(6, "0")}`;

      const res = await fetch(`${BASE_URL}/api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: TEST_DATE,
          startMinute,
          partySize,
          guestName: `Sim Guest ${step}`,
          guestPhone: phone,
          guestEmail: `sim${step}@test.tn`,
          locale: "fr",
        }),
      });

      if (res.status === 200) {
        const data = await res.json();
        stats.bookingsAccepted++;
        activeBookings.push({
          id: data.reservation.id,
          manageToken: data.manageToken,
          partySize,
          startMinute,
          phone,
        });
      } else {
        stats.bookingsRejected++;
      }
    } else if (rand < 0.75 && activeBookings.length > 0) {
      // 20% Reschedules / Modifications
      stats.modifiesAttempted++;
      const targetIdx = Math.floor(Math.random() * activeBookings.length);
      const target = activeBookings[targetIdx];
      const newMinute = SLOTS[Math.floor(Math.random() * SLOTS.length)];
      const newParty = Math.floor(Math.random() * 5) + 1;

      const res = await fetch(`${BASE_URL}/api/reservations/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: target.manageToken,
          serviceDate: TEST_DATE,
          startMinute: newMinute,
          partySize: newParty,
        }),
      });

      if (res.status === 200) {
        stats.modifiesAccepted++;
        target.startMinute = newMinute;
        target.partySize = newParty;
      } else {
        stats.modifiesRejected++;
      }
    } else if (rand < 0.88 && activeBookings.length > 0) {
      // 13% Cancellations
      stats.cancellations++;
      const targetIdx = Math.floor(Math.random() * activeBookings.length);
      const target = activeBookings.splice(targetIdx, 1)[0];

      await fetch(`${BASE_URL}/api/reservations/manage`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: target.manageToken,
          reason: "Change of plans in simulation",
        }),
      });
    } else if (activeBookings.length > 0) {
      // 12% Floor status updates (seated, completed)
      stats.statusUpdates++;
      const target = activeBookings[Math.floor(Math.random() * activeBookings.length)];
      const nextStatus = Math.random() < 0.6 ? "seated" : "completed";

      await fetch(`${BASE_URL}/api/reservations/${target.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (nextStatus === "completed") {
        const idx = activeBookings.findIndex((b) => b.id === target.id);
        if (idx !== -1) activeBookings.splice(idx, 1);
      }
    }

    // Verify invariant after step
    checkInvariant(step);
    assert(true, `Invariant preserved at step ${step}`);

    if (step % 50 === 0) {
      console.log(`  Completed ${step} / 200 operations. Zero capacity breaches.`);
    }
  }

  // Restore rules
  await fetch(`${BASE_URL}/api/admin/reservation-rules`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify(originalRules),
  });

  console.log("\nSimulation results:");
  console.log(`  Bookings: ${stats.bookingsAccepted} accepted / ${stats.bookingsAttempted} attempted (${stats.bookingsRejected} rejected at capacity)`);
  console.log(`  Modifications: ${stats.modifiesAccepted} accepted / ${stats.modifiesAttempted} attempted (${stats.modifiesRejected} rejected)`);
  console.log(`  Cancellations: ${stats.cancellations}`);
  console.log(`  Floor Status Updates: ${stats.statusUpdates}`);
  console.log(`  Remaining active bookings: ${activeBookings.length}`);
  console.log(`  Total step invariant checks passed: ${passed} / 200`);

  console.log("\n=======================================================");
  console.log(`RANDOMIZED TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (100% INVARIANT PRESERVED)`);
  console.log("=======================================================\n");
}

runRandomizedTest().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});
