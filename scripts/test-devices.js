// scripts/test-devices.js
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TopicMapPage } from '../tests/pages/TopicMapPage.js';
import { FlashcardPage } from '../tests/pages/FlashcardPage.js';
import { MemoryGamePage } from '../tests/pages/MemoryGamePage.js';
import { BubbleQuizPage } from '../tests/pages/BubbleQuizPage.js';

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
    hasTouch: false
  },
  {
    name: 'iphone-se-portrait',
    title: 'iPhone SE (Portrait)',
    viewport: { width: 375, height: 560 },
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'ipad-mini-portrait',
    title: 'iPad Mini (Portrait)',
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'ipad-mini-landscape',
    title: 'iPad Mini (Landscape)',
    viewport: { width: 1024, height: 768 },
    isMobile: true,
    hasTouch: true
  }
];

async function runDeviceMatrix() {
  console.log('🚀 Running Multi-Screen Comprehensive Responsive & Footer Test Suite (POM)...');
  const executablePath = getExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    executablePath
  });

  const results = [];

  for (const dev of devicesToTest) {
    console.log(`\n========================================================================`);
    console.log(`📱 Device: ${dev.title} (${dev.viewport.width} x ${dev.viewport.height})`);
    console.log(`========================================================================`);

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
      passed: true,
      screens: {}
    };

    try {
      const topicMapPage = new TopicMapPage(page);
      const flashcardPage = new FlashcardPage(page);
      const memoryGamePage = new MemoryGamePage(page);
      const bubbleQuizPage = new BubbleQuizPage(page);

      // 1. Check Topic Map (Home)
      await topicMapPage.goto();
      const homeOverflow = await topicMapPage.checkHorizontalOverflow();
      const homeFooter = await topicMapPage.getFooterMetrics();
      const homeAdmin = await topicMapPage.checkHeaderAdminButtonVisible();
      result.screens.topicMap = {
        overflowPass: !homeOverflow.hasOverflow,
        footerPass: homeFooter.isFullyVisible,
        adminPass: homeAdmin.isWithinViewport
      };

      // 2. Check Flashcard Screen
      await topicMapPage.selectTopic('Colors');
      await flashcardPage.waitForReady();
      const fcOverflow = await flashcardPage.checkHorizontalOverflow();
      const fcNav = await flashcardPage.getNavigationMetrics();
      const fcCard = await flashcardPage.getCardMetrics();
      const fcFooter = await flashcardPage.getFooterMetrics();
      const fcGap = fcFooter.top - fcNav.bottom;

      result.screens.flashcard = {
        cardDimensions: `${fcCard.width}x${fcCard.height}px`,
        overflowPass: !fcOverflow.hasOverflow,
        navPass: fcNav.isWithinViewport,
        footerPass: fcFooter.isFullyVisible,
        noOverlap: fcGap >= 0,
        gap: fcGap
      };

      // Save screenshot
      const ssPath = path.join(screenshotsDir, `${dev.name}.png`);
      await page.screenshot({ path: ssPath });

      // 3. Check Memory Game
      await topicMapPage.goto();
      await topicMapPage.openMemoryGame();
      await memoryGamePage.waitForReady();
      const memOverflow = await memoryGamePage.checkHorizontalOverflow();
      const memArena = await memoryGamePage.getArenaMetrics();
      const memCardRatio = await memoryGamePage.getCardAspectRatio();
      const memFooterGap = await memoryGamePage.getArenaFooterGap();
      const memCardPad = await memoryGamePage.getCardArenaPadding();
      const memLastCardGap = await memoryGamePage.getLastCardArenaBottomGap();
      const memFooter = await memoryGamePage.getFooterMetrics();

      result.screens.memoryGame = {
        overflowPass: !memOverflow.hasOverflow,
        arenaPass: memArena.isWithinViewport,
        footerPass: memFooter.isFullyVisible,
        cardRatioPass: memCardRatio.ratio >= 1.1 && memCardRatio.ratio <= 1.55,
        footerGapPass: memFooterGap.gap >= 6,
        paddingPass: memCardPad.minPadding >= 4,
        lastCardContainedPass: memLastCardGap.isContained,
        cardDimensions: `${memCardRatio.width}x${memCardRatio.height}px (Ratio: ${memCardRatio.ratio})`,
        gap: memFooterGap.gap,
        padding: memCardPad.minPadding,
        bottomPadding: memLastCardGap.gap
      };

      // 4. Check Bubble Quiz
      await topicMapPage.goto();
      await topicMapPage.openBubbleGame();
      await bubbleQuizPage.waitForReady();
      const bqOverflow = await bubbleQuizPage.checkHorizontalOverflow();
      const bqBtn = await bubbleQuizPage.getStartButtonMetrics();
      const bqFooter = await bubbleQuizPage.getFooterMetrics();

      result.screens.bubbleQuiz = {
        overflowPass: !bqOverflow.hasOverflow,
        buttonPass: bqBtn.isWithinViewport,
        footerPass: bqFooter.isFullyVisible
      };

      const testMap = {
        'topicMap.overflow': result.screens.topicMap.overflowPass,
        'topicMap.footer': result.screens.topicMap.footerPass,
        'topicMap.admin': result.screens.topicMap.adminPass,
        'flashcard.overflow': result.screens.flashcard.overflowPass,
        'flashcard.nav': result.screens.flashcard.navPass,
        'flashcard.footer': result.screens.flashcard.footerPass,
        'flashcard.noOverlap': result.screens.flashcard.noOverlap,
        'memoryGame.overflow': result.screens.memoryGame.overflowPass,
        'memoryGame.arena': result.screens.memoryGame.arenaPass,
        'memoryGame.footer': result.screens.memoryGame.footerPass,
        'memoryGame.cardRatio': result.screens.memoryGame.cardRatioPass,
        'memoryGame.footerGap': result.screens.memoryGame.footerGapPass,
        'memoryGame.padding': result.screens.memoryGame.paddingPass,
        'memoryGame.lastCardContained': result.screens.memoryGame.lastCardContainedPass,
        'bubbleQuiz.overflow': result.screens.bubbleQuiz.overflowPass,
        'bubbleQuiz.button': result.screens.bubbleQuiz.buttonPass,
        'bubbleQuiz.footer': result.screens.bubbleQuiz.footerPass
      };

      const failures = Object.entries(testMap).filter(([_, pass]) => !pass).map(([k]) => k);
      result.passed = failures.length === 0;

      console.log(`   [Topic Map]   Overflow: ${result.screens.topicMap.overflowPass ? 'OK' : 'FAIL'} | Footer: ${result.screens.topicMap.footerPass ? 'OK' : 'FAIL'} | Admin Button: ${result.screens.topicMap.adminPass ? 'OK' : 'FAIL'}`);
      console.log(`   [Flashcard]   Card: ${result.screens.flashcard.cardDimensions} | Nav: ${result.screens.flashcard.navPass ? 'OK' : 'FAIL'} | Footer: ${result.screens.flashcard.footerPass ? 'OK' : 'FAIL'} (Gap: ${result.screens.flashcard.gap}px)`);
      console.log(`   [Memory Game] Card: ${result.screens.memoryGame.cardDimensions} | Ratio: ${result.screens.memoryGame.cardRatioPass ? 'OK' : 'FAIL'} | BottomGap: ${result.screens.memoryGame.bottomPadding}px (${result.screens.memoryGame.lastCardContainedPass ? 'OK' : 'FAIL'}) | Footer: ${result.screens.memoryGame.footerPass ? 'OK' : 'FAIL'}`);
      console.log(`   [Bubble Quiz] Button Fit: ${result.screens.bubbleQuiz.buttonPass ? 'OK' : 'FAIL'} | Footer: ${result.screens.bubbleQuiz.footerPass ? 'OK' : 'FAIL'}`);
      if (!result.passed) {
        console.log(`   ❌ FAILED CHECKS: ${failures.join(', ')}`);
      }
      console.log(`   Result: ${result.passed ? '✅ ALL PASSED' : '❌ SOME TESTS FAILED'}`);

    } catch (err) {
      result.passed = false;
      result.error = err.message;
      console.error(`   Error on ${dev.title}:`, err.message);
    } finally {
      await context.close();
      results.push(result);
    }
  }

  await browser.close();

  console.log(`\n========================================================================================================`);
  console.log(`📊 FINAL POM TEST MATRIX SUMMARY:`);
  console.log(`========================================================================================================`);
  let allPass = true;
  for (const r of results) {
    const fc = r.screens.flashcard ? r.screens.flashcard.cardDimensions : 'N/A';
    console.log(`${r.passed ? '✅' : '❌'} ${r.device.padEnd(25)} | Viewport: ${r.viewport.padEnd(10)} | Flashcard: ${fc.padEnd(12)} | Status: ${r.passed ? 'PASSED (All 4 Screens)' : 'FAILED'}`);
    if (!r.passed) allPass = false;
  }
  console.log(`========================================================================================================`);

  if (!allPass) process.exit(1);
}

runDeviceMatrix().catch(err => {
  console.error('Suite error:', err);
  process.exit(1);
});
