import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.resolve("docs/audit/phase4");

fs.mkdirSync(OUT_DIR, { recursive: true });

async function runVerification() {
  console.log("=== PHASE 4: FUNCTIONALITY, FORMS, APIS & RTL VERIFICATION ===");
  const results = {
    timestamp: new Date().toISOString(),
    apiTests: {},
    rtlTests: {},
    summary: { passed: 0, failed: 0 }
  };

  // 1. ADMIN LOGIN TEST WITH CSRF
  console.log("\n[1/5] Testing Admin Auth Login with CSRF...");
  let adminCookie = "";
  try {
    // Step 1a: Get CSRF token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/login`);
    const csrfData = await csrfRes.json();
    const csrfCookie = csrfRes.headers.get("set-cookie") || "";
    const csrfToken = csrfData.csrfToken;

    // Extract csrf_token cookie
    const csrfCookieMatch = csrfCookie.match(/csrf_token=([^;]+)/);
    const csrfCookieVal = csrfCookieMatch ? csrfCookieMatch[1] : "";

    // Step 1b: Post login credentials
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        Cookie: `csrf_token=${csrfCookieVal}`,
      },
      body: JSON.stringify({
        username: "admin",
        password: "Admin123456!",
        _csrf: csrfToken,
      }),
    });
    const setCookie = loginRes.headers.get("set-cookie") || "";
    const loginData = await loginRes.json();

    if (loginRes.ok && loginData.success) {
      const match = setCookie.match(/restaurant_admin_token=([^;]+)/);
      adminCookie = match ? match[1] : "";
      console.log("✓ Admin Login successful! Role:", loginData.user?.role);
      results.apiTests.adminLogin = { status: "PASS", user: loginData.user?.username, role: loginData.user?.role };
      results.summary.passed++;
    } else {
      throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginData)}`);
    }
  } catch (err) {
    console.error("✗ Admin Login failed:", err.message);
    results.apiTests.adminLogin = { status: "FAIL", error: err.message };
    results.summary.failed++;
  }

  // 2. CREATE RESERVATION TEST
  console.log("\n[2/5] Testing Reservation Creation API...");
  let manageToken = "";
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 8); // 8 days in the future
  const dateStr = targetDate.toISOString().split("T")[0];

  try {
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Nizar Trabelsi",
        guestPhone: "+216 98 765 432",
        guestEmail: "nizar.trabelsi@example.com",
        serviceDate: dateStr,
        reservation_time: "13:00",
        partySize: 2,
        specialRequests: "Table près de la fontaine s'il vous plaît",
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      manageToken = data.rawManageToken || "";
      console.log("✓ Reservation created! Ref:", data.reservation?.reference, "Token:", manageToken);
      results.apiTests.createReservation = {
        status: "PASS",
        reference: data.reservation?.reference,
        token: manageToken,
      };
      results.summary.passed++;
    } else {
      throw new Error(`Reservation failed status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.error("✗ Reservation creation failed:", err.message);
    results.apiTests.createReservation = { status: "FAIL", error: err.message };
    results.summary.failed++;
  }

  // 3. LOOKUP RESERVATION VIA MANAGE TOKEN
  console.log("\n[3/5] Testing Reservation Lookup via Manage Token...");
  if (manageToken) {
    try {
      const res = await fetch(`${BASE_URL}/api/reservations/manage?token=${manageToken}`);
      const data = await res.json();
      if (res.ok && data.success && data.reservation) {
        console.log("✓ Manage token lookup successful! Guest:", data.reservation.customer_name);
        results.apiTests.lookupReservation = {
          status: "PASS",
          customer: data.reservation.customer_name,
          date: data.reservation.service_date,
        };
        results.summary.passed++;
      } else {
        throw new Error(`Lookup failed status ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error("✗ Reservation lookup failed:", err.message);
      results.apiTests.lookupReservation = { status: "FAIL", error: err.message };
      results.summary.failed++;
    }
  } else {
    results.apiTests.lookupReservation = { status: "FAIL", error: "No manage token available" };
    results.summary.failed++;
  }

  // 4. CREATE ORDER TEST
  console.log("\n[4/5] Testing Order Creation API...");
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "Youssef Ben Salem",
        customer_phone: "+216 22 334 455",
        order_type: "takeaway",
        table_or_time: "20:00",
        notes: "Sauce harissa à part",
        items: [
          {
            dish_id: "couscous-agneau",
            name: "Couscous Agneau",
            price: 28,
            quantity: 2,
            selected_options: [],
          },
        ],
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log("✓ Order created successfully! Order #:", data.order?.order_number, "Total:", data.order?.total);
      results.apiTests.createOrder = {
        status: "PASS",
        orderNumber: data.order?.order_number,
        total: data.order?.total,
      };
      results.summary.passed++;
    } else {
      throw new Error(`Order failed status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.error("✗ Order creation failed:", err.message);
    results.apiTests.createOrder = { status: "FAIL", error: err.message };
    results.summary.failed++;
  }

  // 5. ADMIN DISH AVAILABILITY TOGGLE TEST
  console.log("\n[5/5] Testing Admin Dish Availability Toggle...");
  if (adminCookie) {
    try {
      // Toggle off
      const resToggleOff = await fetch(`${BASE_URL}/api/admin/menu/couscous-agneau/availability`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `restaurant_admin_token=${adminCookie}`,
        },
        body: JSON.stringify({ is_available: false }),
      });
      const dataOff = await resToggleOff.json();

      // Toggle back on
      const resToggleOn = await fetch(`${BASE_URL}/api/admin/menu/couscous-agneau/availability`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `restaurant_admin_token=${adminCookie}`,
        },
        body: JSON.stringify({ is_available: true }),
      });
      const dataOn = await resToggleOn.json();

      if (resToggleOff.ok && dataOff.success && resToggleOn.ok && dataOn.success) {
        console.log("✓ Dish availability toggle verified (Off -> On)!");
        results.apiTests.dishAvailability = { status: "PASS", dishId: "couscous-agneau" };
        results.summary.passed++;
      } else {
        throw new Error(`Toggle failed: ${JSON.stringify(dataOn)}`);
      }
    } catch (err) {
      console.error("✗ Dish availability toggle failed:", err.message);
      results.apiTests.dishAvailability = { status: "FAIL", error: err.message };
      results.summary.failed++;
    }
  } else {
    results.apiTests.dishAvailability = { status: "FAIL", error: "Admin login required" };
    results.summary.failed++;
  }

  // 6. PLAYWRIGHT RTL VERIFICATION
  console.log("\n[6/6] Testing Arabic RTL Layout with Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const rtlPages = [
    { name: "rtl-home", path: "/ar" },
    { name: "rtl-menu", path: "/ar/menu" },
    { name: "rtl-reserve", path: "/ar/reserve" },
  ];

  for (const p of rtlPages) {
    try {
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(600);

      const pageChecks = await page.evaluate(() => {
        const html = document.documentElement;
        const dir = html.getAttribute("dir") || window.getComputedStyle(html).direction;
        const lang = html.getAttribute("lang");
        const bodyDir = window.getComputedStyle(document.body).direction;
        const fontFamilies = window.getComputedStyle(document.body).fontFamily;
        return { dir, lang, bodyDir, fontFamilies };
      });

      const screenshotPath = path.join(OUT_DIR, `${p.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const isRtl = pageChecks.dir === "rtl" || pageChecks.bodyDir === "rtl";
      console.log(`✓ ${p.path} -> dir: ${pageChecks.dir}, lang: ${pageChecks.lang}, RTL verified: ${isRtl}`);

      results.rtlTests[p.name] = {
        status: isRtl ? "PASS" : "FAIL",
        path: p.path,
        checks: pageChecks,
        screenshot: screenshotPath,
      };
      if (isRtl) results.summary.passed++;
      else results.summary.failed++;
    } catch (err) {
      console.error(`✗ RTL check failed for ${p.path}:`, err.message);
      results.rtlTests[p.name] = { status: "FAIL", error: err.message };
      results.summary.failed++;
    }
  }

  await browser.close();

  // Save report
  fs.writeFileSync(path.join(OUT_DIR, "phase4-summary.json"), JSON.stringify(results, null, 2));
  console.log("\n=======================================================");
  console.log(`PHASE 4 COMPLETE: ${results.summary.passed} Passed, ${results.summary.failed} Failed`);
  console.log(`Report written to ${path.join(OUT_DIR, "phase4-summary.json")}`);
  console.log("=======================================================\n");
}

runVerification().catch(console.error);
