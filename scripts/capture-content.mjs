import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto("http://localhost:3000/admin/login");
  await page.fill('input[type="text"], input[name="username"]', "admin");
  await page.fill('input[type="password"], input[name="password"]', "Admin123456!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // 1. Desktop Tab 1: Hero
  await page.goto("http://localhost:3000/admin/content", { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "docs/audit/content-redesigned-hero.png" });
  console.log("Captured content-redesigned-hero.png");

  // 2. Desktop Tab 2: Story
  await page.click('button:has-text("2. Notre Histoire")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: "docs/audit/content-redesigned-story.png" });
  console.log("Captured content-redesigned-story.png");

  // 3. Desktop Tab 3: Live Preview
  await page.click('button:has-text("3. Aperçu en Direct")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: "docs/audit/content-redesigned-preview.png" });
  console.log("Captured content-redesigned-preview.png");

  // 4. Mobile Viewport (375x812)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.click('button:has-text("1. Bannière Hero")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: "docs/audit/content-redesigned-mobile.png" });
  console.log("Captured content-redesigned-mobile.png");

  await browser.close();
}

run().catch(console.error);
