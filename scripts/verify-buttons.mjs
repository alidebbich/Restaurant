/**
 * verify-buttons.mjs — Step 0 canary + before/after screenshots
 *
 * Run BEFORE migration (canary test) and AFTER to verify every button
 * shows the shared component styles.
 *
 * Usage:
 *   node scripts/verify-buttons.mjs [--canary] [--before] [--after]
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARTIFACTS = join(ROOT, "docs", "design");

const BASE_URL = "http://localhost:3000";
const CANARY_MODE = process.argv.includes("--canary");
const BEFORE = process.argv.includes("--before");
const AFTER = process.argv.includes("--after") || (!CANARY_MODE && !BEFORE);

const PAGES = [
  { name: "home-fr", url: "/fr" },
  { name: "menu-fr", url: "/fr/menu" },
  { name: "reserve-fr", url: "/fr/reserve" },
  { name: "home-ar", url: "/ar" },
  { name: "admin-login", url: "/admin/login" },
  { name: "admin", url: "/admin" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

async function run() {
  const prefix = BEFORE ? "before" : "after";
  const dir = join(ARTIFACTS, prefix);
  mkdirSync(dir, { recursive: true });

  console.log(`\n📸 Button Verification — ${prefix.toUpperCase()}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  
  if (CANARY_MODE) {
    // Inject canary CSS to make all buttons magenta outlines
    console.log("🔮 CANARY MODE: injecting magenta outline...");
    await context.addInitScript(() => {
      const style = document.createElement("style");
      style.id = "canary-style";
      style.textContent = `
        button, [role="button"], input[type="submit"], a[data-ui="Button"] {
          outline: 4px solid magenta !important;
          outline-offset: 2px !important;
        }
      `;
      document.head.appendChild(style);
    });
  }

  const measurements = [];

  for (const viewport of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const { name, url } of PAGES) {
      console.log(`  → ${name} @ ${viewport.name}`);
      
      try {
        await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle", timeout: 20000 });
        await page.waitForTimeout(800);

        const screenshotPath = join(dir, `${name}-${viewport.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`    ✅ ${screenshotPath}`);

        // Measure buttons
        const data = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('[data-ui="Button"]')).map((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return {
              text: el.textContent?.trim().slice(0, 40),
              variant: el.getAttribute("data-variant"),
              size: el.getAttribute("data-size"),
              height: Math.round(rect.height),
              borderRadius: style.borderRadius,
              backgroundColor: style.backgroundColor,
            };
          });
        });

        measurements.push({ page: name, viewport: viewport.name, url, buttons: data });
      } catch (e) {
        console.warn(`    ⚠ ${e.message}`);
      }
    }

    await page.close();
  }

  await browser.close();

  writeFileSync(
    join(ARTIFACTS, `measurements-${prefix}.json`),
    JSON.stringify(measurements, null, 2)
  );

  console.log(`\n✅ Screenshots saved to docs/design/${prefix}/`);
  console.log(`✅ Measurements saved to docs/design/measurements-${prefix}.json\n`);
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
