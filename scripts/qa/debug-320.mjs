import { chromium } from "@playwright/test";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);
const culprits = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 90),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        id: el.id,
      });
    }
  }
  return { vw, scrollW: document.documentElement.scrollWidth, out: out.slice(0, 25) };
});
console.log(JSON.stringify(culprits, null, 1));
await browser.close();
