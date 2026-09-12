// tests/responsive-visual.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test('Verify Flashcard UI responsive layout and capture snapshot', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;

  // 1. Navigate to application
  await page.goto('/', { waitUntil: 'networkidle' });

  // 2. Open "Colors" Flashcard topic
  const colorsTopic = page.locator('text=Colors').first();
  await expect(colorsTopic).toBeVisible({ timeout: 10000 });
  await colorsTopic.click();

  // 3. Wait for Flashcard and image to fully render
  await page.waitForSelector('text=Chạm thẻ để xem nghĩa', { timeout: 10000 });
  const flashcardImage = page.locator('.perspective-1000 img').first();
  await expect(flashcardImage).toBeVisible({ timeout: 10000 });

  // Wait briefly for CSS layout and animations to settle
  await page.waitForTimeout(1000);

  // 4. Assertions:
  // a. Horizontal overflow check (scrollWidth <= innerWidth)
  const overflowCheck = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  expect(
    overflowCheck.hasOverflow,
    `Horizontal scroll detected on ${projectName}: scrollWidth=${overflowCheck.scrollWidth}px, innerWidth=${overflowCheck.innerWidth}px`
  ).toBe(false);

  // b. Bottom navigation buttons check (boundingClientRect.bottom <= window.innerHeight)
  const prevButton = page.locator('button:has-text("Thẻ Trước")').first();
  const nextButton = page.locator('button:has-text("Thẻ Tiếp Theo"), button:has-text("Hoàn Thành")').first();
  await expect(prevButton).toBeVisible();
  await expect(nextButton).toBeVisible();

  const nextBtnBox = await nextButton.boundingBox();
  expect(nextBtnBox).not.toBeNull();
  const viewport = page.viewportSize();
  const viewportHeight = viewport ? viewport.height : 800;

  expect(
    nextBtnBox.y + nextBtnBox.height,
    `Navigation buttons pushed off-screen on ${projectName}: bottom=${nextBtnBox.y + nextBtnBox.height}px, viewportHeight=${viewportHeight}px`
  ).toBeLessThanOrEqual(viewportHeight + 5);

  // c. Flashcard height check: >= 280px on mobile, >= 420px on iPad / Desktop
  const cardLocator = page.locator('.perspective-1000').first();
  const cardBox = await cardLocator.boundingBox();
  expect(cardBox).not.toBeNull();

  const isMobileDevice = projectName.includes('iphone') || projectName.includes('mobile');
  const minRequiredHeight = isMobileDevice ? 280 : 420;
  console.log(`[${projectName}] Card dimensions: ${Math.round(cardBox.width)}px x ${Math.round(cardBox.height)}px (Min required: ${minRequiredHeight}px)`);

  expect(
    cardBox.height,
    `Card height collapsed on ${projectName}: actual ${cardBox.height}px < minimum ${minRequiredHeight}px`
  ).toBeGreaterThanOrEqual(minRequiredHeight);

  // d. Illustration image check: naturalWidth > 0 and offsetHeight > 100px
  const imageMetrics = await flashcardImage.evaluate((img) => {
    return {
      naturalWidth: img.naturalWidth,
      offsetHeight: img.offsetHeight,
      offsetWidth: img.offsetWidth,
      complete: img.complete
    };
  });
  console.log(`[${projectName}] Image dimensions: display=${imageMetrics.offsetWidth}x${imageMetrics.offsetHeight}px, naturalWidth=${imageMetrics.naturalWidth}px`);

  expect(imageMetrics.naturalWidth, `Image did not load properly on ${projectName}`).toBeGreaterThan(0);
  expect(imageMetrics.offsetHeight, `Image display height too small on ${projectName}`).toBeGreaterThan(100);

  // e. Footer visibility and position check
  const footerLocator = page.locator('footer:has-text("Kids English Flashcard App")').first();
  await expect(footerLocator).toBeVisible();

  const footerBox = await footerLocator.boundingBox();
  expect(footerBox, `Footer boundingBox is null on ${projectName}`).not.toBeNull();

  const footerBottom = footerBox.y + footerBox.height;
  const footerTop = footerBox.y;
  console.log(`[${projectName}] Footer metrics: top=${Math.round(footerTop)}px, bottom=${Math.round(footerBottom)}px, viewportHeight=${viewportHeight}px`);

  expect(
    footerBottom,
    `Footer pushed out of viewport on ${projectName}: bottom=${Math.round(footerBottom)}px > viewportHeight=${viewportHeight}px`
  ).toBeLessThanOrEqual(viewportHeight + 5);

  expect(
    footerTop,
    `Footer top is negative or off-screen on ${projectName}: top=${Math.round(footerTop)}px`
  ).toBeGreaterThanOrEqual(0);

  // Check no overlap with navigation buttons
  const btnBottom = nextBtnBox.y + nextBtnBox.height;
  const gap = footerTop - btnBottom;
  console.log(`[${projectName}] Gap between navigation buttons and footer: ${Math.round(gap)}px`);
  expect(
    gap,
    `Footer overlaps navigation buttons on ${projectName}: gap=${Math.round(gap)}px < 0`
  ).toBeGreaterThanOrEqual(0);

  // 5. Capture screenshot
  const screenshotPath = path.join(screenshotsDir, `${projectName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[${projectName}] Snapshot saved to: ${screenshotPath}\n`);
});
