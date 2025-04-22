import puppeteer, { Browser, Page } from 'puppeteer';

export async function createBrowser() {
  return await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Disable sandbox
  });
}

export async function getNewBrowserPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
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
  return page;
}
