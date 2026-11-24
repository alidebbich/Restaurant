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

async function runPhase4Tests() {
  console.log("\n=======================================================");
  console.log("   PHASE 4 — ADMIN OPERATIONS & FLOOR DASHBOARD QA     ");
  console.log("=======================================================\n");

  const db = new DatabaseSync("data/restaurant.sqlite");
  // Clean up test date for repeatable, isolated test run
  db.prepare("DELETE FROM reservations WHERE service_date = '2026-12-25'").run();

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
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, "Admin login succeeds with HTTP 200");
    assert(loginData.success === true, "Login returns success: true");

    const rawCookies = loginRes.headers.get("set-cookie") || "";
    const match = rawCookies.match(/restaurant_admin_token=([^;]+)/);
    assert(Boolean(match), "Session cookie 'restaurant_admin_token' received");
    sessionCookie = match ? match[0] : "";
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: sessionCookie,
  };

  // Clean up any test leftovers
  db.prepare("DELETE FROM reservations WHERE guest_name LIKE '%Farah Khemir%' OR guest_name LIKE '%No-Show Guest%' OR guest_name LIKE '%Amir Chahed%'").run();
  db.prepare("DELETE FROM waitlist WHERE customer_name LIKE '%Mohamed Dridi%'").run();

  // 2. Quick Actions on Bookings (Confirm, Seat, Complete, No-show, Decline)
  console.log("\n--- 2. Booking Quick Actions & Guest CRM Tracking ---");

  // Create a fresh test reservation
  let testResId = "";
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const testPhone = `+21650${randomSuffix}`;
  const noShowPhone = `+21651${randomSuffix}`;
  const walkinPhone = `+21652${randomSuffix}`;
  const waitlistPhone = `+21653${randomSuffix}`;
  {
    const createRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Farah Khemir",
        guestPhone: testPhone,
        serviceDate: "2026-12-25",
        startMinute: 720, // 12:00
        partySize: 3,
        source: "web",
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 200, "Created baseline reservation for status testing");
    testResId = createData.reservation.id;
  }

  // Action A: Confirmer
  {
    const res = await fetch(`${BASE_URL}/api/reservations/${testResId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "confirmed" }),
    });
    const data = await res.json();
    assert(res.status === 200, "Mark as 'confirmed' returns HTTP 200");
    assert(data.status === "confirmed", "Status updated to confirmed");

    const row = db.prepare("SELECT status, confirmed_at FROM reservations WHERE id = ?").get(testResId);
    assert(row.status === "confirmed" && Boolean(row.confirmed_at), "confirmed_at timestamp recorded in SQLite");
  }

  // Action B: Installer (Seat)
  {
    const res = await fetch(`${BASE_URL}/api/reservations/${testResId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "seated" }),
    });
    const data = await res.json();
    assert(res.status === 200, "Mark as 'seated' returns HTTP 200");
    assert(data.status === "seated", "Status updated to seated");

    const row = db.prepare("SELECT status, seated_at FROM reservations WHERE id = ?").get(testResId);
    assert(row.status === "seated" && Boolean(row.seated_at), "seated_at timestamp recorded in SQLite");

    // Check guest CRM total_visits incremented
    const guest = db.prepare("SELECT total_visits FROM guests WHERE phone = ?").get(testPhone);
    assert(guest.total_visits >= 1, "Guest total_visits counter incremented upon seating");
  }

  // Action C: Terminer (Complete)
  {
    const res = await fetch(`${BASE_URL}/api/reservations/${testResId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "completed" }),
    });
    const data = await res.json();
    assert(res.status === 200, "Mark as 'completed' returns HTTP 200");
    assert(data.status === "completed", "Status updated to completed");

    const row = db.prepare("SELECT status, completed_at FROM reservations WHERE id = ?").get(testResId);
    assert(row.status === "completed" && Boolean(row.completed_at), "completed_at timestamp recorded in SQLite");
  }

  // Action D: No-Show CRM counter
  {
    // Create another reservation to test no-show
    const res2 = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "No-Show Guest",
        guestPhone: noShowPhone,
        serviceDate: "2026-12-25",
        startMinute: 750,
        partySize: 2,
      }),
    });
    const d2 = await res2.json();
    const noShowId = d2.reservation.id;

    const res = await fetch(`${BASE_URL}/api/reservations/${noShowId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "no_show", reason: "Client ne s'est pas présenté après 30 min" }),
    });
    assert(res.status === 200, "Mark as 'no_show' returns HTTP 200");

    const guest = db.prepare("SELECT no_show_count FROM guests WHERE phone = ?").get(noShowPhone);
    assert(guest.no_show_count >= 1, "Guest no_show_count incremented in CRM");

    // Verify activity log
    const log = db.prepare("SELECT * FROM activity_logs WHERE entity_id = ? AND action = 'reservation_no_show'").get(noShowId);
    assert(Boolean(log), "Activity log recorded for no_show event");
  }

  // 3. Edit Details via Admin (PATCH details on an active booking)
  console.log("\n--- 3. Admin Edit Details (Time, Party Size, Notes) ---");
  {
    // Create an active reservation to edit
    const createModRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Nadia Bouazizi",
        guestPhone: `+21654${randomSuffix}`,
        serviceDate: "2026-12-25",
        startMinute: 720,
        partySize: 2,
      }),
    });
    const createModData = await createModRes.json();
    const modResId = createModData.reservation.id;

    const editRes = await fetch(`${BASE_URL}/api/reservations/${modResId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        partySize: 5,
        startMinute: 780, // 13:00
        guestNotes: "Table réservée près du patio (modifié staff)",
      }),
    });
    const editData = await editRes.json();
    assert(editRes.status === 200, "Admin edit details returns HTTP 200");
    assert(editData.reservation?.party_size === 5, "Party size updated to 5 in DB");
    assert(editData.reservation?.start_minute === 780, "Start minute updated to 780");
  }

  // 4. Staff Walk-in & Phone Fast Booking with Capacity Override
  console.log("\n--- 4. Staff Fast Entry with Manager Capacity Override ---");
  {
    // Fast creation with manager override
    const walkinRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        guestName: "Amir Chahed (VIP)",
        guestPhone: walkinPhone,
        serviceDate: "2026-12-25",
        startMinute: 1200,
        partySize: 6,
        source: "walk_in",
        capacityOverride: true,
        guestNotes: "[Dérogation staff: Ami du chef propriétaire]",
      }),
    });
    const walkinData = await walkinRes.json();
    assert(walkinRes.status === 200, "Staff walk-in with override returns HTTP 200");
    assert(walkinData.success === true, "Walk-in created successfully");
    assert(walkinData.reservation.status === "confirmed", "Override reservation is immediately confirmed");

    // Check status history recorded reason
    const hist = db.prepare("SELECT reason FROM reservation_status_history WHERE reservation_id = ?").get(walkinData.reservation.id);
    assert(hist?.reason?.includes("dérogation"), "History records capacity override reason");
  }

  // 5. Waitlist Lifecycle (Add -> View -> Notify -> Promote -> Delete)
  console.log("\n--- 5. Waitlist Lifecycle & One-Click Promotion ---");
  let waitlistId = "";
  {
    // 5.1 Add to Waitlist
    const addRes = await fetch(`${BASE_URL}/api/admin/waitlist`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        serviceDate: "2026-12-25",
        startMinute: 780,
        partySize: 4,
        customerName: "Mohamed Dridi",
        customerPhone: waitlistPhone,
        notes: "Prêt à patienter au patio",
      }),
    });
    const addData = await addRes.json();
    assert(addRes.status === 200, "Add to waitlist returns HTTP 200");
    assert(addData.entry?.customer_name === "Mohamed Dridi", "Waitlist entry name matches");
    assert(addData.entry?.status === "waiting", "Initial waitlist status is 'waiting'");
    waitlistId = addData.entry.id;

    // 5.2 View Waitlist
    const listRes = await fetch(`${BASE_URL}/api/admin/waitlist?date=2026-12-25`, {
      headers: authHeaders,
    });
    const listData = await listRes.json();
    assert(listRes.status === 200, "Fetch waitlist returns HTTP 200");
    const found = listData.waitlist.some((w) => w.id === waitlistId);
    assert(found, "Created waitlist entry is present in list response");

    // 5.3 Notify Client
    const notifyRes = await fetch(`${BASE_URL}/api/admin/waitlist/${waitlistId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "notified" }),
    });
    const notifyData = await notifyRes.json();
    assert(notifyRes.status === 200, "Mark waitlist client notified returns HTTP 200");
    assert(notifyData.status === "notified", "Status updated to notified");

    const wlRow = db.prepare("SELECT status, notified_at FROM waitlist WHERE id = ?").get(waitlistId);
    assert(wlRow.status === "notified" && Boolean(wlRow.notified_at), "notified_at timestamp recorded in SQLite");

    // 5.4 One-Click Promote to Confirmed Reservation
    const promoteRes = await fetch(`${BASE_URL}/api/admin/waitlist/${waitlistId}/promote`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ capacityOverride: true }),
    });
    const promoteData = await promoteRes.json();
    assert(promoteRes.status === 200, "Promote waitlist entry returns HTTP 200");
    assert(promoteData.success === true, "Promotion returns success: true");
    assert(Boolean(promoteData.reservation?.reference), "Promoted reservation has valid reference");

    const afterWlRow = db.prepare("SELECT status FROM waitlist WHERE id = ?").get(waitlistId);
    assert(afterWlRow.status === "seated", "Waitlist entry status updated to 'seated'");
  }

  // 6. Floor Dashboard Page HTTP 200 Render
  console.log("\n--- 6. Floor Dashboard Page Availability (/admin/reservations) ---");
  {
    const dashRes = await fetch(`${BASE_URL}/admin/reservations`, {
      headers: { Cookie: sessionCookie },
    });
    assert(dashRes.status === 200, "/admin/reservations renders HTTP 200 for authenticated staff");
    const html = await dashRes.text();
    assert(html.includes("Service &amp; Réservations") || html.includes("Service & Réservations"), "Page contains Service & Réservations title");
    assert(html.includes("Feuille de Service"), "Page contains printable service sheet layout");
  }

  console.log("\n=======================================================");
  console.log(`PHASE 4 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((e) => {
  console.error("Phase 4 QA test fatal error:", e);
  process.exit(1);
});
