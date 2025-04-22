import puppeteer, { Browser, Page } from 'puppeteer';

export class Grabber {
  private _browser: Browser | undefined;

  async launch() {
    this._browser = await puppeteer.launch({
      headless: 'shell',
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Disable sandbox
    });
  }

  private async _configPage(page: Page) {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (
        request.resourceType() === 'image' ||
        request.resourceType() === 'media' ||
        request.resourceType() === 'font'
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }
}
