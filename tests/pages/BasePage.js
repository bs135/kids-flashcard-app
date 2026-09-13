// tests/pages/BasePage.js
export class BasePage {
  constructor(page) {
    this.page = page;
    this.header = page.locator('header');
    this.footer = page.locator('footer');
    this.adminButton = page.locator('header button[title="Khu vực phụ huynh"]');
  }

  async goto(path = '/') {
    const url = path.startsWith('http') ? path : `http://localhost:5173${path}`;
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async checkHorizontalOverflow() {
    return await this.page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
  }

  async getFooterMetrics() {
    await this.footer.waitFor({ state: 'visible', timeout: 5000 });
    const box = await this.footer.boundingBox();
    const viewport = this.page.viewportSize();
    const viewportHeight = viewport ? viewport.height : 800;
    return {
      box,
      top: box ? box.y : 0,
      bottom: box ? box.y + box.height : 0,
      viewportHeight,
      isFullyVisible: box ? box.y + box.height <= viewportHeight + 5 && box.y >= 0 : false
    };
  }

  async checkHeaderAdminButtonVisible() {
    await this.adminButton.waitFor({ state: 'visible', timeout: 5000 });
    const box = await this.adminButton.boundingBox();
    const viewport = this.page.viewportSize();
    const viewportWidth = viewport ? viewport.width : 1280;
    return {
      isVisible: await this.adminButton.isVisible(),
      right: box ? box.x + box.width : 0,
      viewportWidth,
      isWithinViewport: box ? box.x + box.width <= viewportWidth : false
    };
  }
}
