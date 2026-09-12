const { chromium } = require('playwright-core');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(500);

  // Click add transaction
  await page.evaluate(() => {
    const btn = document.querySelector('#btn-topbar-add-entry') || document.querySelector('#btn-mobile-nav-add');
    if (btn) btn.click();
    else {
      for (const b of document.querySelectorAll('button')) {
        if (b.innerText && b.innerText.includes('Add entry')) {
          b.click();
          break;
        }
      }
    }
  });
  await page.waitForTimeout(400);

  const screenPath = path.join(__dirname, 'mobile_375x667_modal_open.png');
  await page.screenshot({ path: screenPath, fullPage: false });

  // Scroll overlay to bottom
  await page.evaluate(() => {
    const overlay = document.querySelector('.fixed.inset-0.z-50');
    if (overlay) overlay.scrollTop = overlay.scrollHeight;
  });
  await page.waitForTimeout(300);

  const screenPathBottom = path.join(__dirname, 'mobile_375x667_modal_bottom.png');
  await page.screenshot({ path: screenPathBottom, fullPage: false });

  // Check positions
  const pos = await page.evaluate(() => {
    const modal = document.querySelector('#modal-add-entry');
    const overlay = document.querySelector('.fixed.inset-0.z-50');
    const saveBtn = document.querySelector('#btn-save-entry');
    if (!modal) return { error: 'Modal not found' };
    const mRect = modal.getBoundingClientRect();
    const sRect = saveBtn ? saveBtn.getBoundingClientRect() : null;
    return {
      windowHeight: window.innerHeight,
      modalTop: mRect.top,
      modalBottom: mRect.bottom,
      modalHeight: mRect.height,
      overlayScrollTop: overlay ? overlay.scrollTop : -1,
      overlayScrollHeight: overlay ? overlay.scrollHeight : -1,
      overlayClientHeight: overlay ? overlay.clientHeight : -1,
      isSaveBtnVisible: sRect ? (sRect.top >= 0 && sRect.bottom <= window.innerHeight) : false
    };
  });
  console.log('Position data after scroll:', pos);

  await browser.close();
}

test();
