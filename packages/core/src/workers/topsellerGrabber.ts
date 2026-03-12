import EventEmitter from 'node:events';
import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { TaskType } from '../tools/task';
import { load } from 'cheerio';
import TagElement = cheerio.TagElement;
import { setInterval } from 'node:timers';

export class TopSellerGrabber extends EventEmitter {
  private _parsed: Set<number>;
  private _pageHeight = 0;

  constructor(private _browser: Browser, parsed?: Set<number>) {
    super();
    this._parsed = parsed || new Set<number>();
  }

  private _page: Page | undefined;

  async grabUrls() {
    if (!this._page) {
      this._page = await getNewBrowserPage(this._browser);
      await this._page.goto('https://store.steampowered.com/search/?filter=topsellers', {
        waitUntil: 'domcontentloaded',
      });
    }

    await this._page.waitForSelector('#search_result_container');
    await this._page.waitForSelector('#search_resultsRows');
    const html = await this._page.content();

    const urls: Array<TaskType> = [];
    const $ = load(html);
    $('#search_resultsRows')
      .find('a')
      .each((i, el) => {
        const href = (el as TagElement).attribs.href;
        const appId = href.match(/app\/(\d+)\//)?.[1];
        if (appId && !this._parsed.has(+appId)) {
          urls.push({ href, appId: +appId });
          this._parsed.add(+appId);
        }
      });
    return urls;
  }

  private _maxScrollChecks = 3;

  async scrollAndGrabUrlsAfter(): Promise<Array<TaskType>> {
    if (!this._page) throw new Error('page not initialized');

    this._pageHeight = +((await this._page.evaluate('document.body.scrollHeight')) as string);
    await this._page.evaluate('window.scrollTo(0, document.body.scrollHeight)');

    let repeat = 0;
    return new Promise((resolve) => {
      const st = setInterval(() => {
        this._page!.evaluate('document.body.scrollHeight').then((newHeight) => {
          const pageNewHeight = +(newHeight as string);
          if (this._pageHeight === pageNewHeight) {
            if (++repeat > this._maxScrollChecks) {
              clearInterval(st);
              resolve([]);
            }
          } else {
            clearInterval(st);
            this.grabUrls().then(resolve);
          }
        });
      }, 2000);
    });
  }
}
