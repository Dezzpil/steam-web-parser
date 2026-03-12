import EventEmitter from 'node:events';
import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { TaskType } from '../tools/task';
import { load } from 'cheerio';

export class SearchGrabber extends EventEmitter {
  constructor(private _browser: Browser) {
    super();
  }

  private _page: Page | undefined;

  async searchApps(term: string): Promise<TaskType[]> {
    const tasks: TaskType[] = [];
    this._page = this._page || (await getNewBrowserPage(this._browser));
    const url = `https://store.steampowered.com/search/?term=${encodeURIComponent(term)}`;
    await this._page.goto(url, { waitUntil: 'domcontentloaded' });

    try {
      await this._page.waitForSelector('#search_result_container');
      await this._page.waitForSelector('#search_resultsRows');
    } catch (e: any) {
      return tasks;
    }

    const html = await this._page.content();
    const $ = load(html);

    // TODO тут есть проблемы из-за которых может придти много лишнего:
    //  Baldur's Gate 3, Baldur's Gate 3 - Digital Deluxe Edition DLC, Baldur's Gate 3 Toolkit Data и т.д
    //  Поэтому берем только первый
    const a = $('#search_resultsRows').find('a').first();

    const href = a.attr('href');
    if (!href) return tasks;

    const appIdMatch = href.match(/app\/(\d+)\//);
    if (!appIdMatch) return tasks;

    // проверить, что названия игры похоже по первым буквам
    const title = a.find('span.title').text().trim();
    const titleMatch = title.toLowerCase().startsWith(term.toLowerCase().slice(0, 2));
    if (!titleMatch) return tasks;

    tasks.push({
      href,
      appId: +appIdMatch[1],
      title: title || undefined,
      forMainLoop: true,
    });
    return tasks;
  }

  async close() {
    if (this._page) {
      await this._page.close();
      this._page = undefined;
    }
  }
}
