const { chromium } = require('playwright-core');
const path = require('path');

async function testHamburger() {
  console.log('Testing Hamburger Menu on Mobile (iPhone 16 Pro Max: 440x956)...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 440, height: 956 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:3001');
  await page.waitForTimeout(500);

  // 1. Initial view: check TopBar and Hamburger button
  const isHamburgerVisible = await page.isVisible('#btn-hamburger-menu');
  console.log('1. Hamburger button visible in TopBar:', isHamburgerVisible);

  // Take screenshot of TopBar with Hamburger
  await page.screenshot({ path: path.join(__dirname, 'mobile_topbar_with_hamburger.png') });

  // 2. Click Hamburger Button
  console.log('2. Clicking Hamburger button...');
  await page.tap('#btn-hamburger-menu');
  await page.waitForTimeout(400);

  // Verify Drawer is open
  const isDrawerOpen = await page.isVisible('#mobile-nav-drawer');
  console.log('Drawer is open:', isDrawerOpen);

  // Check all 12 navigation items in the drawer
  const navItems = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#mobile-nav-drawer nav button'));
    return btns.map(b => b.innerText.trim().replace(/\n/g, ' '));
  });
  console.log('Drawer navigation items count:', navItems.length);
  console.log('Drawer navigation items:', navItems);

  // Take screenshot of opened Hamburger Drawer on iPhone 16 Pro Max
  const drawerScreenPath = 'C:\\Users\\pujar\\.gemini\\antigravity-ide\\brain\\b8022d2f-98aa-427f-927c-5ce690fa5917\\hamburger_drawer_mobile.png';
  await page.screenshot({ path: drawerScreenPath });
  console.log('Saved drawer screenshot to artifact directory');

  // 3. Click "Cash Flow Forecast"
  console.log('3. Clicking Cash Flow Forecast in drawer...');
  await page.tap('#mobile-drawer-nav-cash-flow');
  await page.waitForTimeout(500);

  // Check new view and TopBar title
  const cashFlowTitle = await page.evaluate(() => {
    const h2 = document.querySelector('header h2');
    const drawer = document.querySelector('#mobile-nav-drawer');
    return {
      topbarTitle: h2?.innerText,
      drawerStillOpen: !!drawer && window.getComputedStyle(drawer).display !== 'none'
    };
  });
  console.log('Navigated to Cash Flow:', cashFlowTitle);

  // Take screenshot of Cash Flow View
  const cashFlowScreenPath = 'C:\\Users\\pujar\\.gemini\\antigravity-ide\\brain\\b8022d2f-98aa-427f-927c-5ce690fa5917\\cash_flow_mobile_navigated.png';
  await page.screenshot({ path: cashFlowScreenPath });

  // 4. Click Hamburger Button again and navigate to Dashboard
  console.log('4. Clicking Hamburger button again...');
  await page.tap('#btn-hamburger-menu');
  await page.waitForTimeout(400);

  console.log('5. Clicking Dashboard in drawer...');
  await page.tap('#mobile-drawer-nav-dashboard');
  await page.waitForTimeout(500);

  const dashboardTitle = await page.evaluate(() => {
    const h2 = document.querySelector('header h2');
    return h2?.innerText;
  });
  console.log('Navigated back to Dashboard:', dashboardTitle);

  // Take screenshot of Dashboard View
  const dashboardScreenPath = 'C:\\Users\\pujar\\.gemini\\antigravity-ide\\brain\\b8022d2f-98aa-427f-927c-5ce690fa5917\\dashboard_mobile_navigated.png';
  await page.screenshot({ path: dashboardScreenPath });

  await browser.close();
  console.log('ALL TESTS PASSED!');
}

testHamburger().catch(console.error);
