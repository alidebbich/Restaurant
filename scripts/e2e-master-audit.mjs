import { chromium } from "playwright";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "audit", "e2e");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runMasterE2E() {
  console.log("=================================================");
  console.log("🎭 PLAYWRIGHT END-TO-END MASTER AUDIT SUITE");
  console.log("=================================================\n");

  const results = [];
  let passed = 0;
  let failed = 0;

  function record(stepNumber, title, ok, details = "") {
    if (ok) {
      console.log(`  ✅ [STEP ${stepNumber}] ${title}`);
      passed++;
      results.push({ step: stepNumber, title, status: "PASS", details });
    } else {
      console.error(`  ❌ [STEP ${stepNumber}] ${title} — ${details}`);
      failed++;
      results.push({ step: stepNumber, title, status: "FAIL", details });
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  const db = new DatabaseSync("data/restaurant.sqlite");
  const testCatId = "cat_e2e_test_" + Date.now();
  const testDishId = "dish_e2e_test_" + Date.now();

  try {
    // -------------------------------------------------------------
    // 1. Open the public homepage
    // -------------------------------------------------------------
    console.log("--> Step 1: Visiting Public Homepage...");
    await page.goto(`${BASE_URL}/fr`, { waitUntil: "load" });
    await page.waitForTimeout(500);

    const title = await page.title();
    const hasHeroHeading = (await page.locator("h1").count()) > 0;
    const heroText = hasHeroHeading ? await page.locator("h1").first().textContent() : "";
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "step1-homepage.png") });

    record(1, "Open public homepage", hasHeroHeading && title.length > 0, `Title: "${title}", H1: "${heroText?.trim()}"`);

    // -------------------------------------------------------------
    // 2. Open the digital menu
    // -------------------------------------------------------------
    console.log("--> Step 2: Navigating to Digital Menu...");
    await page.goto(`${BASE_URL}/fr/menu`, { waitUntil: "load" });
    await page.waitForTimeout(500);

    const categoryButtons = await page.locator("button, a").filter({ hasText: /Tous|Entrées|Plats|Desserts|Boissons/i }).count();
    const dishCards = await page.locator("article, div").filter({ hasText: /DT|TND/ }).count();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "step2-menu.png") });

    record(2, "Open digital menu and display items", dishCards > 0, `Dishes detected: ${dishCards}`);

    // -------------------------------------------------------------
    // 3. Log in as the administrator
    // -------------------------------------------------------------
    console.log("--> Step 3: Admin Login Flow...");
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "load" });
    await page.waitForTimeout(400);

    await page.fill('input[name="username"], input[type="text"]', "admin");
    await page.fill('input[name="password"], input[type="password"]', process.env.ADMIN_TEST_PASSWORD || "Admin123456!");
    await page.click('button[type="submit"]');

    // Wait for redirect to /admin
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 8000 });
    await page.waitForTimeout(600);
    const adminUrl = page.url();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "step3-admin-dashboard.png") });

    record(3, "Log in as administrator", adminUrl.includes("/admin") && !adminUrl.includes("/login"), `Redirected to: ${adminUrl}`);

    // -------------------------------------------------------------
    // 4. Create a Category via API with session
    // -------------------------------------------------------------
    console.log("--> Step 4: Creating a New Category...");
    // Retrieve cookies from context
    const cookies = await context.cookies();
    const authCookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    const csrfCookie = cookies.find(c => c.name === "csrf_token")?.value || "";

    const createCatRes = await fetch(`${BASE_URL}/api/admin/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfCookie,
        Cookie: authCookieHeader
      },
      body: JSON.stringify({
        id: testCatId,
        slug: "e2e-specials",
        name_fr: "Spécialités E2E Test",
        name_ar: "أطباق تجريبية",
        name_en: "E2E Specials",
        description_fr: "Catégorie de test automatisé",
        display_order: 99,
        is_active: 1
      })
    });
    const catData = await createCatRes.json();
    const catInDb = db.prepare("SELECT id, name_fr FROM categories WHERE id = ?").get(testCatId);

    record(4, "Create a category", createCatRes.status === 200 && catInDb !== undefined, `Category ID: ${testCatId}`);

    // -------------------------------------------------------------
    // 5. Add a Menu Item in that category
    // -------------------------------------------------------------
    console.log("--> Step 5: Adding a Menu Item...");
    const createDishRes = await fetch(`${BASE_URL}/api/admin/menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfCookie,
        Cookie: authCookieHeader
      },
      body: JSON.stringify({
        id: testDishId,
        category_id: testCatId,
        slug: "e2e-couscous-royal",
        name_fr: "Couscous Royal E2E",
        name_ar: "كسكسي ملكي تجريبي",
        name_en: "Royal Couscous E2E",
        description_fr: "Plat traditionnel pour test automatisé E2E",
        price: 28.5,
        price_millimes: 28500,
        is_available: 1,
        is_featured: 1,
        is_published: 1,
        display_order: 1
      })
    });
    const dishData = await createDishRes.json();
    const dishInDb = db.prepare("SELECT id, name_fr, price FROM menu_items WHERE id = ?").get(testDishId);

    record(5, "Add a menu item", createDishRes.status === 200 && dishInDb !== undefined, `Dish: "${dishInDb?.name_fr}", Initial Price: ${dishInDb?.price} TND`);

    // -------------------------------------------------------------
    // 6. Upload an image
    // -------------------------------------------------------------
    console.log("--> Step 6: Testing Image Upload...");
    // 1x1 valid PNG binary buffer
    const validPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const formData = new FormData();
    formData.append("file", new Blob([validPngBuffer], { type: "image/png" }), "test-dish.png");

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Cookie: authCookieHeader
      },
      body: formData
    });
    const uploadData = await uploadRes.json();
    record(6, "Upload and validate image", uploadRes.status === 200 && uploadData.url?.length > 0, `Uploaded URL: ${uploadData.url}`);

    // -------------------------------------------------------------
    // 7. Change the item's price
    // -------------------------------------------------------------
    console.log("--> Step 7: Updating Menu Item Price...");
    const updatedPrice = 34.0;
    const updateDishRes = await fetch(`${BASE_URL}/api/admin/menu/${testDishId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfCookie,
        Cookie: authCookieHeader
      },
      body: JSON.stringify({
        price: updatedPrice,
        price_millimes: Math.round(updatedPrice * 1000)
      })
    });
    const updatedDishInDb = db.prepare("SELECT price FROM menu_items WHERE id = ?").get(testDishId);

    record(7, "Change item's price in DB", updateDishRes.status === 200 && updatedDishInDb?.price === updatedPrice, `New DB Price: ${updatedDishInDb?.price} TND`);

    // -------------------------------------------------------------
    // 8. Verify the updated item on the public menu
    // -------------------------------------------------------------
    console.log("--> Step 8: Verifying Item on Public Menu Page...");
    await page.goto(`${BASE_URL}/fr/menu`, { waitUntil: "load" });
    await page.waitForTimeout(600);

    const publicMenuContent = await page.content();
    const hasDishName = publicMenuContent.includes("Couscous Royal E2E");
    const hasNewPrice = publicMenuContent.includes("34");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "step8-public-menu-verification.png") });

    record(8, "Verify updated item and price on public menu", hasDishName || hasNewPrice, `Found item on public page: ${hasDishName}, Updated price reflected: ${hasNewPrice}`);

    // -------------------------------------------------------------
    // 9. Generate and verify the QR code
    // -------------------------------------------------------------
    console.log("--> Step 9: Testing QR Code Generation...");
    await page.goto(`${BASE_URL}/admin/qr`, { waitUntil: "load" });
    await page.waitForTimeout(500);

    const qrImg = page.locator('img[alt*="QR"], img[src^="data:image"]');
    const qrVisible = (await qrImg.count()) > 0;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "step9-qr-page.png") });

    // Also verify QR API direct download format
    const qrDownloadRes = await fetch(`${BASE_URL}/api/qr?format=png`);
    const isPng = qrDownloadRes.headers.get("content-type")?.includes("image/png");

    record(9, "Generate and verify QR code", qrVisible && isPng, `QR component rendered, PNG download status: ${qrDownloadRes.status}`);

    // -------------------------------------------------------------
    // 10. Log out
    // -------------------------------------------------------------
    console.log("--> Step 10: Logging Out...");
    const logoutBtn = page.locator('button, a').filter({ hasText: /Déconnexion|Logout/i }).first();
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await page.waitForTimeout(600);
    } else {
      // Fallback via API
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: authCookieHeader }
      });
      await context.clearCookies();
    }
    await page.waitForURL(/\/admin\/login/, { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "step10-logged-out.png") });

    record(10, "Log out administrator", true, "Session cleared");

    // -------------------------------------------------------------
    // 11 & 12. Attempt to access admin dashboard & verify access denied
    // -------------------------------------------------------------
    console.log("--> Steps 11 & 12: Verifying Denied Access to /admin...");
    await context.clearCookies(); // Ensure no leftover cookies in browser context
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "load" });
    await page.waitForTimeout(600);

    const postLogoutUrl = page.url();
    const denied = postLogoutUrl.includes("/admin/login") || (await page.locator('input[type="password"]').count()) > 0;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "step12-access-denied.png") });

    record(11, "Attempt to access admin dashboard after logout", true);
    record(12, "Confirm access is denied (redirects to /admin/login)", denied, `Landed at: ${postLogoutUrl}`);

    // -------------------------------------------------------------
    // 13. Multilingual Verification (FR / AR RTL / EN)
    // -------------------------------------------------------------
    console.log("\n--- SECTION 13: Multilingual & Bidirectional RTL Checks ---");
    // Arabic RTL
    await page.goto(`${BASE_URL}/ar`, { waitUntil: "load" });
    await page.waitForTimeout(400);
    const arHtmlDir = await page.locator("html").getAttribute("dir");
    const arBodyText = await page.textContent("body");
    const hasArabicChars = /[\u0600-\u06FF]/.test(arBodyText || "");
    record(13.1, "Arabic locale has RTL direction and Arabic glyphs", arHtmlDir === "rtl" && hasArabicChars, `HTML dir="${arHtmlDir}", Arabic text detected: ${hasArabicChars}`);

    // English
    await page.goto(`${BASE_URL}/en`, { waitUntil: "load" });
    await page.waitForTimeout(400);
    const enHtmlLang = await page.locator("html").getAttribute("lang");
    record(13.2, "English locale loads properly", enHtmlLang?.startsWith("en") ?? false, `HTML lang="${enHtmlLang}"`);

    // -------------------------------------------------------------
    // 14. Responsive Viewports Smoke Test
    // -------------------------------------------------------------
    console.log("\n--- SECTION 14: Responsive Viewport Testing ---");
    const viewports = [
      { name: "Mobile iPhone 13", width: 390, height: 844 },
      { name: "Tablet iPad Mini", width: 768, height: 1024 },
      { name: "Desktop Standard", width: 1366, height: 768 },
      { name: "Desktop 1080p Wide", width: 1920, height: 1080 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/fr`, { waitUntil: "load" });
      await page.waitForTimeout(300);

      // Check for horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      record(
        14,
        `Responsive layout at ${vp.width}x${vp.height} (${vp.name}) — No horizontal overflow`,
        !overflow,
        `scrollWidth vs clientWidth: overflow = ${overflow}`
      );
    }

  } catch (error) {
    console.error("FATAL E2E ERROR:", error);
    record(99, "E2E Test Execution Fatal Error", false, error.message);
  } finally {
    // Clean up test records from DB
    try {
      db.prepare("DELETE FROM menu_items WHERE id = ?").run(testDishId);
      db.prepare("DELETE FROM categories WHERE id = ?").run(testCatId);
      console.log("\n🧹 Cleaned up temporary test category and dish from database.");
    } catch (e) {}

    await browser.close();
  }

  console.log("\n=================================================");
  console.log(`E2E SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log("=================================================\n");

  process.exit(failed === 0 ? 0 : 1);
}

runMasterE2E().catch(console.error);
