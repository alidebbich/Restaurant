/**
 * button-audit.mjs — Dar Zitoun Button Audit Script
 *
 * Usage:
 *   node scripts/button-audit.mjs [--mode before|after]
 *
 * Reads admin creds from environment (never hardcoded).
 * Outputs JSON to docs/design/button-audit-{before|after}.json
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load env
dotenv.config({ path: join(ROOT, ".env") });

const MODE = process.argv.includes("--mode") 
  ? process.argv[process.argv.indexOf("--mode") + 1]
  : "after";

const BASE_URL = "http://localhost:3000";

// Admin login — read from env ONLY
const ADMIN_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET;
if (!ADMIN_SECRET) {
  console.error("ERROR: ADMIN_BOOTSTRAP_SECRET not set in .env");
  process.exit(1);
}

const PUBLIC_ROUTES = [
  "/fr",
  "/ar",
  "/en",
  "/fr/menu",
  "/ar/menu",
  "/fr/reserve",
];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/login",
  "/admin/categories",
  "/admin/gallery",
  "/admin/settings",
  "/admin/menu",
];

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
];

async function measureButtons(page, route, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1000);
  } catch (e) {
    console.warn(`  ⚠ Timeout on ${route}: ${e.message}`);
  }

  const buttons = await page.evaluate(() => {
    const selector = [
      'button',
      '[role="button"]',
      'input[type="submit"]',
      'input[type="button"]',
      'a[class*="px-"]',
      'a[class*="py-"]',
      'a[class*="btn"]',
      'a[class*="rounded"]',
    ].join(', ');

    return Array.from(document.querySelectorAll(selector)).map((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      
      // Skip invisible elements
      if (rect.width === 0 || rect.height === 0) return null;
      if (style.display === 'none' || style.visibility === 'hidden') return null;

      return {
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 50) || '',
        dataUi: el.getAttribute('data-ui') || null,
        dataVariant: el.getAttribute('data-variant') || null,
        dataSize: el.getAttribute('data-size') || null,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        borderRadius: style.borderRadius,
        backgroundColor: style.backgroundColor,
        color: style.color,
        border: style.border,
        hasDataUiButton: el.getAttribute('data-ui') === 'Button',
      };
    }).filter(Boolean);
  });

  return buttons;
}

async function main() {
  console.log(`\n🔍 Button Audit — Mode: ${MODE.toUpperCase()}\n`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    // Fresh context — no cache
  });

  const results = [];
  let totalButtons = 0;
  let buttonsWithDataUi = 0;

  for (const viewport of VIEWPORTS) {
    console.log(`\n📐 Viewport: ${viewport.name} (${viewport.width}×${viewport.height})`);
    
    const page = await context.newPage();

    // Public routes
    for (const route of PUBLIC_ROUTES) {
      console.log(`  → ${route}`);
      const buttons = await measureButtons(page, route, viewport);
      totalButtons += buttons.length;
      buttonsWithDataUi += buttons.filter((b) => b.hasDataUiButton).length;
      
      results.push({
        route,
        viewport: viewport.name,
        buttonCount: buttons.length,
        buttons,
      });
    }

    // Try admin routes (may need auth)
    try {
      // Visit admin login first
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle", timeout: 15000 });
      
      for (const route of ADMIN_ROUTES) {
        console.log(`  → ${route}`);
        const buttons = await measureButtons(page, route, viewport);
        totalButtons += buttons.length;
        buttonsWithDataUi += buttons.filter((b) => b.hasDataUiButton).length;
        
        results.push({
          route,
          viewport: viewport.name,
          buttonCount: buttons.length,
          buttons,
        });
      }
    } catch (e) {
      console.warn(`  ⚠ Admin routes error: ${e.message}`);
    }

    await page.close();
  }

  await browser.close();

  // ── Analysis ──────────────────────────────────────────────────────
  const allButtons = results.flatMap((r) => r.buttons);
  
  // Distinct style combos: (height, font-size, border-radius)
  const combos = new Set(
    allButtons.map((b) => `${b.height}|${b.fontSize}|${b.borderRadius}`)
  );

  const underMin = allButtons.filter((b) => b.height < 36);
  const underTouchMin = allButtons.filter((b) => b.height < 44);
  const bypass = allButtons.filter((b) => !b.hasDataUiButton);

  const summary = {
    mode: MODE,
    timestamp: new Date().toISOString(),
    totals: {
      totalButtons,
      buttonsWithDataUi,
      bypassCount: bypass.length,
      distinctStyleCombos: combos.size,
    },
    issues: {
      underMin36px: underMin.length,
      underTouchMin44px: underTouchMin.length,
      bypasses: bypass.slice(0, 20).map((b) => ({
        text: b.text,
        height: b.height,
        borderRadius: b.borderRadius,
      })),
    },
    results,
  };

  // Write output
  const outDir = join(ROOT, "docs", "design");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `button-audit-${MODE}.json`);
  writeFileSync(outFile, JSON.stringify(summary, null, 2));
  
  console.log("\n" + "═".repeat(60));
  console.log("📊 SUMMARY");
  console.log("═".repeat(60));
  console.log(`Total buttons:         ${totalButtons}`);
  console.log(`With data-ui="Button": ${buttonsWithDataUi}`);
  console.log(`Bypass count:          ${bypass.length}`);
  console.log(`Distinct style combos: ${combos.size}`);
  console.log(`Under 36px height:     ${underMin.length}`);
  console.log(`Under 44px (touch):    ${underTouchMin.length}`);
  console.log("═".repeat(60));
  console.log(`\n✅ Output: ${outFile}\n`);
}

main().catch((err) => {
  console.error("❌ Audit failed:", err);
  process.exit(1);
});
