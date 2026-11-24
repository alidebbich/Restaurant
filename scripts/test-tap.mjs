import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
await page.goto("http://localhost:3000/fr/reserve", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);

const btn = page.locator("button:has-text('Continuer')").first();
await btn.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await btn.click();
await page.waitForTimeout(1000);
console.log("#res-date visible after click?", await page.locator("#res-date").isVisible());

const targetDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
await page.fill("#res-date", targetDate);
await page.dispatchEvent("#res-date", "change");

await page.waitForSelector("button:has-text(':')", { timeout: 10000 });
console.log("Slot buttons found:", await page.locator("button:has-text(':')").count());

await browser.close();
