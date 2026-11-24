import { generateIcsFile, getGoogleCalendarUrl } from "../src/lib/reservations/calendar.ts";

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

async function runPhase3Tests() {
  console.log("\n=======================================================");
  console.log("   PHASE 3 — PUBLIC GUEST BOOKING & SELF-SERVICE QA    ");
  console.log("=======================================================\n");

  // 1. Calendar Generation (.ics and Google Calendar)
  console.log("--- 1. Calendar Generation (.ics RFC 5545 & Google Deep-link) ---");
  {
    const calParams = {
      reference: "RZ-TEST",
      restaurantName: "Dar Zitoun",
      restaurantAddress: "12 Rue de la Kasbah, Tunis",
      serviceDate: "2026-12-20",
      startMinute: 1200, // 20:00
      durationMinutes: 90,
      partySize: 4,
      notes: "Table en terrasse",
      manageUrl: "http://localhost:3000/fr/reserve/manage?token=xyz123",
    };

    const ics = generateIcsFile(calParams);
    assert(ics.includes("BEGIN:VCALENDAR"), "ICS contains BEGIN:VCALENDAR");
    assert(ics.includes("END:VCALENDAR"), "ICS contains END:VCALENDAR");
    assert(ics.includes("SUMMARY:Réservation Dar Zitoun (4 pers.) [RZ-TEST]"), "ICS contains formatted summary");
    assert(ics.includes("STATUS:CONFIRMED"), "ICS contains STATUS:CONFIRMED");
    assert(ics.includes("BEGIN:VALARM"), "ICS contains reminder alarm (VALARM)");

    const gUrl = getGoogleCalendarUrl(calParams);
    assert(gUrl.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE"), "Google Calendar URL has valid template action");
    assert(gUrl.includes("RZ-TEST"), "Google Calendar URL contains reference code");
  }

  // 2. HTTP Status of Public Reservation & Self-Service Pages
  console.log("\n--- 2. Public Reservation & Self-Service Route Availability ---");
  const routes = [
    { url: `${BASE_URL}/fr/reserve`, lang: "French" },
    { url: `${BASE_URL}/ar/reserve`, lang: "Arabic (RTL)" },
    { url: `${BASE_URL}/en/reserve`, lang: "English" },
    { url: `${BASE_URL}/fr/reserve/manage`, lang: "French Manage" },
    { url: `${BASE_URL}/ar/reserve/manage`, lang: "Arabic Manage" },
    { url: `${BASE_URL}/en/reserve/manage`, lang: "English Manage" },
  ];

  for (const r of routes) {
    const res = await fetch(r.url);
    assert(res.status === 200, `${r.lang} route (${r.url}) returns HTTP 200`);
    const html = await res.text();
    assert(html.includes("<!DOCTYPE html>"), `${r.lang} returns complete HTML document`);
    if (r.lang.includes("Arabic")) {
      assert(html.includes("dir=\"rtl\"") || html.includes("lang=\"ar\""), "Arabic page contains RTL attribute");
    }
  }

  // 3. Guest Flow End-to-End Simulation
  console.log("\n--- 3. Guest Flow End-to-End (Book -> Self-Service -> Reschedule -> Cancel) ---");
  {
    // Step A: Book
    const bookRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Leila Ben Salem",
        guestPhone: "+21655998877",
        guestEmail: "leila@phase3-test.com",
        serviceDate: "2026-12-18",
        startMinute: 750, // 12:30
        partySize: 2,
        occasion: "romantic",
        seatingPreference: "patio",
        locale: "fr",
      }),
    });
    const bookData = await bookRes.json();
    assert(bookRes.status === 200, "Guest successfully creates booking");
    assert(bookData.success === true, "Booking response success is true");
    const rawToken = bookData.rawManageToken;
    const ref = bookData.reservation.reference;
    assert(typeof rawToken === "string" && rawToken.length > 20, "Returns rawManageToken");

    // Step B: View on self-service page
    const manageRes = await fetch(`${BASE_URL}/api/reservations/manage?token=${rawToken}`);
    const manageData = await manageRes.json();
    assert(manageRes.status === 200, "Manage API returns reservation details");
    assert(manageData.reservation.reference === ref, "Retrieved reference matches");
    assert(manageData.permissions.canModify === true, "canModify is true");

    // Step C: Modify to 4 people at 13:00 (780 min)
    const patchRes = await fetch(`${BASE_URL}/api/reservations/manage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: rawToken,
        partySize: 4,
        startMinute: 780,
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, "Guest successfully reschedules via manage token");
    assert(patchData.reservation.partySize === 4, "Party size updated to 4");

    // Step D: Cancel booking
    const deleteRes = await fetch(`${BASE_URL}/api/reservations/manage`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: rawToken,
        reason: "Imprévu familial",
      }),
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, "Guest successfully cancels reservation");
    assert(deleteData.status === "cancelled", "Reservation status is now cancelled");

    // Clean up test reservation
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync("data/restaurant.sqlite");
    db.prepare("DELETE FROM reservations WHERE reference = ?").run(ref);
  }

  console.log("\n=======================================================");
  console.log(`PHASE 3 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((e) => {
  console.error("Phase 3 QA test fatal error:", e);
  process.exit(1);
});

