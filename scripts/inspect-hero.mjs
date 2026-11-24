import { chromium } from "playwright";

async function checkHero() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/fr", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  const heroButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("section:first-of-type a, section:first-of-type button"));
    return btns.filter(b => b.innerText && (b.innerText.includes("Réserver") || b.innerText.includes("menu"))).map(b => {
      const s = window.getComputedStyle(b);
      return {
        text: b.innerText.trim(),
        color: s.color,
        backgroundColor: s.backgroundColor,
        height: s.height,
        padding: `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`,
        borderRadius: s.borderRadius,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
      };
    });
  });

  console.log("HERO BUTTONS:", JSON.stringify(heroButtons, null, 2));
  await page.screenshot({ path: "docs/audit/verified-hero.png" });
  console.log("Saved hero screenshot to docs/audit/verified-hero.png");

  await browser.close();
}

checkHero().catch(console.error);
