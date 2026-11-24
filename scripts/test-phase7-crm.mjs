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

async function runPhase7Tests() {
  console.log("\n=======================================================");
  console.log("   PHASE 7 — GUESTS CRM & PRIVACY RETENTION QA        ");
  console.log("=======================================================\n");

  const db = new DatabaseSync("data/restaurant.sqlite");
  // Clean up previous test date/guest leftovers for complete idempotency
  db.prepare("DELETE FROM reservations WHERE service_date = '2026-12-28'").run();
  db.prepare("DELETE FROM guests WHERE phone LIKE '+21620%'").run();

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

  // 2. Guests CRM Endpoints (List, Search, Profile, Tags)
  console.log("\n--- 2. Guests CRM Endpoints ---");
  let guestId = "";
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const testPhone = `+21620${randomSuffix}`;

  // Seed a guest profile
  {
    const seedRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Khadija Trabelsi",
        guestPhone: testPhone,
        guestEmail: "khadija@crm-test.com",
        serviceDate: "2026-12-28",
        startMinute: 780,
        partySize: 2,
      }),
    });
    assert(seedRes.status === 200, "Created baseline reservation for guest profile testing");
  }

  // 2.1 GET /api/admin/guests (unauth vs auth)
  {
    const unauth = await fetch(`${BASE_URL}/api/admin/guests`);
    assert(unauth.status === 401, "Unauthenticated GET /api/admin/guests returns HTTP 401");

    const res = await fetch(`${BASE_URL}/api/admin/guests`, { headers: authHeaders });
    const data = await res.json();
    assert(res.status === 200, "Authenticated GET /api/admin/guests returns HTTP 200");
    assert(Array.isArray(data.guests), "Returns guests array");
  }

  // 2.2 Search guests by phone or name
  {
    const searchRes = await fetch(`${BASE_URL}/api/admin/guests?search=${testPhone}`, { headers: authHeaders });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, "Search guests returns HTTP 200");
    const found = searchData.guests.find((g) => g.phone === testPhone);
    assert(Boolean(found), "Search found guest by phone");
    guestId = found?.id || "";
  }

  // 2.3 GET /api/admin/guests/[id] (Profile & Past History)
  {
    const profileRes = await fetch(`${BASE_URL}/api/admin/guests/${guestId}`, { headers: authHeaders });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200, "GET guest profile returns HTTP 200");
    assert(profileData.guest?.name === "Khadija Trabelsi", "Guest name matches");
    assert(Array.isArray(profileData.guest?.reservations), "Guest profile includes past reservations array");
    assert(profileData.guest?.reservations.length >= 1, "Past reservations include created booking");
  }

  // 2.4 PATCH /api/admin/guests/[id] (Add VIP Tag & Staff Notes)
  {
    const patchRes = await fetch(`${BASE_URL}/api/admin/guests/${guestId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        tags: ["VIP", "Regular", "Patio_Lover"],
        notes: "Cliente fidèle, préfère le thé à la menthe sans sucre et table au patio.",
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, "PATCH guest tags/notes returns HTTP 200");
    assert(patchData.guest?.tags?.includes("VIP"), "Guest tags include VIP");

    // Check DB persistence
    const dbRow = db.prepare("SELECT notes, tags FROM guests WHERE id = ?").get(guestId);
    assert(dbRow.tags.includes("VIP") && dbRow.notes.includes("Cliente fidèle"), "Guest updates persisted in SQLite guests table");
  }

  // 3. Privacy Retention & Anonymization Job (/api/cron/anonymize)
  console.log("\n--- 3. Privacy Retention & PII Anonymization Job ---");
  {
    // 3.1 Unauth check
    const unauth = await fetch(`${BASE_URL}/api/cron/anonymize`);
    assert(unauth.status === 401, "Unauthenticated cron call rejected with HTTP 401");

    // 3.2 Prepare old test reservation (3 years ago) with full PII
    const oldResId = "res_retention_old_test";
    db.prepare("DELETE FROM reservations WHERE id = ?").run(oldResId);

    db.prepare(`
      INSERT INTO reservations (
        id, customer_name, customer_phone, reservation_date, reservation_time,
        service_date, start_minute, duration_minutes, party_size, status, reference,
        guest_name, guest_phone, guest_email, guest_notes, notes, manage_token_hash
      ) VALUES (
        ?, 'Mongi Ben Ali', '+21698112233', '2023-01-15', '13:00',
        '2023-01-15', 780, 90, 4, 'completed', 'RZ-OLD1',
        'Mongi Ben Ali', '+21698112233', 'mongi@old.tn', 'Allergique aux fruits de mer', 'Allergique aux fruits de mer', 'hash_secret'
      )
    `).run(oldResId);

    // Call Anonymization Cron with Bearer token (retention 730 days)
    const cronRes = await fetch(`${BASE_URL}/api/cron/anonymize?days=730`, {
      headers: {
        Authorization: "Bearer darzitoun_cron_secret_default",
      },
    });
    const cronData = await cronRes.json();
    assert(cronRes.status === 200, "Authorized anonymization cron returns HTTP 200");
    assert(cronData.anonymized >= 1, `Job anonymized old reservations (count: ${cronData.anonymized})`);

    // Verify SQLite row has PII sanitized
    const anonymizedRow = db.prepare("SELECT * FROM reservations WHERE id = ?").get(oldResId);
    assert(anonymizedRow.guest_name === "Client Anonyme", "guest_name masked to 'Client Anonyme'");
    assert(anonymizedRow.customer_name === "Client Anonyme", "customer_name masked to 'Client Anonyme'");
    assert(anonymizedRow.guest_phone === "+216****33", `guest_phone masked (+216****33, got ${anonymizedRow.guest_phone})`);
    assert(anonymizedRow.guest_email === null, "guest_email scrubbed to NULL");
    assert(anonymizedRow.guest_notes === null, "guest_notes scrubbed to NULL");
    assert(anonymizedRow.notes === null, "legacy notes scrubbed to NULL");
    assert(anonymizedRow.manage_token_hash === null, "manage_token_hash scrubbed to NULL");

    // Verify statistical data is preserved
    assert(anonymizedRow.party_size === 4, "Operational party_size 4 preserved for reporting");
    assert(anonymizedRow.service_date === "2023-01-15", "Operational service_date preserved");
    assert(anonymizedRow.status === "completed", "Operational status completed preserved");

    // Check activity log
    const logRow = db.prepare("SELECT * FROM activity_logs WHERE entity_type = 'privacy' ORDER BY id DESC LIMIT 1").get();
    assert(Boolean(logRow), "Data retention activity log recorded");

    // Clean up
    db.prepare("DELETE FROM reservations WHERE id = ?").run(oldResId);
  }

  console.log("\n=======================================================");
  console.log(`PHASE 7 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((e) => {
  console.error("Phase 7 QA test fatal error:", e);
  process.exit(1);
});

