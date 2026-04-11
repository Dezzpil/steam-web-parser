import { createBrowser } from './tools/browser';
import { BaseCrawler } from './crawler/base';
import { createAppsUrls } from './tools/db';
import { TaskType } from './tools/task';
import { writeFileSync } from 'node:fs';
import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from './tools/browser';
import { load } from 'cheerio';

const QueueConcurrency = 3;

class CatalogGrabber {
  private _parsed: Set<number>;
  private _pageHeight = 0;
  private _page: Page | undefined;

  constructor(
    private _browser: Browser,
    parsed?: Set<number>,
  ) {
    this._parsed = parsed || new Set<number>();
  }

  private async _ensurePage() {
    if (!this._page) {
      this._page = await getNewBrowserPage(this._browser);
      await this._page.goto(
        'https://store.steampowered.com/search/?category1=998&ndl=1&ignore_preferences=1',
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

if (require.main === module) {
  const started = process.hrtime();

  (async () => {
    const browser = await createBrowser();
    process.on('exit', (code) => {
      browser.close().finally(() => process.exit(code));
    });

    const crawler = new BaseCrawler(browser);
    await crawler.init(QueueConcurrency);

    process.on('exit', () => {
      const ended = process.hrtime(started);
      writeFileSync('report.txt', JSON.stringify({ processed: crawler.processed, ended }));
    });

    // const orphanedAppsUrlsSet = new Set<number>();
    // const orphanedAppsUrls = await findNotGrabbedAppsUrls();
    // console.log(`orphaned url apps: ${orphanedAppsUrls.length}`);
    // for (const url of orphanedAppsUrls) {
    //   orphanedAppsUrlsSet.add(url.id);
    // }

    const catalogGrabber = new CatalogGrabber(browser);

    const grabAndFilter = async (scroll = false) => {
      const urls = scroll
        ? await catalogGrabber.scrollAndGrabUrlsAfter()
        : await catalogGrabber.grabUrls();
      const message = scroll
        ? `scrolled to next catalog items: ${urls.length}`
        : `initial catalog items: ${urls.length}`;
      console.log(message);
      // сохраняем только новые URL’ы (createMany skipDuplicates), вернётся только реально созданное
      const newUrls = await createAppsUrls(urls, null, true);
      return newUrls;
    };

    const scrollAndFindNewCatalog = async (): Promise<void> => {
      const newUrls = await grabAndFilter(true);
      if (newUrls.length) {
        await crawler.queue.push(newUrls);
        console.log(`added to queue: ${newUrls.length}`);
      } else {
        console.log('no more catalog items');
        await scrollAndFindNewCatalog();
      }
    };

    crawler.queue.drain(async () => {
      console.log('all tasks processed');
      // Продолжаем скроллить, пока появляются новые элементы
      await scrollAndFindNewCatalog();
    });

    // стартуем сбор данных о приложениях из каталога поиска
    const initial = await grabAndFilter(false);
    if (initial.length > 0) {
      await crawler.queue.push(initial);
      console.log(`added to queue from catalog: ${initial.length}`);
    } else {
      await scrollAndFindNewCatalog();
    }
  })();
}
