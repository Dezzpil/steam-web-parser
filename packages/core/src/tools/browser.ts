import { launch, Browser, Page } from 'puppeteer';

export async function createBrowser() {
  const args = process.env.DOCKER_ENV ? ['--no-sandbox', '--disable-setuid-sandbox'] : [];
  const browser = await launch({
    args,
    headless: true,
    protocolTimeout: 60000,
  });

  // Create a page to set the language
  const page = await browser.newPage();
  await page.goto('https://store.steampowered.com/', {
    waitUntil: 'domcontentloaded',
  });

  // Get sessionId from cookies
  const targetOrigin = 'https://store.steampowered.com';
  const cookies = await page.cookies(targetOrigin);

  // Validate that the cookie comes from the expected Steam domain to reduce fixation risk
  const rawSessionCookie = cookies.find((cookie) => cookie.name === 'sessionid');
  const sessionIdCookie = cookies.find((cookie) => {
    if (cookie.name !== 'sessionid') return false;
    const domain = cookie.domain || '';
    const isValidDomain =
      domain === 'store.steampowered.com' ||
      domain === '.steampowered.com' ||
      domain.endsWith('.steampowered.com');

    return isValidDomain && cookie.secure;
  });
  const sessionId = sessionIdCookie?.value ?? '';
  if (!sessionId && rawSessionCookie) {
    console.warn(
      `Found sessionid cookie with unexpected attributes (domain="${rawSessionCookie.domain}", secure=${rawSessionCookie.secure}). Skipping language setting.`,
    );
  }
  if (sessionId) {
    const params = new URLSearchParams();
    params.set('language', 'russian');
    params.set('sessionid', sessionId);
    const formData = params.toString();
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
