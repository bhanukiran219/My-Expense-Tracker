const { chromium } = require('playwright-core');

async function testManualEntryOnTablet() {
  console.log('Testing manual entry on iPad/Tablet...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  
  // Emulate iPad
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();

  // Listen to console logs and errors
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3001');
  await page.waitForTimeout(500);

  // 1. Click Add Entry button
  console.log('1. Clicking Add Entry button...');
  const addBtn = await page.$('#btn-topbar-add-entry');
  if (addBtn) {
    await addBtn.click();
  } else {
    console.log('Topbar add btn not found, checking alternatives...');
    await page.evaluate(() => {
      for (const b of document.querySelectorAll('button')) {
        if (b.innerText && b.innerText.includes('Add entry')) {
          b.click();
          break;
        }
      }
    });
  }
  await page.waitForTimeout(400);

  // Verify modal is open
  const isModalOpen = await page.evaluate(() => !!document.querySelector('#modal-add-entry'));
  console.log('Modal is open:', isModalOpen);

  // 2. Check if Manual Entry tab is selected
  const activeTab = await page.evaluate(() => {
    const tabs = document.querySelectorAll('#modal-add-entry .border-b button');
    return Array.from(tabs).map(t => ({ text: t.innerText.trim(), class: t.className }));
  });
  console.log('Tabs:', activeTab);

  // 3. Try to click Manual Entry tab directly
  console.log('3. Clicking Manual Entry tab...');
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('#modal-add-entry button');
    for (const t of tabs) {
      if (t.innerText && t.innerText.includes('Manual Entry')) {
        t.click();
        break;
      }
    }
  });
  await page.waitForTimeout(200);

  // 4. Try to click and type into Amount field
  console.log('4. Interacting with Amount field...');
  try {
    const amountInput = await page.$('#input-entry-amount');
    if (amountInput) {
      await amountInput.click();
      await amountInput.fill('150.50');
      console.log('Amount filled successfully');
    } else {
      console.log('Amount input not found!');
    }
  } catch (err) {
    console.log('Error interacting with amount:', err.message);
  }

  // 5. Try to click and type into Merchant field
  console.log('5. Interacting with Merchant field...');
  try {
    const merchantInput = await page.$('#input-entry-merchant');
    if (merchantInput) {
      await merchantInput.click();
      await merchantInput.fill('Starbucks Coffee');
      console.log('Merchant filled successfully');
    } else {
      console.log('Merchant input not found!');
    }
  } catch (err) {
    console.log('Error interacting with merchant:', err.message);
  }

  // 6. Try Date picker
  console.log('6. Interacting with Date picker...');
  try {
    const dateBtn = await page.$('#input-entry-date');
    if (dateBtn) {
      console.log('Found date picker trigger, clicking...');
      await dateBtn.click();
      await page.waitForTimeout(300);
      const isDatePopoverVisible = await page.evaluate(() => {
        const pop = document.querySelector('#input-entry-date-popover');
        return !!pop && pop.getBoundingClientRect().height > 0;
      });
      console.log('Date popover visible:', isDatePopoverVisible);
    } else {
      console.log('Date picker not found');
    }
  } catch (err) {
    console.log('Error interacting with date picker:', err.message);
  }

  // 7. Try Category dropdown
  console.log('7. Interacting with Category dropdown...');
  try {
    const catTrigger = await page.$('#select-entry-category');
    if (catTrigger) {
      console.log('Found category trigger, clicking...');
      await catTrigger.click();
      await page.waitForTimeout(300);
      const isCatMenuVisible = await page.evaluate(() => {
        // Look for portal or menu
        const options = document.querySelectorAll('[role="option"], .cursor-pointer');
        return options.length;
      });
      console.log('Options count:', isCatMenuVisible);
    }
  } catch (err) {
    console.log('Error with Category dropdown:', err.message);
  }

  // 8. Try Account dropdown
  console.log('8. Interacting with Account dropdown...');
  try {
    const accTrigger = await page.$('#select-entry-account');
    if (accTrigger) {
      console.log('Found account trigger, clicking...');
      await accTrigger.click();
      await page.waitForTimeout(300);
    }
  } catch (err) {
    console.log('Error with Account dropdown:', err.message);
  }

  // 9. Try Type toggle (Income / Expense)
  console.log('9. Interacting with Type buttons...');
  const typeResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#modal-add-entry button'));
    const incomeBtn = btns.find(b => b.innerText.includes('Income (+)'));
    if (incomeBtn) {
      incomeBtn.click();
      return 'Clicked income button';
    }
    return 'Income button not found';
  });
  console.log('Type result:', typeResult);
  await page.waitForTimeout(200);

  // 10. Try submitting form
  console.log('10. Submitting form...');
  const submitResult = await page.evaluate(async () => {
    const saveBtn = document.querySelector('#btn-save-entry');
    if (!saveBtn) return { error: 'Save button not found' };
    saveBtn.click();
    return { success: true };
  });
  console.log('Submit trigger result:', submitResult);
  await page.waitForTimeout(600);

  // Check if error banner appeared or modal closed
  const postSubmitState = await page.evaluate(() => {
    const errorBanner = document.querySelector('.bg-rose-50');
    const modal = document.querySelector('#modal-add-entry');
    return {
      modalStillOpen: !!modal,
      errorMessage: errorBanner ? errorBanner.innerText : null
    };
  });
  console.log('Post submit state:', postSubmitState);

  await page.screenshot({ path: 'd:\\bhanu-expence-tracker\\playwright-automation-suite\\manual_entry_tablet_test.png' });
  await browser.close();
}

testManualEntryOnTablet().catch(console.error);
