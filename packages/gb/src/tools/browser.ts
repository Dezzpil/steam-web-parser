import { launch, Browser, Page } from 'puppeteer';

export async function createBrowser() {
  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 300000,
    timeout: 300000,
    slowMo: 500,
  });
  return browser;
}

export async function getNewBrowserPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (
      // request.resourceType() === 'image' ||
      // request.resourceType() === 'media' ||
      // request.resourceType() === 'font'
      request.resourceType() !== 'document' &&
      request.resourceType() !== 'script' &&
      request.resourceType() !== 'xhr' &&
      request.resourceType() !== 'fetch' &&
      request.resourceType() !== 'stylesheet'
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });
  return page;
}
