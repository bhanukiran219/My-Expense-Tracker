const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots_modal');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function auditAddEntryModal() {
  console.log('====================================================');
  console.log('🔍 DEEP AUDIT: ADD TRANSACTION ENTRY POPUP');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testCases = [
    { name: 'Mobile 320x568', width: 320, height: 568 },
    { name: 'Mobile 360x800', width: 360, height: 800 },
    { name: 'Mobile 375x812', width: 375, height: 812 },
    { name: 'Landscape 568x320', width: 568, height: 320 },
    { name: 'Landscape 667x375', width: 667, height: 375 },
    { name: 'Tablet 768x1024', width: 768, height: 1024 },
    { name: 'Laptop 1024x768', width: 1024, height: 768 },
    { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
  ];

  const results = [];

  for (const tc of testCases) {
    console.log(`▶ Testing Add Entry Modal at ${tc.name} (${tc.width}x${tc.height})...`);
    await page.setViewportSize({ width: tc.width, height: tc.height });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    // Open Modal
    await page.evaluate(() => document.querySelector('#btn-topbar-add-entry')?.click());
    await page.waitForTimeout(250);

    // 1. Audit Manual Mode
    const manualAudit = await page.evaluate((vp) => {
      const modal = document.querySelector('#modal-add-entry');
      const dialogOverlay = document.querySelector('.fixed.inset-0.z-50');
      if (!modal) return { found: false };

      const mRect = modal.getBoundingClientRect();
      const internalCulprits = [];
      const allModalChildren = modal.querySelectorAll('*');

      for (const el of allModalChildren) {
        if (['SCRIPT', 'STYLE', 'svg', 'path', 'g', 'circle'].includes(el.tagName)) continue;
        const r = el.getBoundingClientRect();
        if (r.right > mRect.right + 1.5) {
          internalCulprits.push({
            tag: el.tagName,
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
            right: Math.round(r.right),
            modalRight: Math.round(mRect.right),
            diff: Math.round(r.right - mRect.right),
            text: (el.innerText || '').slice(0, 30).replace(/\n/g, ' ')
          });
        }
      }

      // Check Save Button visibility & accessibility
      const saveBtn = document.querySelector('#btn-save-entry');
      const saveBtnRect = saveBtn ? saveBtn.getBoundingClientRect() : null;
      const isSaveBtnVisibleInViewport = saveBtnRect 
        ? (saveBtnRect.top >= 0 && saveBtnRect.bottom <= window.innerHeight)
        : false;

      return {
        found: true,
        modalWidth: Math.round(mRect.width),
        modalHeight: Math.round(mRect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        isScrollable: dialogOverlay ? (dialogOverlay.scrollHeight > dialogOverlay.clientHeight) : false,
        isSaveBtnVisibleInViewport,
        saveBtnCoordinates: saveBtnRect ? { top: Math.round(saveBtnRect.top), bottom: Math.round(saveBtnRect.bottom) } : null,
        internalCulprits: internalCulprits.slice(0, 5)
      };
    }, tc);

    // Take Manual Screenshot
    const screenPathManual = path.join(SCREENSHOT_DIR, `add_entry_manual_${tc.width}x${tc.height}.png`);
    await page.screenshot({ path: screenPathManual, fullPage: false });

    // 2. Switch to CSV mode and audit
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('#modal-add-entry button');
      for (const btn of tabs) {
        if (btn.innerText && btn.innerText.includes('Upload CSV File')) {
          btn.click();
          break;
        }
      }
    });
    await page.waitForTimeout(200);

    const csvAudit = await page.evaluate((vp) => {
      const modal = document.querySelector('#modal-add-entry');
      if (!modal) return { found: false };
      const mRect = modal.getBoundingClientRect();
      const internalCulprits = [];
      for (const el of modal.querySelectorAll('*')) {
        if (['SCRIPT', 'STYLE', 'svg', 'path', 'g', 'circle'].includes(el.tagName)) continue;
        const r = el.getBoundingClientRect();
        if (r.right > mRect.right + 1.5) {
          internalCulprits.push({
            tag: el.tagName,
            diff: Math.round(r.right - mRect.right),
            text: (el.innerText || '').slice(0, 30)
          });
        }
      }
      return {
        modalWidth: Math.round(mRect.width),
        internalCulprits: internalCulprits.slice(0, 5)
      };
    }, tc);

    const screenPathCsv = path.join(SCREENSHOT_DIR, `add_entry_csv_${tc.width}x${tc.height}.png`);
    await page.screenshot({ path: screenPathCsv, fullPage: false });

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    results.push({
      testCase: tc.name,
      manual: manualAudit,
      csv: csvAudit
    });

    console.log(`  Manual Mode: width=${manualAudit.modalWidth}px, scrollable=${manualAudit.isScrollable}, internalCulprits=${manualAudit.internalCulprits.length}`);
    console.log(`  CSV Mode: width=${csvAudit.modalWidth}px, internalCulprits=${csvAudit.internalCulprits.length}\n`);
  }

  const outPath = path.join(__dirname, 'add_entry_modal_audit.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Full Add Entry Modal Report saved to: ${outPath}`);

  await browser.close();
}

auditAddEntryModal().catch(console.error);
