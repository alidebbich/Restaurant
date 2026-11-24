// scripts/test-reservations-browser-e2e.mjs
// Phase 8.3 — Browser E2E Test Suite for Restaurant Reservation System
// Tests guest booking, calendar links, self-service manage, admin floor operations,
// across Desktop (1280x800) and Mobile iPhone SE (375x667), in FR and AR RTL.

import { chromium } from "playwright";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

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

async function runBrowserQA() {
  console.log("\n=======================================================");
  console.log(`  PHASE 8.3 — PLAYWRIGHT BROWSER E2E QA (${BASE_URL}) `);
  console.log("=======================================================\n");

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "Desktop (1280x800)", width: 1280, height: 800, isMobile: false },
    { name: "Mobile iPhone SE (375x667)", width: 375, height: 667, isMobile: true },
  ];

  for (const vp of viewports) {
    console.log(`\n-------------------------------------------------------`);
    console.log(`--- Testing Viewport: ${vp.name} ---`);
    console.log(`-------------------------------------------------------`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (req) => {
      const err = req.failure()?.errorText || "";
      if (err !== "net::ERR_ABORTED") {
        failedRequests.push(`${req.url()} (${err})`);
      }
    });

    // ── TEST 1: Public Guest Booking Flow (French) ──────────────────────────
    console.log(`\n[${vp.name}] 1. Public Booking Flow (/fr/reserve)`);
    try {
      await page.goto(`${BASE_URL}/fr/reserve`, { waitUntil: "networkidle" });
      await page.waitForSelector("h1:has-text('Réserver une Table')", { timeout: 10000 });
      assert(true, `[${vp.name}] /fr/reserve loaded successfully`);

      // Step 1: Default party size 2 is preselected, click Continuer
      const nextToDateBtn = page.locator("#btn-step1-next");
      await nextToDateBtn.waitFor({ state: "visible", timeout: 8000 });
      await nextToDateBtn.click();
      await page.waitForTimeout(500);

      // Step 2: Date & Slot Picker
      await page.waitForSelector("#res-date", { timeout: 10000 });
      const targetDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      await page.fill("#res-date", targetDate);
      await page.dispatchEvent("#res-date", "change");

      // Wait for slots to load and pick the first available (not disabled) slot
      await page.waitForSelector("button:has-text(':'):not([disabled])", { timeout: 12000 });
      const firstSlotBtn = page.locator("button:has-text(':'):not([disabled])").first();
      await firstSlotBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await firstSlotBtn.click();
      await page.waitForTimeout(400);

      // Proceed to Step 3 (Details)
      const nextToDetailsBtn = page.locator("#btn-step2-next");
      await nextToDetailsBtn.waitFor({ state: "visible", timeout: 8000 });
      await nextToDetailsBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await nextToDetailsBtn.click();
      await page.waitForTimeout(600);

      // Step 3: Contact Details
      await page.waitForSelector("#res-name", { timeout: 10000 });
      await page.fill("#res-name", "Amira Ben Salem");
      const dynamicPhone = "98" + Math.floor(100000 + Math.random() * 900000);
      await page.fill("#res-phone", dynamicPhone);
      await page.fill("#res-email", `amira.${Date.now()}.${Math.floor(Math.random() * 1000)}@example.tn`);

      // Submit Reservation
      const submitBtn = page.locator("#btn-step3-submit");
      await submitBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await submitBtn.click();

      // Step 4: Confirmation Screen
      await page.waitForSelector(".font-mono:has-text('RZ-')", { timeout: 12000 });
      const refElement = page.locator(".font-mono:has-text('RZ-')").first();
      const refCode = (await refElement.textContent()) || "";
      assert(Boolean(refCode && refCode.includes("RZ-")), `[${vp.name}] Booking confirmed with reference code: ${refCode.trim()}`);

      // Verify Google Calendar link
      const gcalLink = page.locator("a[href*='calendar.google.com']");
      assert(await gcalLink.isVisible(), `[${vp.name}] Google Calendar integration link rendered`);

      // Verify WhatsApp confirmation link
      const whatsappLink = page.locator("a[href*='wa.me']");
      assert(await whatsappLink.isVisible(), `[${vp.name}] WhatsApp deep-link rendered`);

      // Verify Self-service manage link
      const manageLink = page.locator("a[href*='/reserve/manage']");
      assert(await manageLink.isVisible(), `[${vp.name}] Self-service manage link present`);

    } catch (err) {
      assert(false, `[${vp.name}] Public booking flow failed`, err.message);
    }

    // ── TEST 2: Arabic RTL Experience (/ar/reserve) ─────────────────────────
    console.log(`\n[${vp.name}] 2. Arabic RTL Experience (/ar/reserve)`);
    try {
      await page.goto(`${BASE_URL}/ar/reserve`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("section[dir='rtl']", { timeout: 8000 });

      const dirAttr = await page.locator("section[dir='rtl']").first().getAttribute("dir");
      assert(dirAttr === "rtl", `[${vp.name}] Arabic reserve page renders with dir="rtl"`);

      const heading = await page.locator("h1").first().textContent();
      assert(Boolean(heading && heading.length > 0), `[${vp.name}] Arabic heading rendered: "${heading?.trim()}"`);
    } catch (err) {
      assert(false, `[${vp.name}] Arabic RTL reserve test failed`, err.message);
    }

    // ── TEST 3: Admin Floor Operations (/admin/reservations) ─────────────────
    console.log(`\n[${vp.name}] 3. Admin Floor Operations Dashboard`);
    try {
      // Login
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
      await page.fill("#username", "admin");
      await page.fill("#password", "admin123");
      await page.click("button[type='submit']");
      await page.waitForURL("**/admin", { timeout: 10000 });

      // Navigate to reservations dashboard
      await page.goto(`${BASE_URL}/admin/reservations`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=Service & Réservations", { timeout: 8000 });
      assert(true, `[${vp.name}] Admin reservations dashboard loaded`);

      // Verify Shift & Date controls
      const todayBtn = page.locator("button:has-text('Aujourd')").first();
      assert(await todayBtn.isVisible(), `[${vp.name}] Shift date switcher (Aujourd'hui) visible`);

      // Verify Timeline view toggle
      const timelineToggle = page.locator("button:has-text('Chronologique')").first();
      if (await timelineToggle.isVisible()) {
        await timelineToggle.click();
        await page.waitForTimeout(400);
        assert(true, `[${vp.name}] Switched to Chronological Timeline view`);
      }

      // Verify Staff Fast Booking modal trigger
      const newBookingBtn = page.locator("button:has-text('Réservation Staff')").first();
      assert(await newBookingBtn.isVisible(), `[${vp.name}] Staff fast booking button visible`);

      // Open Fast Booking modal
      await newBookingBtn.click();
      await page.waitForSelector("text=Création Réservation Staff", { timeout: 6000 });
      assert(true, `[${vp.name}] Staff booking modal opened`);

      // Check Manager Capacity Override checkbox exists
      const overrideCheckbox = page.locator("input[type='checkbox']");
      assert(await overrideCheckbox.isVisible(), `[${vp.name}] Manager Capacity Override checkbox present`);

      // Close modal
      const cancelBtn = page.locator("button:has-text('Annuler')").first();
      await cancelBtn.click();
      await page.waitForTimeout(300);

      // Verify Printable Daily Sheet button
      const printBtn = page.locator("button:has-text('Imprimer')").first();
      assert(await printBtn.isVisible(), `[${vp.name}] Printable arrivals sheet action present`);

      // Verify CSV Export button
      const csvBtn = page.locator("button:has-text('Export CSV')").first();
      assert(await csvBtn.isVisible(), `[${vp.name}] CSV export action present`);

    } catch (err) {
      assert(false, `[${vp.name}] Admin floor operations test failed`, err.message);
    }

    // ── Console and Network Error Check ─────────────────────────────────────
    assert(
      consoleErrors.length === 0,
      `[${vp.name}] Zero browser console errors (found: ${consoleErrors.length})`,
      consoleErrors.join("; ")
    );
    assert(
      failedRequests.length === 0,
      `[${vp.name}] Zero failed network requests (found: ${failedRequests.length})`,
      failedRequests.join("; ")
    );

    await context.close();
  }

  await browser.close();

  console.log("\n=======================================================");
  console.log(`PLAYWRIGHT BROWSER E2E SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runBrowserQA().catch((err) => {
  console.error("Browser QA Suite crash:", err);
  process.exit(1);
});
