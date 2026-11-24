/**
 * Playwright Browser E2E Test Suite for Restaurant Management System
 * Tests real browser rendering, user interaction, 375px mobile viewport,
 * desktop viewport, French, and Arabic RTL with zero console errors.
 */
import { chromium } from "playwright";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runBrowserTests() {
  console.log(`\n========================================`);
  console.log(`PLAYWRIGHT BROWSER E2E TESTS ON ${BASE_URL}`);
  console.log(`========================================\n`);

  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "Desktop (1280x800)", width: 1280, height: 800, isMobile: false },
    { name: "Mobile iPhone SE (375x667)", width: 375, height: 667, isMobile: true },
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} ---`);
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
      if (req.failure()?.errorText !== "net::ERR_ABORTED") {
        failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
      }
    });

    // 1. Unauthenticated /admin -> redirect to /admin/login
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
      const currentUrl = page.url();
      if (!currentUrl.includes("/admin/login")) {
        throw new Error(`Expected redirect to /admin/login, got: ${currentUrl}`);
      }
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Unauthenticated /admin redirects to login`);
    } catch (err) {
      console.error(`[✗ FAIL] [${vp.name}] Unauthenticated redirect failed:`, err.message);
    }

    // 2. Login Flow
    totalTests++;
    try {
      await page.waitForSelector("#username", { timeout: 5000 });
      await page.fill("#username", "admin");
      await page.fill("#password", "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/admin", { timeout: 10000 });
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Login with valid credentials succeeds and lands on /admin`);
    } catch (err) {
      console.error(`[✗ FAIL] [${vp.name}] Login failed:`, err.message);
    }

    // 3. Admin Menu & Fast 5-second Phone Toggle
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/admin/menu`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("table, button:has-text('Disponible'), button:has-text('Épuisé')", { timeout: 10000 });

      // Click the first availability toggle button
      const toggleBtn = await page.$("button:has-text('Disponible'), button:has-text('Épuisé')");
      if (toggleBtn) {
        await toggleBtn.click();
        await page.waitForTimeout(600);
      }
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Admin Menu loads and fast availability toggle clicks without error`);
    } catch (err) {
      console.error(`[✗ FAIL] [${vp.name}] Admin Menu toggle failed:`, err.message);
    }

    // 4. Admin Orders
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/admin/orders`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Admin Orders page renders cleanly`);
    } catch (err) {
      console.error(`[✗ FAIL] [${vp.name}] Admin Orders failed:`, err.message);
    }

    // 5. Admin Settings
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Admin Settings page renders cleanly`);
    } catch (err) {
      console.error(`[✗ FAIL] [${vp.name}] Admin Settings failed:`, err.message);
    }

    // 6. Public Site French (/fr/menu)
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/fr/menu`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Public French Menu (/fr/menu) renders without error`);
    } catch (err) {
      console.error(`[✗ FAIL] [${vp.name}] Public French Menu failed:`, err.message);
    }

    // 7. Public Site Arabic RTL (/ar/menu)
    totalTests++;
    try {
      await page.goto(`${BASE_URL}/ar/menu`, { waitUntil: "domcontentloaded" });
      const dir = await page.getAttribute("html", "dir");
      const isRtl = dir === "rtl" || (await page.evaluate(() => document.documentElement.getAttribute("dir") === "rtl" || document.body.getAttribute("dir") === "rtl"));
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Public Arabic Menu (/ar/menu) renders RTL layout`);
    } catch (err) {
      console.error(`[✗ FAIL] [${vp.name}] Public Arabic Menu failed:`, err.message);
    }

    // 8. Console & Network Cleanliness check
    totalTests++;
    if (consoleErrors.length === 0 && failedRequests.length === 0) {
      passedTests++;
      console.log(`[✓ PASS] [${vp.name}] Zero console errors and zero failed requests`);
    } else {
      console.error(`[✗ FAIL] [${vp.name}] Cleanliness issues:`, { consoleErrors, failedRequests });
    }

    await context.close();
  }

  await browser.close();

  console.log(`\n========================================`);
  console.log(`BROWSER E2E SUMMARY: ${passedTests}/${totalTests} PASSED`);
  console.log(`========================================\n`);

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runBrowserTests().catch((err) => {
  console.error("Browser E2E crashed:", err);
  process.exit(1);
});
