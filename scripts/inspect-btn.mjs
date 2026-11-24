import { chromium } from "playwright";

async function check() {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Obtain login cookie directly
  const csrfRes = await fetch("http://localhost:3000/api/auth/login");
  const csrfData = await csrfRes.json();
  const csrfCookie = csrfRes.headers.get("set-cookie") || "";
  const csrfCookieVal = (csrfCookie.match(/csrf_token=([^;]+)/) || [])[1] || "";

  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfData.csrfToken,
      Cookie: `csrf_token=${csrfCookieVal}`,
    },
    body: JSON.stringify({
      username: "admin",
      password: "Admin123456!",
      _csrf: csrfData.csrfToken,
    }),
  });

  const setCookie = loginRes.headers.get("set-cookie") || "";
  const tokenMatch = setCookie.match(/restaurant_admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : "";

  await context.addCookies([
    {
      name: "restaurant_admin_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
  ]);

  const page = await context.newPage();
  await page.goto("http://localhost:3000/admin/orders", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, a")).filter(b => b.innerText && (b.innerText.includes("Imprimer") || b.innerText.includes("Export"))).map(b => {
      const s = window.getComputedStyle(b);
      return {
        text: b.innerText.trim(),
        color: s.color,
        backgroundColor: s.backgroundColor,
        className: b.className,
      };
    });
  });

  console.log("BUTTONS FOUND:", JSON.stringify(btns, null, 2));

  // Screenshot proof
  await page.screenshot({ path: "docs/audit/verified-buttons.png" });
  console.log("Saved screenshot to docs/audit/verified-buttons.png");

  await browser.close();
}

check().catch(console.error);
