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
    const formData = `language=russian&sessionid=${sessionId}`;
    const result = await page.evaluate(async (formData) => {
      try {
        const response = await fetch('/account/setlanguage/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': formData.length + '',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            Accept: '*/*',
          },
          body: formData,
        });
        const text = await response.text();
        return { success: response.ok, error: response.statusText + '.' + text };
      } catch (error) {
        return { success: false, error: (error as any).message };
      }
    }, formData);
    console.log(`setting language result: ${JSON.stringify(result)}`);
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
