const { chromium } = require('playwright-core');

async function debugManual() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('request', req => {
    if (req.url().includes('/api/')) console.log('REQ:', req.method(), req.url());
  });
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      console.log('RES:', res.status(), res.url());
      try {
        const body = await res.text();
        console.log('RES BODY:', body);
      } catch (e) {}
    }
  });

  await page.goto('http://localhost:3001');
  await page.waitForTimeout(500);

  // Click Add entry button
  await page.click('#btn-topbar-add-entry');
  await page.waitForTimeout(300);

  // Fill amount
  await page.fill('#input-entry-amount', '250.00');

  // Fill merchant
  await page.fill('#input-entry-merchant', 'Test Merchant');

  // Submit
  console.log('Clicking save...');
  await page.click('#btn-save-entry');
  await page.waitForTimeout(1000);

  const modalState = await page.evaluate(() => {
    const modal = document.querySelector('#modal-add-entry');
    const err = document.querySelector('.bg-rose-50');
    return {
      modalOpen: !!modal,
      error: err ? err.innerText : null
    };
  });
  console.log('Modal State after save:', modalState);

  await browser.close();
}

debugManual();
