// scripts/test-ui.js
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target screenshot output directory
const outputDir = path.resolve(__dirname, '../tests/screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check Chrome / Edge executable candidates on Windows
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

async function runTests() {
  console.log('🚀 Starting Playwright UI Responsive Test...');
  const executablePath = getExecutablePath();
  if (executablePath) {
    console.log(`Using browser executable: ${executablePath}`);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath
  });

  const baseUrl = 'http://localhost:5173';

  // 1. Test iPhone 13/14 (390 x 844)
  console.log('\n📱 Testing iPhone 13/14 (390 x 844)...');
  const iphoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const iphonePage = await iphoneContext.newPage();
  await iphonePage.goto(baseUrl, { waitUntil: 'networkidle' });

  // Click on "Colors" topic
  console.log('Navigating to "Colors" topic...');
  const colorsTopicIphone = iphonePage.locator('text=Colors').first();
  await colorsTopicIphone.click();
  await iphonePage.waitForSelector('text=Chạm thẻ để xem nghĩa', { timeout: 10000 });
  await iphonePage.waitForTimeout(1000); // Wait for animations to settle

  const iphoneCard = await iphonePage.locator('.perspective-1000').first();
  const iphoneCardBox = await iphoneCard.boundingBox();
  console.log(`iPhone Card bounding box: width=${iphoneCardBox.width}px, height=${iphoneCardBox.height}px`);

  const iphoneScreenshotPath = path.join(outputDir, 'iphone-flashcard.png');
  await iphonePage.screenshot({ path: iphoneScreenshotPath });
  console.log(`✅ Saved iPhone screenshot to: ${iphoneScreenshotPath}`);
  await iphoneContext.close();

  // 2. Test iPad (820 x 1180)
  console.log('\n📲 Testing iPad Pro / iPad Mini (820 x 1180)...');
  const ipadContext = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const ipadPage = await ipadContext.newPage();
  await ipadPage.goto(baseUrl, { waitUntil: 'networkidle' });

  // Click on "Colors" topic
  console.log('Navigating to "Colors" topic...');
  const colorsTopicIpad = ipadPage.locator('text=Colors').first();
  await colorsTopicIpad.click();
  await ipadPage.waitForSelector('text=Chạm thẻ để xem nghĩa', { timeout: 10000 });
  await ipadPage.waitForTimeout(1000); // Wait for animations to settle

  const ipadCard = await ipadPage.locator('.perspective-1000').first();
  const ipadCardBox = await ipadCard.boundingBox();
  console.log(`iPad Card bounding box: width=${ipadCardBox.width}px, height=${ipadCardBox.height}px`);

  const ipadScreenshotPath = path.join(outputDir, 'ipad-flashcard.png');
  await ipadPage.screenshot({ path: ipadScreenshotPath });
  console.log(`✅ Saved iPad screenshot to: ${ipadScreenshotPath}`);

  // Assert card height >= 300px on iPad
  if (ipadCardBox.height < 300) {
    console.error(`❌ FAILED: Card offsetHeight on iPad is ${ipadCardBox.height}px (< 300px)!`);
    await browser.close();
    process.exit(1);
  } else {
    console.log(`🎉 SUCCESS: Card height on iPad is ${ipadCardBox.height}px (>= 300px). Layout is healthy!`);
  }

  await ipadContext.close();
  await browser.close();
  console.log('\n✨ Playwright testing finished successfully!');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
