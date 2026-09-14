// tests/pages/MemoryGamePage.js
import { BasePage } from './BasePage.js';

export class MemoryGamePage extends BasePage {
  constructor(page) {
    super(page);
    this.backButton = page.locator('button:has-text("Quay Lại")').first();
    this.movesBadge = page.locator('text=Lượt:').first();
    this.arena = page.locator('.memory-arena').first();
    this.cardGrid = page.locator('.grid').first();
  }

  async getTopBarMetrics() {
    await this.backButton.waitFor({ state: 'visible', timeout: 5000 });
    const box = await this.backButton.boundingBox();
    const viewport = this.page.viewportSize();
    const viewportHeight = viewport ? viewport.height : 800;
    const viewportWidth = viewport ? viewport.width : 1280;
    return {
      top: box ? Math.round(box.y) : 0,
      bottom: box ? Math.round(box.y + box.height) : 0,
      left: box ? Math.round(box.x) : 0,
      right: box ? Math.round(box.x + box.width) : 0,
      viewportHeight,
      viewportWidth,
      isWithinViewport: box ? box.y >= 0 && box.y + box.height <= viewportHeight && box.x >= 0 && box.x + box.width <= viewportWidth : false
    };
  }

  async waitForReady() {
    await this.movesBadge.waitFor({ state: 'visible', timeout: 10000 });
    await this.arena.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(600);
  }

  async getArenaMetrics() {
    const box = await this.arena.boundingBox();
    const viewport = this.page.viewportSize();
    const viewportHeight = viewport ? viewport.height : 800;
    return {
      bottom: box ? Math.round(box.y + box.height) : 0,
      viewportHeight,
      isWithinViewport: box ? box.y + box.height <= viewportHeight + 5 : false
    };
  }

  async getCardAspectRatio() {
    const card = this.page.locator('.memory-card-item').first();
    await card.waitFor({ state: 'visible', timeout: 5000 });
    const box = await card.boundingBox();
    if (!box) return { width: 0, height: 0, ratio: 0 };
    return {
      width: Math.round(box.width),
      height: Math.round(box.height),
      ratio: Number((box.height / box.width).toFixed(2))
    };
  }

  async getArenaFooterGap() {
    const arena = this.page.locator('.memory-arena').first();
    await arena.waitFor({ state: 'visible', timeout: 5000 });
    const arenaBox = await arena.boundingBox();
    const footerBox = await this.footer.boundingBox();
    if (!arenaBox || !footerBox) return { gap: 0 };
    return {
      arenaBottom: Math.round(arenaBox.y + arenaBox.height),
      footerTop: Math.round(footerBox.y),
      gap: Math.round(footerBox.y - (arenaBox.y + arenaBox.height))
    };
  }

  async getCardArenaPadding() {
    const arena = this.page.locator('.memory-arena').first();
    const card = this.page.locator('.memory-card-item').first();
    await arena.waitFor({ state: 'visible', timeout: 5000 });
    await card.waitFor({ state: 'visible', timeout: 5000 });
    const arenaBox = await arena.boundingBox();
    const cardBox = await card.boundingBox();
    if (!arenaBox || !cardBox) return { topGap: 0, leftGap: 0, minPadding: 0 };
    const topGap = Math.round(cardBox.y - arenaBox.y);
    const leftGap = Math.round(cardBox.x - arenaBox.x);
    return {
      topGap,
      leftGap,
      minPadding: Math.min(topGap, leftGap)
    };
  }

  async getLastCardArenaBottomGap() {
    const arena = this.page.locator('.memory-arena').first();
    const lastCard = this.page.locator('.memory-card-item').last();
    await arena.waitFor({ state: 'visible', timeout: 5000 });
    await lastCard.waitFor({ state: 'visible', timeout: 5000 });
    const arenaBox = await arena.boundingBox();
    const lastCardBox = await lastCard.boundingBox();
    if (!arenaBox || !lastCardBox) return { gap: 0, isContained: false };
    const arenaBottom = Math.round(arenaBox.y + arenaBox.height);
    const lastCardBottom = Math.round(lastCardBox.y + lastCardBox.height);
    const gap = arenaBottom - lastCardBottom;
    return {
      arenaBottom,
      lastCardBottom,
      gap,
      isContained: gap >= 4
    };
  }
}
