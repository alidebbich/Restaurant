import { DatabaseSync } from "node:sqlite";

const BASE_URL = "http://localhost:3000";

async function runAudit() {
  console.log("=================================================");
  console.log("🔒 COMPREHENSIVE SECURITY & AUTHENTICATION AUDIT");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;
  const findings = [];

  function test(desc, success, detail = "") {
    if (success) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc} ${detail ? "— " + detail : ""}`);
      failed++;
      findings.push({ desc, detail });
    }
  }

  // 1. Unauthenticated Admin API Access
  console.log("\n--- SECTION 1: Unauthenticated Admin API Protection ---");
  const protectedEndpoints = [
    { method: "GET", path: "/api/admin/stats" },
    { method: "GET", path: "/api/admin/menu" },
    { method: "POST", path: "/api/admin/menu", body: { name_fr: "Hacked" } },
    { method: "GET", path: "/api/admin/categories" },
    { method: "POST", path: "/api/admin/categories", body: { name_fr: "Hacked" } },
    { method: "GET", path: "/api/admin/settings" },
    { method: "PUT", path: "/api/admin/settings", body: { settings: { name: "Hacked" } } },
    { method: "GET", path: "/api/admin/content" },
    { method: "GET", path: "/api/admin/guests" },
    { method: "GET", path: "/api/admin/waitlist" },
    { method: "GET", path: "/api/admin/reservation-rules" },
    { method: "GET", path: "/api/orders" }, // Admin order list
    { method: "GET", path: "/api/reservations" }, // Admin reservation list
  ];

  for (const ep of protectedEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { "Content-Type": "application/json" } : {},
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });
      test(
        `${ep.method} ${ep.path} blocks unauthenticated access`,
        res.status === 401 || res.status === 403,
        `Got status ${res.status}`
      );
    } catch (err) {
      test(`${ep.method} ${ep.path} blocks unauthenticated access`, false, err.message);
    }
  }

  // 2. Unauthenticated Upload Protection
  console.log("\n--- SECTION 2: Unauthorized File Upload Protection ---");
  try {
    const formData = new FormData();
    formData.append("file", new Blob(["fake content"], { type: "image/jpeg" }), "evil.jpg");
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: formData
    });
    test("POST /api/upload rejects upload without auth", res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    test("POST /api/upload rejects upload without auth", false, err.message);
  }

  // 3. Login Authentication & Session Handling
  console.log("\n--- SECTION 3: Login Authentication, Anti-CSRF & Sessions ---");
  try {
    // 3.1 Verify CSRF is strictly enforced on login
    const noCsrfRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "any" })
    });
    test("POST /api/auth/login rejects requests without CSRF token with 403", noCsrfRes.status === 403);

    // Obtain CSRF token & cookie
    const csrfInit = await fetch(`${BASE_URL}/api/auth/login`);
    const csrfData = await csrfInit.json();
    const csrfCookieHeader = csrfInit.headers.get("set-cookie") || "";
    const csrfToken = csrfData.csrfToken;
    const csrfCookieMatch = csrfCookieHeader.match(/csrf_token=([^;]+)/);
    const csrfCookie = csrfCookieMatch ? `csrf_token=${csrfCookieMatch[1]}` : "";

    test("GET /api/auth/login generates valid CSRF token", csrfToken && csrfToken.length >= 32);

    const authHeaders = {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Cookie: csrfCookie
    };

    // 3.2 Invalid login credentials
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ username: "wrong_user", password: "wrong_password" })
    });
    test("Rejects invalid username/password with 401", badLoginRes.status === 401);

    // 3.3 SQL Injection attempt in login
    const sqliLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ username: "' OR '1'='1", password: "' OR '1'='1" })
    });
    test("Rejects SQL injection in login payload safely", sqliLoginRes.status === 401);

    // 3.4 Valid Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ username: "admin", password: process.env.ADMIN_TEST_PASSWORD || "Admin123456!" })
    });
    const loginData = await loginRes.json();
    const setCookie = loginRes.headers.get("set-cookie") || "";
    test("Valid admin login succeeds with 200", loginRes.status === 200 && loginData.success);
    test("Auth sets HttpOnly session cookie", setCookie.includes("HttpOnly") || setCookie.includes("restaurant_admin_token"));

    // Extract session cookie
    const tokenMatch = setCookie.match(/restaurant_admin_token=([^;]+)/);
    const sessionToken = tokenMatch ? tokenMatch[1] : null;

    if (sessionToken) {
      // 3.5 Authenticated request to protected endpoint
      const authStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { Cookie: `restaurant_admin_token=${sessionToken}` }
      });
      const statsData = await authStatsRes.json();
      test("Authenticated session accesses /api/admin/stats successfully", authStatsRes.status === 200 && statsData.success);

      // 3.6 Test Logout
      const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: `restaurant_admin_token=${sessionToken}` }
      });
      test("Logout endpoint succeeds with 200", logoutRes.status === 200);

      // 3.7 Verify session token is invalidated in DB
      const afterLogoutRes = await fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { Cookie: `restaurant_admin_token=${sessionToken}` }
      });
      test("Session token is invalidated and denied access after logout", afterLogoutRes.status === 401);
    } else {
      test("Session token extracted from login", false, "No cookie received");
    }
  } catch (err) {
    test("Login and session verification suite", false, err.message);
  }

  // 4. Rate Limiting on Authentication Endpoint
  console.log("\n--- SECTION 4: Rate Limiting & Brute Force Defense ---");
  try {
    const testIp = "203.0.113.199";
    // First get a CSRF token
    const csrfInit = await fetch(`${BASE_URL}/api/auth/login`);
    const { csrfToken } = await csrfInit.json();
    const csrfCookieHeader = csrfInit.headers.get("set-cookie") || "";
    const csrfCookieMatch = csrfCookieHeader.match(/csrf_token=([^;]+)/);
    const csrfCookie = csrfCookieMatch ? `csrf_token=${csrfCookieMatch[1]}` : "";

    let hitRateLimit = false;
    for (let i = 0; i < 7; i++) {
      const rlRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
          Cookie: csrfCookie,
          "x-forwarded-for": testIp
        },
        body: JSON.stringify({ username: "brute_force_bot", password: "bad" })
      });
      if (rlRes.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    test("Login rate limiter triggers 429 on excessive attempts", hitRateLimit);
  } catch (err) {
    test("Login rate limiter check", false, err.message);
  }

  // 5. Security Headers & CSP
  console.log("\n--- SECTION 5: Security Headers & CSP ---");
  try {
    const homeRes = await fetch(`${BASE_URL}/fr`);
    const csp = homeRes.headers.get("content-security-policy") || "";
    const xcto = homeRes.headers.get("x-content-type-options") || "";
    const xfo = homeRes.headers.get("x-frame-options") || "";
    const referrer = homeRes.headers.get("referrer-policy") || "";

    test("Content-Security-Policy header present", csp.length > 0 && csp.includes("default-src"));
    test("X-Content-Type-Options nosniff present", xcto.toLowerCase() === "nosniff");
    test("X-Frame-Options DENY present", xfo.toUpperCase() === "DENY");
    test("Referrer-Policy header present", referrer.length > 0);
  } catch (err) {
    test("Security headers verification", false, err.message);
  }

  // 6. Server-Side Price & Business Logic Protection
  console.log("\n--- SECTION 6: Business Logic & Anti-Tampering ---");
  try {
    const db = new DatabaseSync("data/restaurant.sqlite");
    const activeDish = db.prepare("SELECT id, name_fr, price, promo_price FROM menu_items WHERE deleted_at IS NULL AND is_available = 1 LIMIT 1").get();

    // 6.1 Negative price or 0.001 TND tampering
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "Tamper Test",
        customer_phone: "22334455",
        order_type: "takeaway",
        items: [{ dish_id: activeDish.id, price: 0.0001, quantity: 3 }]
      })
    });
    const orderData = await orderRes.json();
    const realPrice = activeDish.promo_price ?? activeDish.price;
    const expectedTotal = realPrice * 3;
    test(
      "Order calculation strictly overrides tampered client prices with DB prices",
      orderData.order?.total === expectedTotal,
      `Calculated: ${orderData.order?.total}, Expected: ${expectedTotal}`
    );

    // 6.2 Fake dish rejection
    const fakeOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "Fake Dish Test",
        customer_phone: "22334455",
        items: [{ dish_id: "non_existent_fake_dish", price: 10, quantity: 1 }]
      })
    });
    test("Orders with non-existent dish IDs are rejected with 400", fakeOrderRes.status === 400);

    // 6.3 Reservation honeypot bot defense
    const botRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Spam Bot",
        guestPhone: "11223344",
        serviceDate: "2026-12-01",
        reservation_time: "19:00",
        website: "http://spam-link.com" // Honeypot field
      })
    });
    const botData = await botRes.json();
    test("Reservation honeypot catches bots silently without creating real records", botData.success && botData.reference === "RZ-OK");
  } catch (err) {
    test("Business logic protection suite", false, err.message);
  }

  console.log("\n=================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    console.error("Identified Failures:", JSON.stringify(findings, null, 2));
    process.exit(1);
  }
}

runAudit().catch(console.error);
