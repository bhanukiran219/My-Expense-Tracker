const { chromium } = require('playwright-core');

async function testFullUserFlow() {
  console.log('Testing full user flow for manual entry on iPad...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3001');
  await page.waitForTimeout(500);

  // 1. Click Add entry button
  console.log('1. Tapping Add entry button...');
  await page.tap('#btn-topbar-add-entry');
  await page.waitForTimeout(300);

  // 2. Tap and type Amount
  console.log('2. Tapping and filling Amount...');
  await page.tap('#input-entry-amount');
  await page.fill('#input-entry-amount', '99.99');

  // 3. Tap and type Merchant
  console.log('3. Tapping and filling Merchant...');
  await page.tap('#input-entry-merchant');
  await page.fill('#input-entry-merchant', 'Whole Foods');

  // 4. Tap Category dropdown
  console.log('4. Tapping Category dropdown...');
  await page.tap('#select-entry-category');
  await page.waitForTimeout(300);

  // Screenshot with Category open
  await page.screenshot({ path: 'd:\\bhanu-expence-tracker\\playwright-automation-suite\\step4_category_open.png' });

  // Try to tap "Groceries" option
  console.log('5. Tapping Groceries option...');
  const groceriesBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#select-entry-category-menu button'));
    const target = btns.find(b => b.innerText.includes('Groceries'));
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  console.log('Groceries tapped:', groceriesBtn);
  await page.waitForTimeout(300);

  // Check Category value
  const selectedCatText = await page.evaluate(() => {
    return document.querySelector('#select-entry-category')?.innerText;
  });
  console.log('Selected Category display:', selectedCatText);

  // 6. Tap Account dropdown
  console.log('6. Tapping Account dropdown...');
  await page.tap('#select-entry-account');
  await page.waitForTimeout(300);

  // Try to tap an account
  console.log('7. Tapping account option...');
  const accTapped = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#select-entry-account-menu button'));
    if (btns.length > 1) {
      btns[1].click();
      return btns[1].innerText;
    }
    return null;
  });
  console.log('Account option tapped:', accTapped);
  await page.waitForTimeout(300);

  // Screenshot before save
  await page.screenshot({ path: 'd:\\bhanu-expence-tracker\\playwright-automation-suite\\step7_before_save.png' });

  // 8. Tap Save Transaction
  console.log('8. Tapping Save Transaction...');
  await page.tap('#btn-save-entry');
  await page.waitForTimeout(800);

  // Check if modal closed
  const isModalOpen = await page.evaluate(() => !!document.querySelector('#modal-add-entry'));
  const errorMsg = await page.evaluate(() => document.querySelector('.bg-rose-50')?.innerText);
  console.log('Is modal open after save:', isModalOpen, 'Error:', errorMsg);

  await page.screenshot({ path: 'd:\\bhanu-expence-tracker\\playwright-automation-suite\\step8_after_save.png' });

  await browser.close();
}

testFullUserFlow().catch(console.error);
