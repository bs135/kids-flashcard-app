// tests/responsive-visual.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TopicMapPage } from './pages/TopicMapPage.js';
import { FlashcardPage } from './pages/FlashcardPage.js';
import { MemoryGamePage } from './pages/MemoryGamePage.js';
import { BubbleQuizPage } from './pages/BubbleQuizPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('Kids Flashcard App - POM Comprehensive UI Responsive Suite', () => {

  test('Screen 1: Topic Map (Home) - Responsive & Overflow Check', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const topicMapPage = new TopicMapPage(page);

    await topicMapPage.goto();
    await expect(topicMapPage.title).toBeVisible({ timeout: 10000 });

    // Header Admin button check
    const headerAdmin = await topicMapPage.checkHeaderAdminButtonVisible();
    expect(headerAdmin.isWithinViewport, `Admin Lock icon cut off on ${projectName}`).toBe(true);

    // Horizontal overflow check
    const overflow = await topicMapPage.checkHorizontalOverflow();
    expect(overflow.hasOverflow, `Horizontal scroll detected on TopicMap (${projectName})`).toBe(false);

    // Footer visibility
    const footer = await topicMapPage.getFooterMetrics();
    expect(footer.isFullyVisible, `Footer pushed out of viewport on TopicMap (${projectName})`).toBe(true);
  });

  test('Screen 2: Flashcard Viewer - Fits in One Screen & Footer Check', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const topicMapPage = new TopicMapPage(page);
    const flashcardPage = new FlashcardPage(page);

    await topicMapPage.goto();
    await topicMapPage.selectTopic('Colors');
    await flashcardPage.waitForReady();

    // 1. Horizontal overflow
    const overflow = await flashcardPage.checkHorizontalOverflow();
    expect(overflow.hasOverflow, `Horizontal scroll detected on Flashcard (${projectName})`).toBe(false);

    // 2. Navigation buttons
    const nav = await flashcardPage.getNavigationMetrics();
    expect(nav.isWithinViewport, `Nav buttons off-screen on Flashcard (${projectName})`).toBe(true);

    // 3. Card dimensions
    const isMobile = projectName.includes('iphone') || projectName.includes('mobile');
    const minHeight = isMobile ? 260 : 380;
    const card = await flashcardPage.getCardMetrics();
    console.log(`[${projectName}] Flashcard: ${card.width}x${card.height}px (Min: ${minHeight}px)`);
    expect(card.height).toBeGreaterThanOrEqual(minHeight);

    // 4. Footer visibility
    const footer = await flashcardPage.getFooterMetrics();
    expect(footer.isFullyVisible, `Footer pushed out of viewport on Flashcard (${projectName})`).toBe(true);

    // 5. Gap between nav button and footer (no overlap)
    const gap = footer.top - nav.bottom;
    expect(gap, `Footer overlaps navigation buttons on ${projectName}`).toBeGreaterThanOrEqual(0);

    // Save snapshot
    const screenshotPath = path.join(screenshotsDir, `${projectName}.png`);
    await page.screenshot({ path: screenshotPath });
  });

  test('Screen 3: Memory Game - Grid Fits in One Screen & Footer Check', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const topicMapPage = new TopicMapPage(page);
    const memoryGamePage = new MemoryGamePage(page);

    await topicMapPage.goto();
    await topicMapPage.openMemoryGame();
    await memoryGamePage.waitForReady();

    // 1. Horizontal overflow
    const overflow = await memoryGamePage.checkHorizontalOverflow();
    expect(overflow.hasOverflow, `Horizontal scroll detected on MemoryGame (${projectName})`).toBe(false);

    // 2. Arena within viewport
    const arena = await memoryGamePage.getArenaMetrics();
    expect(arena.isWithinViewport, `Memory cards arena off-screen on ${projectName}`).toBe(true);

    // 3. Card Aspect Ratio check (1.1 <= H/W <= 1.55)
    const cardRatio = await memoryGamePage.getCardAspectRatio();
    expect(cardRatio.ratio, `Card ratio out of bounds (${cardRatio.ratio}) on ${projectName}`).toBeGreaterThanOrEqual(1.1);
    expect(cardRatio.ratio, `Card ratio out of bounds (${cardRatio.ratio}) on ${projectName}`).toBeLessThanOrEqual(1.55);

    // 4. Visible gap between arena and footer (>= 6px)
    const arenaGap = await memoryGamePage.getArenaFooterGap();
    expect(arenaGap.gap, `Arena-to-footer gap too small (${arenaGap.gap}px) on ${projectName}`).toBeGreaterThanOrEqual(6);

    // 5. Card to arena boundary breathing room (>= 4px)
    const cardPadding = await memoryGamePage.getCardArenaPadding();
    expect(cardPadding.minPadding, `Card too close to arena edges (${cardPadding.minPadding}px) on ${projectName}`).toBeGreaterThanOrEqual(4);

    // 6. Last card containment check (arenaBottom - lastCardBottom >= 6px)
    const bottomGap = await memoryGamePage.getLastCardArenaBottomGap();
    expect(bottomGap.isContained, `Hàng thẻ cuối cùng bị tràn ra ngoài khung game arena (${bottomGap.gap}px) on ${projectName}`).toBe(true);

    // 7. Footer visibility
    const footer = await memoryGamePage.getFooterMetrics();
    expect(footer.isFullyVisible, `Footer pushed out of viewport on MemoryGame (${projectName})`).toBe(true);
  });

  test('Screen 4: Bubble Quiz - Arena Fits in One Screen & Footer Check', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const topicMapPage = new TopicMapPage(page);
    const bubbleQuizPage = new BubbleQuizPage(page);

    await topicMapPage.goto();
    await topicMapPage.openBubbleGame();
    await bubbleQuizPage.waitForReady();

    // 1. Horizontal overflow
    const overflow = await bubbleQuizPage.checkHorizontalOverflow();
    expect(overflow.hasOverflow, `Horizontal scroll detected on BubbleQuiz (${projectName})`).toBe(false);

    // 2. Start button within viewport
    const startBtn = await bubbleQuizPage.getStartButtonMetrics();
    expect(startBtn.isWithinViewport, `Bubble Quiz start button off-screen on ${projectName}`).toBe(true);

    // 3. Footer visibility
    const footer = await bubbleQuizPage.getFooterMetrics();
    expect(footer.isFullyVisible, `Footer pushed out of viewport on BubbleQuiz (${projectName})`).toBe(true);
  });

});
