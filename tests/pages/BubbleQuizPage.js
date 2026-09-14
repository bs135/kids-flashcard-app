// tests/pages/BubbleQuizPage.js
import { BasePage } from './BasePage.js';

export class BubbleQuizPage extends BasePage {
  constructor(page) {
    super(page);
    this.backButton = page.locator('button:has-text("Quay Lại")').first();
    this.startButton = page.locator('button:has-text("BẮT ĐẦU CHƠI NGAY")').first();
  }

  async getTopBarMetrics() {
    await this.backButton.waitFor({ state: 'visible', timeout: 5000 });
    const box = await this.backButton.boundingBox();
    const viewport = this.page.viewportSize();
    const viewportHeight = viewport ? viewport.height : 800;
    return {
      top: box ? Math.round(box.y) : 0,
      bottom: box ? Math.round(box.y + box.height) : 0,
      viewportHeight,
      isWithinViewport: box ? box.y >= 0 && box.y + box.height <= viewportHeight : false
    };
  }

  async waitForReady() {
    await this.startButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(600);
  }

  async getStartButtonMetrics() {
    const box = await this.startButton.boundingBox();
    const viewport = this.page.viewportSize();
    const viewportHeight = viewport ? viewport.height : 800;
    return {
      bottom: box ? Math.round(box.y + box.height) : 0,
      viewportHeight,
      isWithinViewport: box ? box.y + box.height <= viewportHeight + 5 : false
    };
  }
}
