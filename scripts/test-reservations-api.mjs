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

async function runApiTests() {
  console.log("\n=======================================================");
  console.log("   RESERVATION SYSTEM — API END-TO-END VERIFICATION    ");
  console.log("=======================================================\n");

  const db = new DatabaseSync("data/restaurant.sqlite");
  const testDate = "2026-12-15"; // Future test date

  // Cleanup any leftover test rows from previous runs
  db.prepare("DELETE FROM reservations WHERE guest_email LIKE '%@test-runner.com'").run();

  // ─────────────────────────────────────────────────────────────
  // 1. AVAILABILITY API
  // ─────────────────────────────────────────────────────────────
  console.log("--- 1. Availability Endpoint (GET /api/reservations/availability) ---");

  // 1.1 Valid availability query
  {
    const res = await fetch(`${BASE_URL}/api/reservations/availability?date=${testDate}&partySize=2`);
    const data = await res.json();
    assert(res.status === 200, "Valid date returns HTTP 200");
    assert(data.success === true, "Response contains success: true");
    assert(Array.isArray(data.slots) && data.slots.length > 0, "Returns non-empty slots array");
    const slot = data.slots[0];
    assert(typeof slot.startMinute === "number" && typeof slot.timeFormatted === "string", "Slot contains startMinute and timeFormatted");
    assert(typeof slot.available === "boolean", "Slot contains available boolean");
  }

  // 1.2 Invalid date format
  {
    const res = await fetch(`${BASE_URL}/api/reservations/availability?date=not-a-date&partySize=2`);
    const data = await res.json();
    assert(res.status === 400, "Invalid date format returns HTTP 400");
    assert(data.code === "INVALID_DATE", "Returns code INVALID_DATE");
  }

  // 1.3 Invalid party size
  {
    const res = await fetch(`${BASE_URL}/api/reservations/availability?date=${testDate}&partySize=0`);
    const data = await res.json();
    assert(res.status === 400, "Party size 0 returns HTTP 400");
    assert(data.code === "INVALID_PARTY_SIZE", "Returns code INVALID_PARTY_SIZE");
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CREATE RESERVATION API (POST /api/reservations)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. Create Reservation Endpoint (POST /api/reservations) ---");

  let createdRef = "";
  let manageToken = "";
  const uniqueKey = "idem_test_" + Date.now();

  // 2.1 Valid creation
  {
    const payload = {
      guestName: "Yassine Mansour",
      guestPhone: "98123456", // 8 digits -> +21698123456
      guestEmail: "yassine@test-runner.com",
      serviceDate: testDate,
      startMinute: 780, // 13:00
      partySize: 3,
      guestNotes: "Table près de la fontaine s'il vous plaît",
      occasion: "anniversary",
      locale: "fr",
      idempotencyKey: uniqueKey,
    };

    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    assert(res.status === 200, "Valid reservation returns HTTP 200");
    assert(data.success === true, "Creation returns success: true");
    assert(/^RZ-[A-Z0-9]{4}$/.test(data.reservation?.reference), "Generates valid reference code (RZ-XXXX)", `Got ${data.reservation?.reference}`);
    assert(typeof data.rawManageToken === "string" && data.rawManageToken.length > 20, "Returns rawManageToken for guest management");
    assert(data.manageUrl?.includes(data.rawManageToken), "Manage URL includes raw manage token");

    createdRef = data.reservation.reference;
    manageToken = data.rawManageToken;
  }

  // 2.2 Idempotency test (repeat exact request with same idempotencyKey)
  {
    const payload = {
      guestName: "Yassine Mansour",
      guestPhone: "98123456",
      guestEmail: "yassine@test-runner.com",
      serviceDate: testDate,
      startMinute: 780,
      partySize: 3,
      idempotencyKey: uniqueKey,
    };

    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    assert(res.status === 200, "Repeated request returns HTTP 200");
    assert(data.isDuplicate === true, "Returns isDuplicate: true");
    assert(data.reservation.reference === createdRef, "Returns original reservation reference");

    // Check DB has exactly 1 row
    const countRow = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE idempotency_key = ?").get(uniqueKey);
    assert(countRow.count === 1, "Database contains exactly 1 row for this idempotencyKey");
  }

  // 2.3 Honeypot anti-bot test
  {
    const beforeCount = db.prepare("SELECT COUNT(*) as count FROM reservations").get().count;
    const botPayload = {
      guestName: "Spam Bot",
      guestPhone: "20123456",
      guestEmail: "spambot@test-runner.com",
      serviceDate: testDate,
      startMinute: 780,
      partySize: 2,
      website: "http://free-casino-money.com", // honeypot
    };

    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(botPayload),
    });
    const data = await res.json();

    assert(res.status === 200, "Bot request receives deceptive HTTP 200");
    const afterCount = db.prepare("SELECT COUNT(*) as count FROM reservations").get().count;
    assert(beforeCount === afterCount, "Bot request created ZERO rows in the database");
  }

  // 2.4 Duplicate booking test (different idempotency key, but same phone on same day)
  {
    const dupPayload = {
      guestName: "Yassine Mansour",
      guestPhone: "98123456", // same phone as 2.1
      guestEmail: "yassine2@test-runner.com",
      serviceDate: testDate, // same date
      startMinute: 840, // 14:00
      partySize: 2,
      idempotencyKey: "diff_key_" + Date.now(),
    };

    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dupPayload),
    });
    const data = await res.json();

    assert(res.status === 400, "Duplicate phone on same day rejected with HTTP 400");
    assert(data.code === "DUPLICATE_BOOKING", "Returns code DUPLICATE_BOOKING");
  }

  // 2.5 Invalid phone number validation
  {
    const badPhonePayload = {
      guestName: "Bad Phone Guy",
      guestPhone: "12345", // too short
      serviceDate: testDate,
      startMinute: 780,
      partySize: 2,
    };

    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badPhonePayload),
    });
    const data = await res.json();

    assert(res.status === 400, "Invalid phone number returns HTTP 400");
    assert(data.code === "INVALID_PHONE", "Returns code INVALID_PHONE");
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GUEST SELF-SERVICE MANAGE API (/api/reservations/manage)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Manage Endpoint (GET, PATCH, DELETE /api/reservations/manage) ---");

  // 3.1 GET reservation details using manageToken
  {
    const res = await fetch(`${BASE_URL}/api/reservations/manage?token=${manageToken}`);
    const data = await res.json();

    assert(res.status === 200, "Valid token retrieves reservation with HTTP 200");
    assert(data.reservation?.reference === createdRef, "Retrieved reference matches created reference");
    assert(data.reservation?.guestName === "Yassine Mansour", "Retrieved guest name matches");
    assert(data.permissions?.canModify === true, "canModify permission is true for upcoming booking");
    assert(data.permissions?.canCancel === true, "canCancel permission is true for upcoming booking");
  }

  // 3.2 GET with invalid token
  {
    const res = await fetch(`${BASE_URL}/api/reservations/manage?token=invalid_token_1234567890`);
    const data = await res.json();
    assert(res.status === 404, "Unknown manage token returns HTTP 404");
  }

  // 3.3 PATCH modify party size & time
  {
    const patchPayload = {
      token: manageToken,
      startMinute: 810, // 13:30
      partySize: 4,
      guestNotes: "Mis à jour: 4 personnes",
    };

    const res = await fetch(`${BASE_URL}/api/reservations/manage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchPayload),
    });
    const data = await res.json();

    assert(res.status === 200, "Modification succeeds with HTTP 200");
    assert(data.reservation?.partySize === 4, "Party size updated to 4 in response");

    // Verify DB update
    const dbRow = db.prepare("SELECT party_size, start_minute FROM reservations WHERE reference = ?").get(createdRef);
    assert(dbRow.party_size === 4 && dbRow.start_minute === 810, "Database row reflects updated party_size and start_minute");
  }

  // 3.4 DELETE cancel reservation
  {
    const res = await fetch(`${BASE_URL}/api/reservations/manage`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: manageToken, reason: "Changement de programme" }),
    });
    const data = await res.json();

    assert(res.status === 200, "Cancellation succeeds with HTTP 200");
    assert(data.status === "cancelled", "Returns status cancelled");

    // Verify DB status
    const dbRow = db.prepare("SELECT status, cancelled_at, cancel_reason FROM reservations WHERE reference = ?").get(createdRef);
    assert(dbRow.status === "cancelled", "Database status updated to cancelled");
    assert(dbRow.cancelled_at !== null, "cancelled_at timestamp recorded");
    assert(dbRow.cancel_reason === "Changement de programme", "cancel_reason recorded");

    // Verify history audit row
    const historyRows = db.prepare("SELECT * FROM reservation_status_history WHERE reservation_id = (SELECT id FROM reservations WHERE reference = ?)").all(createdRef);
    assert(historyRows.length >= 1, "Status transition recorded in reservation_status_history table");
  }

  // 3.5 Attempting to modify an already cancelled reservation
  {
    const res = await fetch(`${BASE_URL}/api/reservations/manage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: manageToken, partySize: 2 }),
    });
    assert(res.status === 403 || res.status === 400 || res.status === 409, "Modifying cancelled reservation is rejected");
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CAPACITY OVERFLOW & ALTERNATIVE SLOTS SUGGESTION
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. Capacity Overflow & Alternative Slots Suggestion ---");

  {
    const tightDate = "2026-12-24";
    // Fill slot 1200 (20:00) with concurrent max covers (40 covers)
    // We insert 4 bookings of 10 people directly or via query
    const insertStmt = db.prepare(`
      INSERT INTO reservations (
        id, customer_name, customer_phone, reservation_date, reservation_time,
        service_date, start_minute, duration_minutes, party_size, status, reference, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `);

    for (let i = 1; i <= 4; i++) {
      insertStmt.run(
        `overflow_test_${i}`,
        `Test Overfill ${i}`,
        `+2162000000${i}`,
        tightDate,
        "20:00",
        tightDate,
        1200,
        90,
        10,
        `RZ-OV0${i}`,
        `overflow_key_${i}`
      );
    }

    // Now try to book slot 1200 on tightDate
    const overflowPayload = {
      guestName: "Unlucky Guest",
      guestPhone: "55123456",
      guestEmail: "unlucky@test-runner.com",
      serviceDate: tightDate,
      startMinute: 1200,
      partySize: 2,
    };

    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overflowPayload),
    });
    const data = await res.json();

    assert(res.status === 409, "Full slot returns HTTP 409 Conflict");
    assert(data.code === "SLOT_TAKEN", "Returns code SLOT_TAKEN");
    assert(Array.isArray(data.alternativeSlots) && data.alternativeSlots.length > 0, "Returns non-empty alternativeSlots array");
    console.log(`    Suggested alternatives: ${data.alternativeSlots.map(s => s.timeFormatted).join(", ")}`);

    // Clean up
    db.prepare("DELETE FROM reservations WHERE id LIKE 'overflow_test_%'").run();
  }

  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runApiTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});

