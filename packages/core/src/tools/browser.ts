import { launch, Browser, Page } from 'puppeteer';

export async function createBrowser() {
  const browser = await launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 60000,
  });

  // Create a page to set the language
  const page = await browser.newPage();
  await page.goto('https://store.steampowered.com/', {
    waitUntil: 'domcontentloaded',
  });

  // Get sessionId from cookies
  const cookies = await page.cookies();
  const sessionIdCookie = cookies.find((cookie) => cookie.name === 'sessionid');
  const sessionId = sessionIdCookie ? sessionIdCookie.value : '';

  console.log(`sessionId: ${sessionId}`);

  if (sessionId) {
    // Make POST request to set language
    await page.evaluate(async (sid) => {
      try {
        const response = await fetch('/account/setlanguage/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionid: sid,
            language: 'russian',
          }),
        });
        return response.ok;
      } catch (error) {
        console.error('Error setting language:', error);
        return false;
      }
    }, sessionId);
  } else {
    console.warn('No sessionId found, skipping language setting');
  }

  // Close the temporary page
  await page.close();

  return browser;
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
