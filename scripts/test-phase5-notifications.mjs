import { DatabaseSync } from "node:sqlite";
import {
  getNotificationMessage,
  WhatsAppLinkAdapter,
  dispatchNotification,
} from "../src/lib/reservations/notifications.ts";
import { getVenueLocalNow } from "../src/lib/reservations/time.ts";

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

async function runPhase5Tests() {
  console.log("\n=======================================================");
  console.log("   PHASE 5 — NOTIFICATIONS & AUTOMATED REMINDERS QA    ");
  console.log("=======================================================\n");

  const db = new DatabaseSync("data/restaurant.sqlite");

  const sampleRes = {
    id: "res_notif_test",
    reference: "RZ-NOTIF",
    service_date: "2026-12-30",
    start_minute: 1230,
    reservation_time: "20:30",
    party_size: 4,
    status: "confirmed",
    guest_name: "Salma Mansour",
    guest_phone: "+21698765432",
    locale: "fr",
  };

  // Clean up any previous test row
  db.prepare("DELETE FROM reservations WHERE id = 'res_notif_test'").run();
  db.prepare("DELETE FROM notification_log WHERE reservation_id = 'res_notif_test'").run();

  // Insert valid parent reservation row for foreign key integrity
  db.prepare(`
    INSERT INTO reservations (
      id, customer_name, customer_phone, reservation_date, reservation_time,
      service_date, start_minute, duration_minutes, party_size, status, reference
    ) VALUES (
      'res_notif_test', 'Salma Mansour', '+21698765432', '2026-12-30', '20:30',
      '2026-12-30', 1230, 90, 4, 'confirmed', 'RZ-NOTIF'
    )
  `).run();

  // 1. Template Text Generation (FR, AR, EN)
  console.log("--- 1. Notification Copy & Politeness (FR, AR, EN) ---");
  {
    // French Confirmed
    const frMsg = getNotificationMessage("confirmed", sampleRes, { manageUrl: "https://darzitoun.tn/fr/manage" });
    assert(frMsg.includes("Bonjour Salma Mansour"), "French template greets guest by name");
    assert(frMsg.includes("RZ-NOTIF"), "French template contains reference code");
    assert(frMsg.includes("20:30"), "French template contains time");
    assert(frMsg.includes("https://darzitoun.tn/fr/manage"), "French template contains manage URL");

    // Arabic Confirmed
    const arRes = { ...sampleRes, locale: "ar", guest_name: "سلمى منصور" };
    const arMsg = getNotificationMessage("confirmed", arRes, { manageUrl: "https://darzitoun.tn/ar/manage" });
    assert(arMsg.includes("سلمى منصور"), "Arabic template contains Arabic guest name");
    assert(arMsg.includes("تم تأكيد حجزك"), "Arabic template contains confirmation verb");

    // English 2h Reminder
    const enRes = { ...sampleRes, locale: "en", guest_name: "Sarah Miller" };
    const enMsg = getNotificationMessage("reminder_2h", enRes);
    assert(enMsg.includes("Reminder:"), "English template contains Reminder prefix");
    assert(enMsg.includes("20:30"), "English reminder contains time");
  }

  // 2. Adapter Dispatch & Logging
  console.log("\n--- 2. Adapter Dispatch & SQLite notification_log Audit ---");
  {
    const adapter = new WhatsAppLinkAdapter();
    const result = await adapter.sendEvent("reminder_2h", sampleRes);
    assert(result.success === true, "Adapter returns success: true");
    assert(result.channel === "whatsapp_link", "Channel is whatsapp_link");
    assert(result.recipient === "+21698765432", "Recipient phone formatted");

    // Clean up test notif log rows
    db.prepare("DELETE FROM notification_log WHERE reservation_id = 'res_notif_test'").run();

    // Dispatch via dispatcher (writes to SQLite log)
    const dispRes = await dispatchNotification("reminder_2h", sampleRes, { db });
    assert(dispRes.success === true, "Dispatcher returns success: true");

    const logRow = db.prepare("SELECT * FROM notification_log WHERE reservation_id = 'res_notif_test'").get();
    assert(Boolean(logRow), "Log entry successfully persisted in notification_log table");
    assert(logRow.template === "reminder_2h", "Template column logged correctly");
    assert(logRow.status === "sent", "Status recorded as 'sent'");
  }

  // 3. Automated Reminder Cron Endpoint (/api/cron/reminders)
  console.log("\n--- 3. Automated Reminder Endpoint (/api/cron/reminders) ---");
  {
    // 3.1 Unauthorized without Bearer token
    const unauthRes = await fetch(`${BASE_URL}/api/cron/reminders`);
    assert(unauthRes.status === 401, "Calling cron without token returns HTTP 401");
    const unauthData = await unauthRes.json();
    assert(unauthData.code === "UNAUTHORIZED", "Returns code UNAUTHORIZED");

    // 3.2 Authorized with valid Bearer token
    const authHeaders = {
      Authorization: "Bearer darzitoun_cron_secret_default",
    };

    // Prepare a confirmed reservation today in the 90-150 min window
    const venueNow = getVenueLocalNow("Africa/Tunis");
    const today = venueNow.date;
    const targetSlot = venueNow.minute + 120; // exactly 2 hours ahead

    const cronTestId = "res_cron_due_test";
    db.prepare("DELETE FROM reservations WHERE id = ?").run(cronTestId);
    db.prepare("DELETE FROM notification_log WHERE reservation_id = ?").run(cronTestId);

    db.prepare(`
      INSERT INTO reservations (
        id, customer_name, customer_phone, reservation_date, reservation_time,
        service_date, start_minute, duration_minutes, party_size, status, reference, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 90, 2, 'confirmed', 'RZ-CRON', 'idem_cron_test')
    `).run(
      cronTestId,
      "Tarek Cron Guest",
      "+21620998877",
      today,
      "14:00",
      today,
      targetSlot
    );

    // Run Cron - First Time (Must send 1 reminder)
    const run1Res = await fetch(`${BASE_URL}/api/cron/reminders`, { headers: authHeaders });
    const run1Data = await run1Res.json();
    assert(run1Res.status === 200, "Authorized cron returns HTTP 200");
    assert(run1Data.sent >= 1, `Cron sent reminder for due booking (sent: ${run1Data.sent})`);

    // Run Cron - Second Time (Must skip due to deduplication log)
    const run2Res = await fetch(`${BASE_URL}/api/cron/reminders`, { headers: authHeaders });
    const run2Data = await run2Res.json();
    assert(run2Res.status === 200, "Second cron run returns HTTP 200");
    assert(run2Data.skipped >= 1, `Second cron run skips already sent reminder (skipped: ${run2Data.skipped})`);

    // Clean up
    db.prepare("DELETE FROM reservations WHERE id = ?").run(cronTestId);
    db.prepare("DELETE FROM notification_log WHERE reservation_id = ?").run(cronTestId);
    db.prepare("DELETE FROM notification_log WHERE reservation_id = 'res_notif_test'").run();
    db.prepare("DELETE FROM reservations WHERE id = 'res_notif_test'").run();
  }

  console.log("\n=======================================================");
  console.log(`PHASE 5 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((e) => {
  console.error("Phase 5 QA test fatal error:", e);
  process.exit(1);
});
