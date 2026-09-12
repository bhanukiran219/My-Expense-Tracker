const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function testTablet() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  // Test matrix for 700 to 1000 resolution:
  const tabletConfigs = [
    { name: 'Tablet 700x1000', width: 700, height: 1000 },
    { name: 'Tablet 720x1280', width: 720, height: 1280 },
    { name: 'iPad Mini / Standard 768x1024', width: 768, height: 1024 },
    { name: 'Tablet 768x900', width: 768, height: 900 },
    { name: 'Android Tablet 800x1280', width: 800, height: 1280 },
    { name: 'iPad 10.2 810x1080', width: 810, height: 1080 },
    { name: 'iPad Air 820x1180', width: 820, height: 1180 },
    { name: 'iPad Pro 10.5 834x1112', width: 834, height: 1112 },
    { name: 'iPad Pro 11 834x1194', width: 834, height: 1194 },
    { name: 'Tablet 900x1200', width: 900, height: 1200 },
    { name: 'Tablet 960x600 (Landscape)', width: 960, height: 600 },
    { name: 'iPad Landscape 1024x768', width: 1024, height: 768 },
    { name: 'Tablet 1000x700', width: 1000, height: 700 },
  ];

  const results = [];

  for (const tc of tabletConfigs) {
    await page.setViewportSize({ width: tc.width, height: tc.height });
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(300);

    // Check main page horizontal scroll
    const pageMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));

    // Open Add Entry Modal
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-topbar-add-entry') || document.querySelector('#btn-mobile-nav-add');
      btn?.click();
    });
    await page.waitForTimeout(250);

    const modalMetrics = await page.evaluate(() => {
      const modal = document.querySelector('#modal-add-entry');
      const overlay = document.querySelector('.fixed.inset-0.z-50');
      const closeBtn = modal?.querySelector('button svg.lucide-x')?.parentElement;
      const saveBtn = document.querySelector('#btn-save-entry');
      if (!modal) return { found: false };

      const mRect = modal.getBoundingClientRect();
      const cRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
      const sRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

      return {
        found: true,
        modalTop: Math.round(mRect.top),
        modalBottom: Math.round(mRect.bottom),
        modalWidth: Math.round(mRect.width),
        modalHeight: Math.round(mRect.height),
        windowHeight: window.innerHeight,
        isClippedTop: mRect.top < 0,
        isCloseBtnVisible: cRect ? (cRect.top >= 0 && cRect.bottom <= window.innerHeight) : false,
        isSaveBtnVisible: sRect ? (sRect.top >= 0 && sRect.bottom <= window.innerHeight) : false,
        canScrollToSave: overlay ? (overlay.scrollHeight > overlay.clientHeight) : false
      };
    });

    // Close modal
    await page.evaluate(() => {
      const modal = document.querySelector('#modal-add-entry');
      const closeBtn = modal?.querySelector('button svg.lucide-x')?.parentElement;
      closeBtn?.click();
    });
    await page.waitForTimeout(150);

    results.push({ config: tc, page: pageMetrics, modal: modalMetrics });
    console.log(`${tc.name} (${tc.width}x${tc.height}): Page Overflow=${pageMetrics.overflow}, Modal Top=${modalMetrics.modalTop}px, Clipped=${modalMetrics.isClippedTop}`);
  }

  fs.writeFileSync(path.join(__dirname, 'tablet_audit_results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}

testTablet();
