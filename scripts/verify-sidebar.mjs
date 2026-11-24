import { chromium } from "playwright";

async function verifySidebar() {
  const browser = await chromium.launch();

  // Test 1: Desktop
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const csrfRes = await fetch("http://localhost:3000/api/auth/login");
    const csrfCookie = csrfRes.headers.get("set-cookie")?.match(/csrf_token=([^;]+)/)?.[0] || "";
    const { csrfToken } = await csrfRes.json();
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken, Cookie: csrfCookie },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    const sessionToken = loginRes.headers.get("set-cookie")?.match(/restaurant_admin_token=([^;]+)/)?.[1];

    await page.context().addCookies([
      { name: "restaurant_admin_token", value: sessionToken, domain: "localhost", path: "/" },
    ]);

    console.log("Mobile login status:", loginRes.status, "token:", !!sessionToken);
    await page.goto("http://localhost:3000/admin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    console.log("Mobile URL:", page.url());
    const sidebar = page.locator("#mobile-sidebar");
    console.log("--- DESKTOP (1440x900) ---");

    // Move mouse away to main content first so it's not starting inside sidebar at (0,0)
    await page.mouse.move(500, 500);
    await page.waitForTimeout(300);

    const initialBox = await sidebar.boundingBox();
    console.log("Initial resting rail boundingBox (should be 72px):", initialBox);

    // Verify toggle button in header is removed on desktop
    const headerToggle = page.locator("#btn-header-sidebar-toggle");
    console.log("Header toggle button exists/visible (should be false):", await headerToggle.isVisible());

    // Test hover expand
    console.log("Hovering cursor onto sidebar from (500, 500)...");
    await page.mouse.move(36, 300);
    await page.waitForTimeout(500);
    const hoverBox = await sidebar.boundingBox();
    console.log("After hover boundingBox (should be 264px):", hoverBox);

    // Test mouse leave collapse
    console.log("Moving cursor away from sidebar to main content...");
    await page.mouse.move(600, 400);
    await page.waitForTimeout(500);
    const leaveBox = await sidebar.boundingBox();
    console.log("After mouse leave boundingBox (should be 72px):", leaveBox);

    await page.close();
  }

  // Test 2: Mobile
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
    const csrfRes = await fetch("http://localhost:3000/api/auth/login");
    const csrfCookie = csrfRes.headers.get("set-cookie")?.match(/csrf_token=([^;]+)/)?.[0] || "";
    const { csrfToken } = await csrfRes.json();
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken, Cookie: csrfCookie },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    const sessionToken = loginRes.headers.get("set-cookie")?.match(/restaurant_admin_token=([^;]+)/)?.[1];

    await page.context().addCookies([
      { name: "restaurant_admin_token", value: sessionToken, domain: "localhost", path: "/" },
    ]);

    console.log("Mobile login status:", loginRes.status, "token:", !!sessionToken);
    await page.goto("http://localhost:3000/admin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    console.log("Mobile URL:", page.url());
    const sidebar = page.locator("#mobile-sidebar");
    console.log("\n--- MOBILE (375x667) ---");
    console.log("Initial class:", await sidebar.getAttribute("class"));
    console.log("Initial boundingBox:", await sidebar.boundingBox());

    const menuBtn = page.locator("button[aria-label='Ouvrir le menu']");
    console.log("Menu button isVisible:", await menuBtn.isVisible());
    await menuBtn.click();
    await page.waitForTimeout(500);
    console.log("After menu click class:", await sidebar.getAttribute("class"));
    console.log("After menu click boundingBox:", await sidebar.boundingBox());

    const closeBtn = page.locator("button[aria-label='Fermer la barre latérale']");
    console.log("Close button isVisible:", await closeBtn.isVisible());
    await closeBtn.click();
    await page.waitForTimeout(500);
    console.log("After close click boundingBox:", await sidebar.boundingBox());

    await page.close();
  }

  await browser.close();
}

verifySidebar().catch(console.error);
