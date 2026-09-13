// tests/pages/FlashcardPage.js
import { BasePage } from './BasePage.js';

export class FlashcardPage extends BasePage {
  constructor(page) {
    super(page);
    this.card = page.locator('.perspective-1000').first();
    this.cardImage = page.locator('.perspective-1000 img').first();
    this.prevButton = page.locator('button:has-text("Thẻ Trước")').first();
    this.nextButton = page.locator('button:has-text("Thẻ Tiếp Theo"), button:has-text("Hoàn Thành")').first();
    this.hintBadge = page.locator('text=Chạm thẻ để xem nghĩa');
  }

  async waitForReady() {
    await this.hintBadge.waitFor({ state: 'visible', timeout: 10000 });
    await this.card.waitFor({ state: 'visible', timeout: 10000 });
    await this.cardImage.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(600); // Allow animations to settle
  }

  async getCardMetrics() {
    const box = await this.card.boundingBox();
    return {
      width: box ? Math.round(box.width) : 0,
      height: box ? Math.round(box.height) : 0
    };
  }

  async getNavigationMetrics() {
    await this.nextButton.waitFor({ state: 'visible', timeout: 5000 });
    const box = await this.nextButton.boundingBox();
    const viewport = this.page.viewportSize();
    const viewportHeight = viewport ? viewport.height : 800;
    return {
      bottom: box ? Math.round(box.y + box.height) : 0,
      viewportHeight,
      isWithinViewport: box ? box.y + box.height <= viewportHeight + 5 : false
    };
  }
}
