const { chromium } = require('playwright-core');

async function testModals() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  const viewports = [
    { name: '320x568', width: 320, height: 568 },
    { name: '375x667', width: 375, height: 667 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '1280x800', width: 1280, height: 800 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(400);

    // Test Add Entry Modal
    await page.evaluate(() => document.querySelector('#btn-topbar-add-entry')?.click());
    await page.waitForTimeout(300);
    const addRes = await page.evaluate(() => {
      const dialog = document.querySelector('.fixed.inset-0');
      const box = dialog ? dialog.querySelector('.bg-white, .rounded-2xl') : null;
      return {
        hasBox: !!box,
        scrollW: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        boxW: box ? box.getBoundingClientRect().width : 0,
        boxRight: box ? box.getBoundingClientRect().right : 0
      };
    });
    console.log(`AddEntryModal @ ${vp.name}:`, addRes);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Test Import Modal
    await page.evaluate(() => document.querySelector('#btn-topbar-import')?.click());
    await page.waitForTimeout(300);
    const importRes = await page.evaluate(() => {
      const dialog = document.querySelector('.fixed.inset-0');
      const box = dialog ? dialog.querySelector('.bg-white, .rounded-2xl') : null;
      return {
        hasBox: !!box,
        scrollW: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        boxW: box ? box.getBoundingClientRect().width : 0,
        boxRight: box ? box.getBoundingClientRect().right : 0
      };
    });
    console.log(`ImportModal @ ${vp.name}:`, importRes);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  await browser.close();
}

testModals().catch(console.error);
