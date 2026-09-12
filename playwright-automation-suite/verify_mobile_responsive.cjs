const { chromium } = require('playwright-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\pujar\\.gemini\\antigravity-ide\\brain\\74e28acd-175f-4a58-b66b-814e56bd7105';

async function verifyMobileResponsive() {
  console.log('--- Starting Mobile Responsive Verification ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14/15 standard mobile resolution
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(800);

  // 1. Verify TopBar & Hamburger
  const hamburger = await page.$('#btn-hamburger-menu');
  console.log('Hamburger button present:', !!hamburger);

  // Verify NO bottom navigation bar exists
  const bottomNav = await page.$('nav.fixed.bottom-0');
  console.log('Bottom navigation removed (is null):', bottomNav === null);

  // Screenshot Dashboard
  const dashShot = path.join(ARTIFACT_DIR, 'mobile_dashboard_390x844.png');
  await page.screenshot({ path: dashShot, fullPage: false });
  console.log('Saved dashboard screenshot:', dashShot);

  // 2. Test Period Dropdown
  const periodBtn = await page.$('#period-dropdown-btn');
  if (periodBtn) {
    await periodBtn.click();
    await page.waitForTimeout(400);
    const dropdownMenu = await page.$('#period-dropdown-menu');
    const box = dropdownMenu ? await dropdownMenu.boundingBox() : null;
    console.log('Period dropdown menu bounding box:', box);
    if (box) {
      console.log('Fits within viewport width (390px):', box.x >= 0 && (box.x + box.width) <= 390);
    }
    const dropShot = path.join(ARTIFACT_DIR, 'mobile_period_dropdown.png');
    await page.screenshot({ path: dropShot });
    console.log('Saved period dropdown screenshot:', dropShot);
    await periodBtn.click(); // close dropdown
    await page.waitForTimeout(300);
  }

  // 3. Test Drawer Open & Navigate to Transactions
  if (hamburger) {
    await hamburger.click();
    await page.waitForTimeout(400);
    const drawerShot = path.join(ARTIFACT_DIR, 'mobile_drawer_open.png');
    await page.screenshot({ path: drawerShot });
    console.log('Saved drawer screenshot:', drawerShot);

    // Click Transactions
    const txBtn = await page.$('#mobile-drawer-nav-transactions');
    if (txBtn) {
      await txBtn.click();
      await page.waitForTimeout(600);
      const txShot = path.join(ARTIFACT_DIR, 'mobile_transactions_view.png');
      await page.screenshot({ path: txShot });
      console.log('Saved transactions screenshot:', txShot);
    }

    // Open drawer again and navigate to Cash Flow
    await page.click('#btn-hamburger-menu');
    await page.waitForTimeout(400);
    const cfBtn = await page.$('#mobile-drawer-nav-cash-flow');
    if (cfBtn) {
      await cfBtn.click();
      await page.waitForTimeout(600);
      const cfShot = path.join(ARTIFACT_DIR, 'mobile_cash_flow_view.png');
      await page.screenshot({ path: cfShot });
      console.log('Saved cash flow screenshot:', cfShot);
    }

    // Open drawer and navigate to Net Worth
    await page.click('#btn-hamburger-menu');
    await page.waitForTimeout(400);
    const nwBtn = await page.$('#mobile-drawer-nav-net-worth');
    if (nwBtn) {
      await nwBtn.click();
      await page.waitForTimeout(600);
      const nwShot = path.join(ARTIFACT_DIR, 'mobile_net_worth_view.png');
      await page.screenshot({ path: nwShot });
      console.log('Saved net worth screenshot:', nwShot);
    }
  }

  await browser.close();
  console.log('--- Verification Complete ---');
}

verifyMobileResponsive().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
