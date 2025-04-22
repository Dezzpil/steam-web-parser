import EventEmitter from 'node:events';
import { Browser } from 'puppeteer';
import { getNewBrowserPage } from '../tools/page';
import { TaskType } from '../tools/task';
import { load } from 'cheerio';
import TagElement = cheerio.TagElement;

export class TopSellerGrabber extends EventEmitter {
  constructor(private browser: Browser) {
    super();
  }

  async grabAndParse() {
    const page = await getNewBrowserPage(this.browser);
    await page.goto('https://store.steampowered.com/search/?filter=topsellers', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('#search_result_container');
    await page.waitForSelector('#search_resultsRows');
    const html = await page.content();

    const urls: Array<TaskType> = [];
    const $ = load(html);
    $('#search_resultsRows')
      .find('a')
      .each((i, el) => {
        const href = (el as TagElement).attribs.href;
        const appId = href.match(/app\/(\d+)\//)?.[1];
        if (appId) urls.push({ href, appId: +appId });
      });
    return urls;
  }

  async scroll() {
    // TODO implement for new parse
  }
}
