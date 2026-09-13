// tests/pages/TopicMapPage.js
import { BasePage } from './BasePage.js';

export class TopicMapPage extends BasePage {
  constructor(page) {
    super(page);
    this.title = page.locator('text=Hôm nay bé muốn học gì nào?');
    this.bubbleGameBanner = page.locator('text=Bong Bóng Từ Vựng').first();
    this.memoryGameBanner = page.locator('text=Lật Thẻ Trí Nhớ').first();
  }

  async selectTopic(name) {
    const topicCard = this.page.locator(`h3:has-text("${name}")`).first();
    await topicCard.waitFor({ state: 'visible', timeout: 10000 });
    await topicCard.click();
  }

  async openBubbleGame() {
    await this.bubbleGameBanner.waitFor({ state: 'visible', timeout: 10000 });
    await this.bubbleGameBanner.click();
  }

  async openMemoryGame() {
    await this.memoryGameBanner.waitFor({ state: 'visible', timeout: 10000 });
    await this.memoryGameBanner.click();
  }
}
