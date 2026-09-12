const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 1. VIEWPORT TEST MATRIX
const MOBILE_VIEWPORTS = [
  { name: 'Mobile 320x568', width: 320, height: 568 },
  { name: 'Mobile 320x640', width: 320, height: 640 },
  { name: 'Mobile 360x640', width: 360, height: 640 },
  { name: 'Mobile 360x740', width: 360, height: 740 },
  { name: 'Mobile 360x800', width: 360, height: 800 },
  { name: 'Mobile 375x667', width: 375, height: 667 },
  { name: 'Mobile 375x812', width: 375, height: 812 },
  { name: 'Mobile 390x844', width: 390, height: 844 },
  { name: 'Mobile 393x852', width: 393, height: 852 },
  { name: 'Mobile 412x915', width: 412, height: 915 },
  { name: 'Mobile 414x896', width: 414, height: 896 },
  { name: 'Mobile 430x932', width: 430, height: 932 },
  { name: 'Mobile 480x800', width: 480, height: 800 },
  { name: 'Mobile 480x854', width: 480, height: 854 },
  { name: 'Mobile 540x960', width: 540, height: 960 },
];

const TABLET_VIEWPORTS = [
  { name: 'Tablet 600x800', width: 600, height: 800 },
  { name: 'Tablet 600x1024', width: 600, height: 1024 },
  { name: 'Tablet 640x960', width: 640, height: 960 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
  { name: 'Tablet 800x1280', width: 800, height: 1280 },
  { name: 'Tablet 810x1080', width: 810, height: 1080 },
  { name: 'Tablet 820x1180', width: 820, height: 1180 },
  { name: 'Tablet 834x1112', width: 834, height: 1112 },
  { name: 'Tablet 834x1194', width: 834, height: 1194 },
  { name: 'Tablet 1024x768', width: 1024, height: 768 },
  { name: 'Tablet 1024x1366', width: 1024, height: 1366 },
  { name: 'Tablet 1080x1440', width: 1080, height: 1440 },
  { name: 'Tablet 1200x1600', width: 1200, height: 1600 },
];

const LAPTOP_VIEWPORTS = [
  { name: 'Laptop 1024x768', width: 1024, height: 768 },
  { name: 'Laptop 1152x720', width: 1152, height: 720 },
  { name: 'Laptop 1280x720', width: 1280, height: 720 },
  { name: 'Laptop 1280x800', width: 1280, height: 800 },
  { name: 'Laptop 1366x768', width: 1366, height: 768 },
  { name: 'Laptop 1366x864', width: 1366, height: 864 },
  { name: 'Laptop 1440x900', width: 1440, height: 900 },
  { name: 'Laptop 1536x864', width: 1536, height: 864 },
  { name: 'Laptop 1600x900', width: 1600, height: 900 },
];

const DESKTOP_VIEWPORTS = [
  { name: 'Desktop 1680x1050', width: 1680, height: 1050 },
  { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
  { name: 'Desktop 1920x1200', width: 1920, height: 1200 },
  { name: 'Desktop 2560x1440', width: 2560, height: 1440 },
  { name: 'Desktop 2560x1600', width: 2560, height: 1600 },
  { name: 'Desktop 2880x1800', width: 2880, height: 1800 },
  { name: 'Desktop 3840x2160', width: 3840, height: 2160 },
];

const LANDSCAPE_VIEWPORTS = [
  { name: 'Landscape 568x320', width: 568, height: 320 },
  { name: 'Landscape 667x375', width: 667, height: 375 },
  { name: 'Landscape 740x360', width: 740, height: 360 },
  { name: 'Landscape 812x375', width: 812, height: 375 },
  { name: 'Landscape 844x390', width: 844, height: 390 },
  { name: 'Landscape 896x414', width: 896, height: 414 },
  { name: 'Landscape 932x430', width: 932, height: 430 },
];

// Breakpoints for Tailwind v4: sm (640), md (768), lg (1024), xl (1280), 2xl (1536)
const BREAKPOINT_VIEWPORTS = [
  { name: 'sm-1 (639px)', width: 639, height: 800 },
  { name: 'sm (640px)', width: 640, height: 800 },
  { name: 'sm+1 (641px)', width: 641, height: 800 },

  { name: 'md-1 (767px)', width: 767, height: 800 },
  { name: 'md (768px)', width: 768, height: 800 },
  { name: 'md+1 (769px)', width: 769, height: 800 },

  { name: 'lg-1 (1023px)', width: 1023, height: 800 },
  { name: 'lg (1024px)', width: 1024, height: 800 },
  { name: 'lg+1 (1025px)', width: 1025, height: 800 },

  { name: 'xl-1 (1279px)', width: 1279, height: 800 },
  { name: 'xl (1280px)', width: 1280, height: 800 },
  { name: 'xl+1 (1281px)', width: 1281, height: 800 },

  { name: '2xl-1 (1535px)', width: 1535, height: 800 },
  { name: '2xl (1536px)', width: 1536, height: 800 },
  { name: '2xl+1 (1537px)', width: 1537, height: 800 },
];

const INTERMEDIATE_WIDTHS = [
  600, 620, 640, 660, 680, 700, 720, 740, 760, 768, 780, 800, 820, 840, 860, 880, 900, 920, 940, 960, 980, 1000, 1024
].map(w => ({ name: `Intermediate ${w}px`, width: w, height: 800 }));

// Minimum 16 Required Screenshot Viewports
const SCREENSHOT_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 480, height: 854 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
];

const TABS = [
  'dashboard',
  'cash-flow',
  'net-worth',
  'transactions',
  'recurring',
  'subscriptions',
  'budgets',
  'goals',
  'loans',
  'documents',
  'rules-tags',
  'settings'
];

async function switchTab(page, tabId) {
  const isMobile = (page.viewportSize()?.width || 1000) < 768;
  const selector = isMobile ? `#mobile-nav-${tabId}` : `#nav-btn-${tabId}`;
  
  try {
    const clicked = await page.evaluate((sel) => {
      const target = document.querySelector(sel);
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, selector);
    await page.waitForTimeout(40);
    return clicked;
  } catch (e) {
    return false;
  }
}

async function detectOverflow(page) {
  return await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
    const innerWidth = window.innerWidth;
    const hasOverflow = scrollWidth > innerWidth + 1;

    const culprits = [];
    if (hasOverflow) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'TITLE'].includes(el.tagName)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.right > innerWidth + 1.5) {
          culprits.push({
            tagName: el.tagName,
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 5).join(' ') : '',
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            diff: Math.round(rect.right - innerWidth)
          });
        }
      }
    }

    return {
      hasOverflow,
      scrollWidth,
      innerWidth,
      culprits: culprits.sort((a, b) => b.diff - a.diff).slice(0, 5)
    };
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 STARTING OPTIMIZED RESPONSIVE QA AUDIT');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ text: err.message, stack: err.stack });
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const report = {
    summary: {
      totalPagesTested: TABS.length,
      totalViewportsTested: 0,
      totalIssuesFound: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      issuesFixed: 0,
      issuesRemaining: 0,
      finalStatus: 'PENDING'
    },
    overflows: [],
    modalIssues: [],
    zoomIssues: [],
    consoleErrors: []
  };

  const allViewportCategories = [
    { category: 'MOBILE', list: MOBILE_VIEWPORTS },
    { category: 'TABLET', list: TABLET_VIEWPORTS },
    { category: 'LAPTOP', list: LAPTOP_VIEWPORTS },
    { category: 'DESKTOP', list: DESKTOP_VIEWPORTS },
    { category: 'LANDSCAPE', list: LANDSCAPE_VIEWPORTS },
    { category: 'BREAKPOINTS', list: BREAKPOINT_VIEWPORTS },
    { category: 'INTERMEDIATE', list: INTERMEDIATE_WIDTHS },
  ];

  let totalVpCount = 0;
  for (const cat of allViewportCategories) {
    totalVpCount += cat.list.length;
  }
  report.summary.totalViewportsTested = totalVpCount;

  console.log(`Auditing ${TABS.length} tabs across ${totalVpCount} viewport configurations...`);

  // PART 1: AUDIT EACH VIEWPORT CATEGORY ACROSS KEY TABS
  for (const group of allViewportCategories) {
    console.log(`▶ Testing Category: ${group.category} (${group.list.length} viewports)...`);
    for (const vp of group.list) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(20);

      // Check on all tabs
      for (const tab of TABS) {
        await switchTab(page, tab);
        const overflow = await detectOverflow(page);
        if (overflow.hasOverflow) {
          report.overflows.push({
            category: group.category,
            viewport: `${vp.width}x${vp.height} (${vp.name})`,
            tab,
            scrollWidth: overflow.scrollWidth,
            innerWidth: overflow.innerWidth,
            diff: overflow.scrollWidth - overflow.innerWidth,
            culprits: overflow.culprits
          });
          console.log(`  ❌ OVERFLOW [${group.category} ${vp.name}] Tab: ${tab} - diff: +${overflow.scrollWidth - overflow.innerWidth}px`);
        }
      }
    }
  }

  // PART 2: CONTINUOUS RESIZE SWEEP (320px to 3840px)
  console.log('▶ Running Continuous Resize Sweep (320px -> 3840px)...');
  const sweepWidths = [
    320, 340, 360, 375, 390, 414, 430, 480, 520, 576, 600, 640, 680, 720, 767, 768, 769, 800, 850, 900, 960, 1023, 1024, 1025, 1100, 1200, 1279, 1280, 1281, 1366, 1440, 1535, 1536, 1537, 1680, 1920, 2200, 2560, 3000, 3840
  ];
  for (const w of sweepWidths) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(15);
    for (const tab of ['dashboard', 'cash-flow', 'transactions', 'net-worth']) {
      await switchTab(page, tab);
      const res = await detectOverflow(page);
      if (res.hasOverflow) {
        report.overflows.push({
          category: 'CONTINUOUS_RESIZE',
          viewport: `${w}x800`,
          tab,
          scrollWidth: res.scrollWidth,
          innerWidth: res.innerWidth,
          diff: res.scrollWidth - res.innerWidth,
          culprits: res.culprits
        });
      }
    }
  }

  // PART 3: TEST MODALS
  console.log('▶ Testing Modals across viewports...');
  const modalViewports = [
    { width: 320, height: 568, name: 'Mobile 320x568' },
    { width: 375, height: 667, name: 'Mobile 375x667' },
    { width: 768, height: 1024, name: 'Tablet 768x1024' },
    { width: 1280, height: 800, name: 'Desktop 1280x800' }
  ];

  for (const mv of modalViewports) {
    await page.setViewportSize({ width: mv.width, height: mv.height });
    await page.waitForTimeout(50);

    // 1. Add Entry Modal
    try {
      await page.evaluate(() => document.querySelector('#btn-topbar-add-entry')?.click());
      await page.waitForTimeout(100);
      const addModalOverflow = await detectOverflow(page);
      if (addModalOverflow.hasOverflow) {
        report.modalIssues.push({
          modal: 'AddEntryModal',
          viewport: mv.name,
          diff: addModalOverflow.scrollWidth - addModalOverflow.innerWidth,
          culprits: addModalOverflow.culprits
        });
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
    } catch (e) {}

    // 2. Import Modal
    try {
      await page.evaluate(() => document.querySelector('#btn-topbar-import')?.click());
      await page.waitForTimeout(100);
      const importModalOverflow = await detectOverflow(page);
      if (importModalOverflow.hasOverflow) {
        report.modalIssues.push({
          modal: 'ImportModal',
          viewport: mv.name,
          diff: importModalOverflow.scrollWidth - importModalOverflow.innerWidth,
          culprits: importModalOverflow.culprits
        });
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
    } catch (e) {}
  }

  // PART 4: BROWSER ZOOM LEVELS (80%, 90%, 100%, 110%, 125%, 150%, 175%, 200%)
  console.log('▶ Testing Zoom Levels...');
  const zoomLevels = [0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const z of zoomLevels) {
    await page.evaluate((zoom) => {
      document.body.style.zoom = `${zoom}`;
    }, z);
    await page.waitForTimeout(40);
    const zoomOverflow = await detectOverflow(page);
    if (zoomOverflow.hasOverflow) {
      report.zoomIssues.push({
        zoomLevel: `${Math.round(z * 100)}%`,
        diff: zoomOverflow.scrollWidth - zoomOverflow.innerWidth,
        culprits: zoomOverflow.culprits
      });
    }
  }
  await page.evaluate(() => { document.body.style.zoom = '1'; });

  // PART 5: CAPTURE SCREENSHOTS AT THE 16 MANDATORY VIEWPORTS
  console.log('▶ Capturing 16 mandatory resolution screenshots...');
  await page.goto(BASE_URL);
  await page.waitForTimeout(400);
  for (const sv of SCREENSHOT_VIEWPORTS) {
    await page.setViewportSize({ width: sv.width, height: sv.height });
    await switchTab(page, 'dashboard');
    await page.waitForTimeout(100);
    const fileName = `screenshot_${sv.width}x${sv.height}.png`;
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
  }

  // PART 6: RECORD CONSOLE ERRORS
  report.consoleErrors = consoleErrors;

  report.summary.totalIssuesFound = report.overflows.length + report.modalIssues.length + report.consoleErrors.length;
  report.summary.criticalIssues = report.overflows.filter(o => o.diff > 30).length;
  report.summary.highIssues = report.overflows.filter(o => o.diff <= 30 && o.diff > 5).length + report.modalIssues.length;
  report.summary.mediumIssues = report.overflows.filter(o => o.diff <= 5).length;
  report.summary.lowIssues = 0;

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE:`);
  console.log(`- Total Viewports Tested: ${report.summary.totalViewportsTested}`);
  console.log(`- Overflows Detected: ${report.overflows.length}`);
  console.log(`- Modal Issues: ${report.modalIssues.length}`);
  console.log(`- Console Errors: ${report.consoleErrors.length}`);
  console.log(`- Zoom Issues: ${report.zoomIssues.length}`);
  console.log('====================================================\n');

  const reportPath = path.join(__dirname, 'audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${reportPath}`);

  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
