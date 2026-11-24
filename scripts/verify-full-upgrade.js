const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/debbi/.gemini/antigravity/brain/767c2543-1ad0-4c17-9a7b-6afb94df797f';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. Testing Desktop Public Site (1440x900)...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/fr', { waitUntil: 'networkidle' });

  // Scroll smoothly down the entire page to trigger observers and lazy images
  await page.evaluate(async () => {
    const step = 400;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 60));
    }
  });

  // Wait for all images to finish loading
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.length > 0 && imgs.every(img => img.complete && img.naturalHeight > 0);
  }, { timeout: 8000 }).catch(() => {});

  // Scroll back to top smoothly
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // Take Full Page Screenshot (Desktop)
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'public-upgraded-full-desktop.png'),
    fullPage: true,
  });
  console.log('-> Desktop full page screenshot saved');

  // Verify section opacities and visibility
  const sectionCheck = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('section, footer'));
    return sections.map(s => {
      const rect = s.getBoundingClientRect();
      const style = window.getComputedStyle(s);
      return {
        id: s.id || s.tagName.toLowerCase(),
        height: Math.round(rect.height),
        opacity: style.opacity,
        visibility: style.visibility,
        textSample: s.innerText.trim().slice(0, 40)
      };
    });
  });
  console.log('-> Section visibility report:', JSON.stringify(sectionCheck, null, 2));

  // Mobile Viewport (390x844 - iPhone 14)
  console.log('2. Testing Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/fr', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 50));
    }
  });
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.length > 0 && imgs.every(img => img.complete && img.naturalHeight > 0);
  }, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'public-upgraded-mobile.png'),
    fullPage: true,
  });
  console.log('-> Mobile full page screenshot saved');

  // Verify Admin Login Page
  console.log('3. Verifying Admin Login Button...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' });
  
  const submitBtn = page.locator('button[type="submit"]');
  const btnVisible = await submitBtn.isVisible();
  const btnText = await submitBtn.innerText();
  const btnBg = await submitBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
  const btnColor = await submitBtn.evaluate(el => window.getComputedStyle(el).color);
  
  console.log('-> Admin Login Button check:', {
    visible: btnVisible,
    text: btnText.trim(),
    backgroundColor: btnBg,
    textColor: btnColor
  });

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'admin-login-verified.png'),
    fullPage: false,
  });
  console.log('-> Admin login verified screenshot saved');

  await browser.close();
  console.log('All Playwright tests completed successfully!');
})();
