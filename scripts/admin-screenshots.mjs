#!/usr/bin/env node
/**
 * Admin Screenshots — Phase 0 Audit
 * Captures all admin routes at 4 viewports × 3 locales
 * Usage: node scripts/admin-screenshots.mjs
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];

const LOCALES = ['fr', 'en', 'ar'];

const ROUTES = [
  { path: '/admin', name: 'dashboard' },
  { path: '/admin/login', name: 'login' },
  { path: '/admin/setup', name: 'setup' },
  { path: '/admin/menu', name: 'menu' },
  { path: '/admin/menu/new', name: 'menu-new' },
  // Note: /admin/menu/[id]/edit requires an existing item ID
  { path: '/admin/categories', name: 'categories' },
  { path: '/admin/orders', name: 'orders' },
  { path: '/admin/reservations', name: 'reservations' },
  { path: '/admin/gallery', name: 'gallery' },
  { path: '/admin/trash', name: 'trash' },
  { path: '/admin/qr', name: 'qr' },
  { path: '/admin/content', name: 'content' },
  { path: '/admin/settings', name: 'settings' },
];

const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs', 'screenshots');
const DEV_SERVER_URL = 'http://localhost:3000';
const DEV_SERVER_READY_TIMEOUT = 60000;
const PAGE_LOAD_TIMEOUT = 30000;
const SCREENSHOT_WAIT = 1500; // ms to wait for animations/transitions

// Use existing dev server if SKIP_DEV_SERVER_START is set
const SKIP_DEV_SERVER_START = process.env.SKIP_DEV_SERVER_START === 'true';

let devServerProcess = null;
let playwright = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function startDevServer() {
  if (SKIP_DEV_SERVER_START) {
    console.log('⏭️  Skipping dev server startup (using existing)');
    // Just verify the server is reachable
    const response = await fetch(DEV_SERVER_URL);
    if (!response.ok) {
      throw new Error(`Dev server not reachable at ${DEV_SERVER_URL}`);
    }
    console.log('✅ Dev server reachable');
    return;
  }

  console.log('🚀 Starting Next.js dev server...');

  return new Promise((resolve, reject) => {
    devServerProcess = spawn('npm', ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' },
    });

    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Dev server startup timeout'));
    }, DEV_SERVER_READY_TIMEOUT);

    devServerProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(`[dev] ${text}`);

      // Next.js dev server ready indicators
      if (text.includes('Ready in') || text.includes('started server on') || text.includes('Local:')) {
        clearTimeout(timeout);
        console.log('✅ Dev server ready');
        resolve();
      }
    });

    devServerProcess.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(`[dev:err] ${text}`);
    });

    devServerProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    devServerProcess.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Dev server exited with code ${code}\n${output}`));
      }
    });
  });
}

async function stopDevServer() {
  if (devServerProcess) {
    console.log('🛑 Stopping dev server...');
    devServerProcess.kill('SIGTERM');
    await sleep(1000);
    devServerProcess = null;
  }
}

async function initPlaywright() {
  console.log('🎭 Initializing Playwright...');
  const { chromium } = await import('playwright');
  playwright = await chromium.launch({ headless: true });
  console.log('✅ Playwright ready');
}

async function closePlaywright() {
  if (playwright) {
    await playwright.close();
    playwright = null;
  }
}

async function captureRoute(route, viewport, locale) {
  const browser = await playwright.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: locale,
    colorScheme: 'dark', // Force dark theme
  });

  const page = await browser.newPage();

  // Set RTL for Arabic
  if (locale === 'ar') {
    await page.addInitScript(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    });
  }

  const url = `${DEV_SERVER_URL}/${locale}${route.path}`;
  console.log(`  📸 ${route.name} | ${viewport.name} | ${locale}`);

  try {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: PAGE_LOAD_TIMEOUT
    });

    // Wait for any animations/transitions
    await sleep(SCREENSHOT_WAIT);

    // Ensure sidebar is visible for admin routes (not login/setup)
    if (!['login', 'setup'].includes(route.name)) {
      // Try to ensure sidebar is open on desktop
      if (viewport.width >= 1024) {
        await page.evaluate(() => {
          const sidebar = document.querySelector('aside, [data-sidebar]');
          if (sidebar) sidebar.style.display = 'flex';
        });
        await sleep(300);
      }
    }

    const filename = `${route.name}_${viewport.name}_${locale}.png`;
    const filepath = path.join(OUTPUT_DIR, route.name, viewport.name, locale, filename);
    await ensureDir(path.dirname(filepath));

    await page.screenshot({
      path: filepath,
      fullPage: true,
      animations: 'disabled',
    });

    await browser.close();
    return { success: true, filepath };
  } catch (error) {
    await browser.close();
    console.error(`  ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runCapture() {
  console.log('\n📊 Starting screenshot capture...\n');

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      for (const locale of LOCALES) {
        results.total++;
        const result = await captureRoute(route, viewport, locale);

        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            route: route.name,
            viewport: viewport.name,
            locale,
            error: result.error,
          });
        }
      }
    }
  }

  return results;
}

async function generateReport(results) {
  const reportPath = path.join(OUTPUT_DIR, 'capture-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    viewports: VIEWPORTS.map(v => v.name),
    locales: LOCALES,
    routes: ROUTES.map(r => r.name),
    summary: {
      total: results.total,
      success: results.success,
      failed: results.failed,
      successRate: `${((results.success / results.total) * 100).toFixed(1)}%`,
    },
    errors: results.errors,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved: ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('SCREENSHOT CAPTURE SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total:   ${results.total}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed:  ${results.failed}`);
  console.log(`Rate:    ${report.summary.successRate}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const err of results.errors) {
      console.log(`  ${err.route} | ${err.viewport} | ${err.locale}: ${err.error}`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ADMIN SCREENSHOTS — Phase 0 Audit');
  console.log('='.repeat(60));
  console.log(`Project: ${PROJECT_ROOT}`);
  console.log(`Output:  ${OUTPUT_DIR}`);
  console.log(`Routes:  ${ROUTES.length}`);
  console.log(`Viewports: ${VIEWPORTS.length}`);
  console.log(`Locales: ${LOCALES.length}`);
  console.log(`Total captures: ${ROUTES.length * VIEWPORTS.length * LOCALES.length}`);
  console.log('='.repeat(60));

  try {
    await ensureDir(OUTPUT_DIR);
    await startDevServer();
    if (!SKIP_DEV_SERVER_START) await sleep(2000); // Extra buffer for fresh start
    await initPlaywright();

    const results = await runCapture();
    await generateReport(results);

    await closePlaywright();
    if (!SKIP_DEV_SERVER_START) await stopDevServer();

    console.log('\n✅ Phase 0 screenshot capture complete!');
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    await closePlaywright();
    if (!SKIP_DEV_SERVER_START) await stopDevServer();
    process.exit(1);
  }
}

main();