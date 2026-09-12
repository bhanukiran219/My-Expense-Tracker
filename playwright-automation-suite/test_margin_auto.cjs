const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0">
        <div id="overlay" style="position:fixed;inset:0;overflow-y:auto;display:flex;justify-content:center;align-items:flex-start;padding:16px;box-sizing:border-box">
          <div id="modal" style="width:500px;height:790px;margin:auto;background:white">MODAL</div>
        </div>
      </body>
    </html>
  `);

  // 1. Tall screen (iPad Portrait 768x1024)
  await page.setViewportSize({ width: 768, height: 1024 });
  const tall = await page.evaluate(() => {
    const m = document.querySelector('#modal').getBoundingClientRect();
    return { top: Math.round(m.top), height: m.height, winH: window.innerHeight };
  });
  console.log('iPad Portrait (768x1024):', tall, 'Is centered:', tall.top === Math.round((1024 - 790)/2));

  // 2. Short screen (iPad Landscape 1024x768)
  await page.setViewportSize({ width: 1024, height: 768 });
  const short = await page.evaluate(() => {
    const m = document.querySelector('#modal').getBoundingClientRect();
    const ov = document.querySelector('#overlay');
    return { top: Math.round(m.top), height: m.height, winH: window.innerHeight, scrollH: ov.scrollHeight, isClipped: m.top < 0 };
  });
  console.log('iPad Landscape (1024x768):', short);

  // 3. Tablet Landscape (1000x700)
  await page.setViewportSize({ width: 1000, height: 700 });
  const t700 = await page.evaluate(() => {
    const m = document.querySelector('#modal').getBoundingClientRect();
    return { top: Math.round(m.top), height: m.height, winH: window.innerHeight, isClipped: m.top < 0 };
  });
  console.log('Tablet (1000x700):', t700);

  // 4. Mobile (375x667)
  await page.setViewportSize({ width: 375, height: 667 });
  const mob = await page.evaluate(() => {
    const m = document.querySelector('#modal').getBoundingClientRect();
    return { top: Math.round(m.top), height: m.height, winH: window.innerHeight, isClipped: m.top < 0 };
  });
  console.log('Mobile (375x667):', mob);

  await browser.close();
})();
