import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { load } from 'cheerio';
import { TaskType } from '../tools/task';

export class CatalogGrabberInternal {
  private _parsed: Set<number>;
  private _pageHeight = 0;
  private _page: Page | undefined;
  private _sortBy: string;

  constructor(
    private _browser: Browser,
    parsed?: Set<number>,
    sortBy = 'Released_DESC',
  ) {
    this._parsed = parsed || new Set<number>();
    this._sortBy = sortBy;
  }

  private async _ensurePage() {
    if (!this._page) {
      this._page = await getNewBrowserPage(this._browser);
      await this._page.goto(
        'https://store.steampowered.com/search/?category1=998&ndl=1&ignore_preferences=1&sort_by=' +
          this._sortBy,
        { waitUntil: 'domcontentloaded' },
      );
    }
  }

  async grabUrls(): Promise<Array<TaskType>> {
    await this._ensurePage();
    await this._page!.waitForSelector('#search_result_container');
    await this._page!.waitForSelector('#search_resultsRows');
    const html = await this._page!.content();

    const urls: Array<TaskType> = [];
    const $ = load(html);
    $('#search_resultsRows')
      .find('a')
      .each((i, el) => {
        const href = el.attribs.href;
        const appId = href?.match(/app\/(\d+)\//)?.[1];
        if (appId && !this._parsed.has(+appId)) {
          urls.push({ href, appId: +appId, forMainLoop: true });
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
          const pageNewHeight = +(newHeight as unknown as string);
          if (this._pageHeight === pageNewHeight) {
            if (++repeat > this._maxScrollChecks) {
              clearInterval(st as any);
              resolve([]);
            }
          } else {
            clearInterval(st as any);
            this.grabUrls().then(resolve);
          }
        });
      }, 2000);
    });
  }
}
