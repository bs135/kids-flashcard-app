// scripts/test-devices.js
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.resolve(__dirname, '../tests/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function getExecutablePath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const devicesToTest = [
  {
    name: 'desktop-browser',
    title: 'Desktop Web Browser',
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
    minHeight: 420
  },
  {
    name: 'iphone-se-portrait',
    title: 'iPhone SE (Portrait)',
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
    minHeight: 280
  },
  {
    name: 'ipad-mini-portrait',
    title: 'iPad Mini (Portrait)',
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true,
    minHeight: 420
  },
  {
    name: 'ipad-mini-landscape',
    title: 'iPad Mini (Landscape)',
    viewport: { width: 1024, height: 768 },
    isMobile: true,
    hasTouch: true,
    minHeight: 420
  }
];

async function runDeviceMatrix() {
  console.log('🚀 Launching Comprehensive Responsive & Footer Test Suite with Playwright...\n');
  const executablePath = getExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    executablePath
  });

  const results = [];

  for (const dev of devicesToTest) {
    console.log(`====================================================`);
    console.log(`📱 Running Test: ${dev.title} (${dev.viewport.width} x ${dev.viewport.height})`);
    console.log(`====================================================`);

    const context = await browser.newContext({
      viewport: dev.viewport,
      deviceScaleFactor: 2,
      isMobile: dev.isMobile,
      hasTouch: dev.hasTouch
    });

    const page = await context.newPage();
    const result = {
      device: dev.title,
      name: dev.name,
      viewport: `${dev.viewport.width}x${dev.viewport.height}`,
      passed: false,
      errors: []
    };

    try {
      // 1. Navigate to application
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

      // 2. Open "Colors" topic
      const colorsTopic = page.locator('text=Colors').first();
      await colorsTopic.waitFor({ state: 'visible', timeout: 10000 });
      await colorsTopic.click();

      // 3. Wait for card to appear
      await page.waitForSelector('text=Chạm thẻ để xem nghĩa', { timeout: 10000 });
      const cardLocator = page.locator('.perspective-1000').first();
      await cardLocator.waitFor({ state: 'visible', timeout: 10000 });

      const imgLocator = page.locator('.perspective-1000 img').first();
      await imgLocator.waitFor({ state: 'visible', timeout: 10000 });

      // Wait for layout animations
      await page.waitForTimeout(1000);

      // 4. Assertions:
      // a. Horizontal overflow
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      if (overflow.hasOverflow) {
        result.errors.push(`Horizontal scroll overflow: scrollWidth=${overflow.scrollWidth}px > innerWidth=${overflow.innerWidth}px`);
      }

      // b. Bottom navigation visible
      const nextBtnLocator = page.locator('button:has-text("Thẻ Tiếp Theo"), button:has-text("Hoàn Thành")').first();
      await nextBtnLocator.waitFor({ state: 'visible', timeout: 5000 });
      const nextBtnBox = await nextBtnLocator.boundingBox();
      const viewportHeight = dev.viewport.height;

      const btnBottom = nextBtnBox ? Math.round(nextBtnBox.y + nextBtnBox.height) : 0;
      result.btnBottom = btnBottom;

      if (btnBottom > viewportHeight + 5) {
        result.errors.push(`Navigation buttons off-screen: bottom=${btnBottom}px > viewportHeight=${viewportHeight}px`);
      }

      // c. Card height check
      const cardBox = await cardLocator.boundingBox();
      result.cardHeight = cardBox ? Math.round(cardBox.height) : 0;
      result.cardWidth = cardBox ? Math.round(cardBox.width) : 0;

      if (!cardBox || cardBox.height < dev.minHeight) {
        result.errors.push(`Card height collapsed: actual ${cardBox ? cardBox.height : 0}px < min ${dev.minHeight}px`);
      }

      // d. Image metrics check
      const imageMetrics = await imgLocator.evaluate((img) => ({
        naturalWidth: img.naturalWidth,
        offsetHeight: img.offsetHeight,
        offsetWidth: img.offsetWidth
      }));
      result.imageDisplay = `${imageMetrics.offsetWidth}x${imageMetrics.offsetHeight}px`;
      result.imageNatural = `${imageMetrics.naturalWidth}px`;

      if (imageMetrics.naturalWidth <= 0) {
        result.errors.push(`Image failed to load: naturalWidth <= 0`);
      }
      if (imageMetrics.offsetHeight <= 100) {
        result.errors.push(`Image height too small: ${imageMetrics.offsetHeight}px <= 100px`);
      }

      // e. Footer check
      const footerLocator = page.locator('footer:has-text("Kids English Flashcard App")').first();
      await footerLocator.waitFor({ state: 'visible', timeout: 5000 });
      const footerBox = await footerLocator.boundingBox();

      if (!footerBox) {
        result.errors.push(`Footer boundingBox is null`);
      } else {
        const footerTop = Math.round(footerBox.y);
        const footerBottom = Math.round(footerBox.y + footerBox.height);
        const footerGap = footerTop - btnBottom;

        result.footerTop = footerTop;
        result.footerBottom = footerBottom;
        result.footerGap = footerGap;

        if (footerBottom > viewportHeight + 5) {
          result.errors.push(`Footer pushed out of viewport: bottom=${footerBottom}px > viewportHeight=${viewportHeight}px`);
        }
        if (footerTop < 0) {
          result.errors.push(`Footer top negative: top=${footerTop}px`);
        }
        if (footerGap < 0) {
          result.errors.push(`Footer overlaps buttons: gap=${footerGap}px < 0`);
        }
      }

      // 5. Screenshot
      const screenshotPath = path.join(screenshotsDir, `${dev.name}.png`);
      await page.screenshot({ path: screenshotPath });
      result.screenshot = screenshotPath;

      result.passed = result.errors.length === 0;
      console.log(`   Card Size: ${result.cardWidth}px x ${result.cardHeight}px (Min: ${dev.minHeight}px)`);
      console.log(`   Image Size: ${result.imageDisplay} (Natural: ${result.imageNatural})`);
      console.log(`   Nav Button Bottom: ${result.btnBottom}px / Viewport: ${viewportHeight}px`);
      console.log(`   Footer Top: ${result.footerTop}px, Bottom: ${result.footerBottom}px (Gap: ${result.footerGap}px)`);
      console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (result.errors.length > 0) {
        console.log(`   Errors:`, result.errors);
      }
      console.log(`   Saved: ${screenshotPath}\n`);

    } catch (err) {
      result.passed = false;
      result.errors.push(err.message);
      console.error(`   Execution error on ${dev.title}:`, err.message);
    } finally {
      await context.close();
      results.push(result);
    }
  }

  await browser.close();

  console.log(`========================================================================================================================`);
  console.log(`📊 TEST SUITE SUMMARY (CARD, NAVIGATION & FOOTER METRICS):`);
  console.log(`========================================================================================================================`);
  let allPassed = true;
  for (const r of results) {
    console.log(
      `${r.passed ? '✅' : '❌'} ${r.device.padEnd(25)} | Viewport: ${r.viewport.padEnd(10)} | Card: ${String(r.cardWidth + 'x' + r.cardHeight + 'px').padEnd(12)} | Footer: [Top ${r.footerTop}px, Bot ${r.footerBottom}px, Gap ${r.footerGap}px] | ${r.passed ? 'PASSED' : 'FAILED: ' + r.errors.join('; ')}`
    );
    if (!r.passed) allPassed = false;
  }
  console.log(`========================================================================================================================`);

  if (!allPassed) {
    process.exit(1);
  }
}

runDeviceMatrix().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
