const { chromium } = require('playwright-core');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  const targets = [
    { name: 'ipad_768x1024_modal.png', width: 768, height: 1024 },
    { name: 'tablet_800x1280_modal.png', width: 800, height: 1280 },
    { name: 'ipad_air_820x1180_modal.png', width: 820, height: 1180 },
    { name: 'tablet_1000x700_modal.png', width: 1000, height: 700 },
    { name: 'ipad_landscape_1024x768_modal.png', width: 1024, height: 768 }
  ];

  for (const t of targets) {
    await page.setViewportSize({ width: t.width, height: t.height });
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const btn = document.querySelector('#btn-topbar-add-entry') || document.querySelector('#btn-mobile-nav-add');
      btn?.click();
    });
    await page.waitForTimeout(250);

    const outPath = path.join('C:\\Users\\pujar\\.gemini\\antigravity-ide\\brain\\b8022d2f-98aa-427f-927c-5ce690fa5917', t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Captured:', t.name);
  }

  await browser.close();
}

capture();
