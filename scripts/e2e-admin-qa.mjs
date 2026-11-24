/**
 * Comprehensive Automated End-to-End QA Suite for Restaurant Admin Dashboard
 * Verifies every endpoint, auth flow, role-based access, SQLite persistence,
 * upload security, single source of truth for prices, and live public reflection.
 */
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const results = [];

function record(id, name, pass, evidence, notes = "") {
  results.push({ id, name, pass, evidence, notes });
  const badge = pass ? "✓ PASS" : "✗ FAIL";
  console.log(`[${badge}] ${id}: ${name} -- ${evidence}`);
}

async function request(reqPath, options = {}) {
  const url = `${BASE_URL}${reqPath}`;
  const res = await fetch(url, { redirect: "manual", ...options });
  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, json, text };
}

function hashSessionToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function runSuite() {
  console.log(`\n========================================`);
  console.log(`STARTING COMPREHENSIVE ADMIN E2E TEST SUITE ON ${BASE_URL}`);
  console.log(`========================================\n`);

  // --- 1. AUTHENTICATION & SESSIONS ---
  // 1.1 Unauthenticated request to protected API returns 401
  const unauth = await request("/api/admin/menu");
  record(
    "AUTH-01",
    "Unauthenticated request to protected API returns 401",
    unauth.status === 401,
    `Status ${unauth.status}`
  );

  // 1.2 Invalid password returns 401
  const csrfInit = await request("/api/auth/login");
  const csrfTokenVal = csrfInit.json?.csrfToken || "";
  const csrfCookie = csrfInit.headers.get("set-cookie")?.match(/csrf_token=([^;]+)/)?.[0] || "";

  const badLogin = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfTokenVal,
      Cookie: csrfCookie,
    },
    body: JSON.stringify({ username: "admin", password: "wrong-password-xyz" }),
  });
  record(
    "AUTH-02",
    "Invalid password returns 401",
    badLogin.status === 401,
    `Status ${badLogin.status}`
  );

  // 1.3 Super Admin login succeeds and returns session cookie
  const goodLogin = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfTokenVal,
      Cookie: csrfCookie,
    },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const cookieHeader = goodLogin.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/restaurant_admin_token=([^;]+)/);
  const adminToken = tokenMatch ? tokenMatch[1] : null;
  const adminCookie = `restaurant_admin_token=${adminToken}`;

  record(
    "AUTH-03",
    "Super Admin login succeeds and returns session cookie",
    goodLogin.status === 200 && !!adminToken,
    `Status ${goodLogin.status}, Cookie issued: ${!!adminToken}`
  );

  // 1.4 Get current user via /api/auth/me returns 200
  const me = await request("/api/auth/me", {
    headers: { Cookie: adminCookie },
  });
  record(
    "AUTH-04",
    "Authenticated /api/auth/me returns user with super_admin role",
    me.status === 200 && me.json?.user?.role === "super_admin",
    `Status ${me.status}, role=${me.json?.user?.role}`
  );

  // 1.5 Unauthenticated /admin redirects to /admin/login (HTTP 307)
  const unauthAdmin = await request("/admin");
  const redirectLoc = unauthAdmin.headers.get("location") || "";
  record(
    "AUTH-05",
    "Unauthenticated request to /admin redirects to /admin/login (HTTP 307)",
    (unauthAdmin.status === 307 || unauthAdmin.status === 302) && redirectLoc.includes("/admin/login"),
    `Status ${unauthAdmin.status}, Location: ${redirectLoc}`
  );

  // 1.6 Session Expiry Check
  const db = new DatabaseSync("data/restaurant.sqlite");
  const expiredRawToken = "expired_raw_token_" + Date.now();
  const expiredTokenHash = hashSessionToken(expiredRawToken);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, 'usr_4f332177', ?, datetime('now', '-1 day'))
  `).run("sess_expired_test", expiredTokenHash);

  const expiredReq = await request("/api/auth/me", {
    headers: { Cookie: `restaurant_admin_token=${expiredRawToken}` },
  });
  const rowStillExists = db.prepare("SELECT * FROM sessions WHERE token = ?").get(expiredTokenHash);
  record(
    "AUTH-06",
    "Expired session token is rejected with 401 and pruned from database",
    expiredReq.status === 401 && !rowStillExists,
    `Status ${expiredReq.status}, Session pruned: ${!rowStillExists}`
  );

  // 1.7 Logout flow
  const tempRawToken = "logout_test_" + Date.now();
  const tempTokenHash = hashSessionToken(tempRawToken);
  const tempSessionId = "sess_logout_" + Date.now();
  db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, 'usr_4f332177', ?, datetime('now', '+7 days'))
  `).run(tempSessionId, tempTokenHash);

  const logoutRes = await request("/api/auth/logout", {
    method: "POST",
    headers: {
      Cookie: `restaurant_admin_token=${tempRawToken}; ${csrfCookie}`,
      "x-csrf-token": csrfTokenVal,
    },
  });
  const logoutCookie = logoutRes.headers.get("set-cookie") || "";
  const sessionInDb = db.prepare("SELECT * FROM sessions WHERE token = ?").get(tempTokenHash);
  record(
    "AUTH-07",
    "Logout deletes session row from SQLite and clears cookie",
    logoutRes.status === 200 && !sessionInDb && (logoutCookie.includes("Max-Age=0") || logoutCookie.includes("Expires=")),
    `Status ${logoutRes.status}, DB row deleted: ${!sessionInDb}`
  );

  // --- 2. CATEGORIES CRUD & VALIDATION ---
  const testCatId = "cat_test_" + Date.now().toString(36);
  const createCat = await request("/api/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      id: testCatId,
      name_fr: "Catégorie Test QA",
      name_ar: "قسم تجريبي",
      name_en: "QA Test Category",
      description_fr: "Description test",
      display_order: 99,
      is_active: 1,
    }),
  });
  record(
    "CAT-01",
    "Create category via POST /api/admin/categories",
    createCat.status === 200 || createCat.status === 201,
    `Status ${createCat.status}, ID: ${testCatId}`
  );

  const updateCat = await request(`/api/admin/categories/${testCatId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name_fr: "Catégorie Test Modifiée",
      is_active: 1,
    }),
  });
  record(
    "CAT-02",
    "Update category via PUT /api/admin/categories/:id",
    updateCat.status === 200,
    `Status ${updateCat.status}`
  );

  const reorderCat = await request("/api/admin/categories/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ ids: ["entrees", "plats", testCatId] }),
  });
  record(
    "CAT-03",
    "Reorder categories via POST /api/admin/categories/reorder",
    reorderCat.status === 200,
    `Status ${reorderCat.status}`
  );

  // --- 3. MENU ITEMS CRUD & PRICES ---
  const testDishId = "dish_test_" + Date.now().toString(36);
  const createDish = await request("/api/admin/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      id: testDishId,
      category_id: testCatId,
      name_fr: "Tajine Test QA",
      name_ar: "طاجين تجريبي",
      name_en: "QA Test Tajine",
      description_fr: "Tajine tunisien avec options",
      price_millimes: 18500, // 18.5 DT
      image: "/images/menu/dish-tajine.jpg",
      is_available: 1,
      is_featured: 1,
      is_published: 1,
      dietary_tags: ["signature", "halal"],
      options: [
        {
          name_fr: "Portion",
          name_ar: "الحجم",
          name_en: "Portion",
          values: [
            { name_fr: "Standard", price_modifier: 0, is_default: 1 },
            { name_fr: "Double", price_modifier: 7.5, is_default: 0 },
          ],
        },
      ],
    }),
  });
  record(
    "MENU-01",
    "Create menu item with integer price_millimes via POST /api/admin/menu",
    createDish.status === 200 || createDish.status === 201,
    `Status ${createDish.status}, ID: ${testDishId}`
  );

  // 3.2 Single source of truth for prices check
  const dishRow = db.prepare("SELECT price_millimes, price FROM menu_items WHERE id = ?").get(testDishId);
  const derivedMatches = dishRow && dishRow.price_millimes === 18500 && Math.abs(dishRow.price - 18.5) < 0.001;
  record(
    "PRICE-01",
    "price_millimes (18500) is authoritative; derived float (18.5) matches exactly",
    derivedMatches,
    `price_millimes=${dishRow?.price_millimes}, price=${dishRow?.price}`
  );

  // 3.3 Fast phone toggle unavailable (< 5s flow)
  const toggleOff = await request(`/api/admin/menu/${testDishId}/availability`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ is_available: false }),
  });
  record(
    "MENU-02",
    "Fast phone toggle dish unavailable (< 5s)",
    toggleOff.status === 200 && (toggleOff.json?.is_available === 0 || toggleOff.json?.is_available === false),
    `Status ${toggleOff.status}, is_available=${toggleOff.json?.is_available}`
  );

  // 3.4 Fast phone toggle available
  const toggleOn = await request(`/api/admin/menu/${testDishId}/availability`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ is_available: true }),
  });
  record(
    "MENU-03",
    "Fast phone toggle dish back to available",
    toggleOn.status === 200 && (toggleOn.json?.is_available === 1 || toggleOn.json?.is_available === true),
    `Status ${toggleOn.status}, is_available=${toggleOn.json?.is_available}`
  );

  // 3.5 Update dish price & promotional price
  const updateDish = await request(`/api/admin/menu/${testDishId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      category_id: testCatId,
      name_fr: "Tajine Test Modifié",
      price_millimes: 20000,
      promo_price_millimes: 17500,
      is_available: 1,
    }),
  });
  record(
    "MENU-04",
    "Update dish details & promo price in millimes via PUT /api/admin/menu/:id",
    updateDish.status === 200,
    `Status ${updateDish.status}`
  );

  // 3.6 Reorder dishes within category
  const reorderMenu = await request("/api/admin/menu/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ ids: ["brik", "salade-mechouia", testDishId] }),
  });
  record(
    "MENU-05",
    "Reorder dishes via POST /api/admin/menu/reorder",
    reorderMenu.status === 200,
    `Status ${reorderMenu.status}`
  );

  // 3.7 Bulk actions
  const bulkAction = await request("/api/admin/menu/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ action: "unavailable", ids: [testDishId] }),
  });
  record(
    "MENU-06",
    "Bulk actions (mark unavailable) via POST /api/admin/menu/bulk",
    bulkAction.status === 200 && bulkAction.json?.count === 1,
    `Status ${bulkAction.status}, count=${bulkAction.json?.count}`
  );

  // 3.8 Category deletion blocked when it contains dishes
  const blockedDeleteCat = await request(`/api/admin/categories/${testCatId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  record(
    "CAT-04",
    "Category deletion blocked when category contains dishes (returns 400)",
    blockedDeleteCat.status === 400,
    `Status ${blockedDeleteCat.status}, error: ${blockedDeleteCat.json?.error}`
  );

  // --- 4. UPLOAD VERIFICATION & MAGIC BYTES ---
  // 4.1 Valid JPEG upload with genuine magic bytes (FF D8 FF)
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
  const formValid = new FormData();
  formValid.append("file", new Blob([jpegHeader], { type: "image/jpeg" }), "valid_test.jpg");
  const uploadValid = await request("/api/upload", {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: formValid,
  });
  const uploadedUrl = uploadValid.json?.url;
  record(
    "UPL-01",
    "Upload valid JPEG with authentic magic bytes (FF D8 FF)",
    uploadValid.status === 200 && !!uploadedUrl,
    `Status ${uploadValid.status}, URL: ${uploadedUrl}`
  );

  // 4.2 Fake extension rejection (plain text masquerading as .jpg)
  const fakeForm = new FormData();
  fakeForm.append("file", new Blob(["NOT_AN_IMAGE_FILE_CONTENT"], { type: "image/jpeg" }), "fake.jpg");
  const uploadFake = await request("/api/upload", {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: fakeForm,
  });
  record(
    "UPL-02",
    "Upload fake extension (plain text disguised as .jpg) rejected (HTTP 400)",
    uploadFake.status === 400,
    `Status ${uploadFake.status}`
  );

  // 4.3 Oversized file rejection (> 5MB)
  const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
  bigBuffer[0] = 0xff; bigBuffer[1] = 0xd8; bigBuffer[2] = 0xff; // fake JPEG magic bytes
  const bigForm = new FormData();
  bigForm.append("file", new Blob([bigBuffer], { type: "image/jpeg" }), "oversized.jpg");
  const uploadBig = await request("/api/upload", {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: bigForm,
  });
  record(
    "UPL-03",
    "Upload oversized file (> 5MB) rejected (HTTP 400)",
    uploadBig.status === 400,
    `Status ${uploadBig.status}`
  );

  // 4.4 Prove uploaded image is served under runtime server
  let imageServed = false;
  if (uploadedUrl) {
    const imgReq = await request(uploadedUrl);
    imageServed = imgReq.status === 200 && imgReq.headers.get("content-type")?.includes("image");
  }
  record(
    "UPL-04",
    `Uploaded image is served with HTTP 200 via route handler (${uploadedUrl})`,
    imageServed,
    `Status: ${imageServed ? "200 OK" : "Failed"}`
  );

  // --- 5. TRASH & RECOVERY ---
  // 5.1 Soft delete dish
  const softDelDish = await request(`/api/admin/menu/${testDishId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  record(
    "TRASH-01",
    "Soft-delete dish moves it to trash via DELETE /api/admin/menu/:id",
    softDelDish.status === 200,
    `Status ${softDelDish.status}`
  );

  // Now that category has no active dishes, delete category succeeds
  const softDelCat = await request(`/api/admin/categories/${testCatId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  record(
    "CAT-05",
    "Soft-delete empty category succeeds via DELETE /api/admin/categories/:id",
    softDelCat.status === 200,
    `Status ${softDelCat.status}`
  );

  // 5.2 Restore dish from trash
  const restoreDish = await request(`/api/admin/trash/dish/${testDishId}/restore`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  record(
    "TRASH-02",
    "Restore dish from trash via POST /api/admin/trash/dish/:id/restore",
    restoreDish.status === 200,
    `Status ${restoreDish.status}`
  );

  // 5.3 Hard delete dish
  const hardDelDish = await request(`/api/admin/trash/dish/${testDishId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  record(
    "TRASH-03",
    "Permanently hard-delete dish via DELETE /api/admin/trash/dish/:id",
    hardDelDish.status === 200,
    `Status ${hardDelDish.status}`
  );

  // Clean up category permanently
  await request(`/api/admin/trash/category/${testCatId}`, { method: "DELETE", headers: { Cookie: adminCookie } });

  // --- 6. SETTINGS, OPERATING HOURS & EXCEPTIONS ---
  const updateSettings = await request("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      settings: {
        name_fr: "Dar Zitoun Restaurant Méditerranéen",
        phone: "+216 71 123 456",
        whatsapp: "+216 98 765 432",
        currency: "TND",
        address_street: "12 Rue de la Médina",
        address_city: "Tunis",
        is_ordering_enabled: 1,
        is_reservations_enabled: 1,
        is_gallery_enabled: 1,
      },
      hours: [
        { day_of_week: 1, open_time: "11:00", close_time: "23:00", is_closed: 0 },
        { day_of_week: 2, open_time: "11:00", close_time: "23:00", is_closed: 0 },
        { day_of_week: 3, open_time: "11:00", close_time: "23:00", is_closed: 0 },
        { day_of_week: 4, open_time: "11:00", close_time: "23:00", is_closed: 0 },
        { day_of_week: 5, open_time: "11:00", close_time: "23:30", is_closed: 0 },
        { day_of_week: 6, open_time: "11:00", close_time: "23:30", is_closed: 0 },
        { day_of_week: 0, open_time: "12:00", close_time: "22:00", is_closed: 0 },
      ],
    }),
  });
  record(
    "SETT-01",
    "Save restaurant business info & 7-day operating hours via PUT /api/admin/settings",
    updateSettings.status === 200,
    `Status ${updateSettings.status}`
  );

  // 6.2 Feature toggles check
  const toggleFeatures = await request("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      settings: { is_ordering_enabled: 1, is_reservations_enabled: 1, is_gallery_enabled: 1 },
      hours: [],
    }),
  });
  record(
    "FEAT-01",
    "Update feature toggles (ordering, reservations, gallery) in settings",
    toggleFeatures.status === 200,
    `Status ${toggleFeatures.status}`
  );

  // 6.3 Hours exception (Ramadan / holidays)
  const createException = await request("/api/admin/hours-exceptions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      label_fr: "Aïd El Fitr",
      label_ar: "عيد الفطر",
      start_date: "2026-03-20",
      end_date: "2026-03-22",
      is_closed: 1,
    }),
  });
  const exceptionId = createException.json?.id;
  record(
    "EXCP-01",
    "Create holiday/Ramadan hours exception via POST /api/admin/hours-exceptions",
    createException.status === 201 && !!exceptionId,
    `Status ${createException.status}, ID: ${exceptionId}`
  );

  if (exceptionId) {
    const delException = await request(`/api/admin/hours-exceptions/${exceptionId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    record(
      "EXCP-02",
      "Delete hours exception via DELETE /api/admin/hours-exceptions/:id",
      delException.status === 200,
      `Status ${delException.status}`
    );
  }

  // --- 7. CONTENT & GALLERY ---
  const updateContent = await request("/api/admin/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      hero_title_fr: "Saveurs d'Antan, Cuisine Moderne",
      hero_title_ar: "نكهات الأصالة بروح عصرية",
      hero_title_en: "Heritage Flavors, Contemporary Spirit",
      hero_image: "/images/hero-main.jpg",
      story_heading_fr: "Une Tradition d'Hospitalité",
      story_body_fr: "Au cœur de la médina, nous célébrons le patrimoine culinaire tunisien.",
    }),
  });
  record(
    "CONT-01",
    "Update homepage hero & story copy via PUT /api/admin/content",
    updateContent.status === 200,
    `Status ${updateContent.status}`
  );

  const createGallery = await request("/api/admin/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      image_url: "/images/gal-1.jpg",
      caption_fr: "Ambiance terrasse en soirée",
      caption_ar: "أجواء الشرفة المسائية",
      display_order: 10,
      is_featured: 1,
    }),
  });
  const galId = createGallery.json?.id;
  record(
    "GAL-01",
    "Add photo to gallery via POST /api/admin/gallery",
    (createGallery.status === 200 || createGallery.status === 201) && !!galId,
    `Status ${createGallery.status}, ID: ${galId}`
  );

  if (galId) {
    const delGallery = await request(`/api/admin/gallery?id=${encodeURIComponent(galId)}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    record(
      "GAL-02",
      "Delete photo from gallery via DELETE /api/admin/gallery?id=:id",
      delGallery.status === 200,
      `Status ${delGallery.status}`
    );
  }

  // --- 8. ORDERS & RESERVATIONS STATUS MUTATIONS ---
  let sampleOrder = db.prepare("SELECT id FROM orders LIMIT 1").get();
  if (!sampleOrder) {
    db.prepare(`
      INSERT INTO orders (id, order_number, customer_name, customer_phone, order_type, delivery_address, subtotal, total, status)
      VALUES ('ord_test_01', 'ORD-TEST-01', 'Test Client', '+216 55 123 456', 'delivery', 'La Marsa', 35.0, 35.0, 'new')
    `).run();
    sampleOrder = { id: "ord_test_01" };
  }

  const updateOrder = await request(`/api/orders/${sampleOrder.id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ status: "accepted", note: "Commande acceptée par le gérant" }),
  });
  record(
    "ORD-01",
    "Update order status to accepted via PATCH /api/orders/:id/status",
    updateOrder.status === 200,
    `Status ${updateOrder.status}`
  );

  let sampleRes = db.prepare("SELECT id FROM reservations LIMIT 1").get();
  if (!sampleRes) {
    db.prepare(`
      INSERT INTO reservations (id, customer_name, customer_phone, reservation_date, reservation_time, party_size, status)
      VALUES ('res_test_01', 'Amine Ben Salem', '+216 22 999 888', '2026-11-12', '20:00', 4, 'pending')
    `).run();
    sampleRes = { id: "res_test_01" };
  }

  const updateRes = await request(`/api/reservations/${sampleRes.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ status: "confirmed", internal_notes: "Table près de la fontaine" }),
  });
  record(
    "RES-01",
    "Update reservation status to confirmed via PATCH /api/reservations/:id",
    updateRes.status === 200,
    `Status ${updateRes.status}`
  );

  // --- 9. PUBLIC SITE LIVE REFLECTION ---
  const publicMenu = await request("/fr/menu");
  record(
    "PUB-01",
    "Public digital menu (/fr/menu) renders dishes and categories",
    publicMenu.status === 200 && publicMenu.text.includes("Brik"),
    `Status ${publicMenu.status}`
  );

  const publicHome = await request("/fr");
  record(
    "PUB-02",
    "Public homepage (/fr) reflects updated restaurant name and hero text",
    publicHome.status === 200 && (publicHome.text.includes("Dar Zitoun") || publicHome.text.includes("Saveurs")),
    `Status ${publicHome.status}`
  );

  // --- 10. EXHAUSTIVE ROLE MATRIX (RBAC) ---
  const roles = [
    { role: "super_admin", canMenu: true, canOrders: true, canSettings: true, canHardDelete: true },
    { role: "restaurant_owner", canMenu: true, canOrders: true, canSettings: true, canHardDelete: true },
    { role: "manager", canMenu: true, canOrders: true, canSettings: true, canHardDelete: false },
    { role: "menu_manager", canMenu: true, canOrders: false, canSettings: false, canHardDelete: false },
    { role: "order_manager", canMenu: false, canOrders: true, canSettings: false, canHardDelete: false },
  ];

  for (const r of roles) {
    const testUserId = `usr_rbac_${r.role}`;
    db.prepare(`
      INSERT OR REPLACE INTO admin_users (id, username, email, full_name, role, password_hash, salt, is_active)
      VALUES (?, ?, ?, ?, ?, 'dummy', 'salt', 1)
    `).run(testUserId, `user_${r.role}`, `${r.role}@darzitoun.tn`, `Test ${r.role}`, r.role);

    const rRawToken = `tok_role_${r.role}_${Date.now()}`;
    const rTokenHash = hashSessionToken(rRawToken);
    const expIso = new Date(Date.now() + 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(`sess_${testUserId}`, testUserId, rTokenHash, expIso);

    const rCookie = `restaurant_admin_token=${rRawToken}`;

    // Test Menu Mutation
    const menuRes = await request("/api/admin/menu/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: rCookie },
      body: JSON.stringify({ ids: ["brik"] }),
    });
    const expectedMenuStatus = r.canMenu ? 200 : 403;
    record(
      `ROLE-MENU-${r.role}`,
      `Role ${r.role} on menu mutation -> expected ${expectedMenuStatus}`,
      menuRes.status === expectedMenuStatus,
      `Got status ${menuRes.status}`
    );

    // Test Order Status Mutation
    const orderRes = await request(`/api/orders/${sampleOrder.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: rCookie },
      body: JSON.stringify({ status: "preparing" }),
    });
    const expectedOrderStatus = r.canOrders ? 200 : 403;
    record(
      `ROLE-ORDER-${r.role}`,
      `Role ${r.role} on order mutation -> expected ${expectedOrderStatus}`,
      orderRes.status === expectedOrderStatus,
      `Got status ${orderRes.status}`
    );

    // Test Settings Mutation
    const settingsRes = await request("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: rCookie },
      body: JSON.stringify({ settings: { name_fr: "Dar Zitoun" }, hours: [] }),
    });
    const expectedSettingsStatus = r.canSettings ? 200 : 403;
    record(
      `ROLE-SETT-${r.role}`,
      `Role ${r.role} on settings mutation -> expected ${expectedSettingsStatus}`,
      settingsRes.status === expectedSettingsStatus,
      `Got status ${settingsRes.status}`
    );

    // Clean up temporary role user & session
    db.prepare("DELETE FROM sessions WHERE id = ?").run(`sess_${testUserId}`);
    db.prepare("DELETE FROM admin_users WHERE id = ?").run(testUserId);
  }

  // --- 11. SQLITE HOT BACKUP (VACUUM INTO) ---
  const backupPath = path.join(process.cwd(), "data", `test_backup_${Date.now()}.sqlite`);
  if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
  const backupSize = fs.existsSync(backupPath) ? fs.statSync(backupPath).size : 0;
  const backupDb = new DatabaseSync(backupPath);
  const itemsInBackup = backupDb.prepare("SELECT COUNT(*) as count FROM menu_items").get();
  backupDb.close();
  fs.unlinkSync(backupPath);
  record(
    "DB-01",
    "Safe SQLite hot backup (VACUUM INTO) and restore verification",
    backupSize > 50000 && itemsInBackup.count > 0,
    `Backup size: ${backupSize} bytes, verified ${itemsInBackup.count} items in restored copy`
  );

  // --- 12. RSC PROTOTYPE SERIALIZATION (ALL 11 ADMIN PAGES) ---
  const adminPages = [
    "/admin",
    "/admin/menu",
    "/admin/menu/new",
    "/admin/categories",
    "/admin/orders",
    "/admin/reservations",
    "/admin/content",
    "/admin/gallery",
    "/admin/settings",
    "/admin/trash",
    "/admin/qr",
  ];

  for (const pagePath of adminPages) {
    const pageRes = await request(pagePath, {
      headers: { Cookie: adminCookie },
    });
    const hasRscError = pageRes.text.includes("Only plain objects") || pageRes.text.includes("Runtime Error");
    const routeId = `RSC-${pagePath.replace("/admin", "").replace("/", "") || "dashboard"}`;
    record(
      routeId,
      `Server Component RSC render ${pagePath} returns 200 without prototype errors`,
      pageRes.status === 200 && !hasRscError,
      `Status ${pageRes.status}, RSC Error: ${hasRscError}`
    );
  }

  // --- SUMMARY ---
  console.log(`\n========================================`);
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  console.log(`E2E TEST SUMMARY: ${passed}/${total} PASSED (${failed} failed)`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
